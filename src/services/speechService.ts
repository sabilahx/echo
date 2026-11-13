// src/services/speechService.ts
import type { AudioCaptureError, RecommendedVoice, SpeechRecognitionResultPayload } from './types.ts';

// Speech recognition constructor interface for cross-browser Web Speech API
interface IWindowSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: { new (): IWindowSpeechRecognition };
    webkitSpeechRecognition?: { new (): IWindowSpeechRecognition };
  }
}

export class SpeechService {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private activeRecognition: IWindowSpeechRecognition | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private hasSpoken = false;
  private maxAudioVolume = 0;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  // 1. Microphone Hardware Permissions & Quality Setup
  async requestMicPermissions(): Promise<{ granted: boolean; error?: AudioCaptureError }> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        granted: false,
        error: {
          code: 'NOT_SUPPORTED',
          message: 'Audio recording is not supported in this browser environment.'
        }
      };
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000
        }
      });
      return { granted: true };
    } catch (err: any) {
      let code: AudioCaptureError['code'] = 'UNKNOWN';
      let message = 'Could not access microphone.';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        code = 'PERMISSION_DENIED';
        message = 'Microphone permission was denied. Please allow microphone access in your browser.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        code = 'NOT_SUPPORTED';
        message = 'No microphone device was found on your system.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        code = 'DEVICE_BUSY';
        message = 'Microphone is currently in use by another application.';
      }

      return { granted: false, error: { code, message } };
    }
  }

  // 2. Select optimal audio MIME type supported by browser
  private getBestMimeType(): string {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav'
    ];
    if (typeof MediaRecorder !== 'undefined') {
      for (const mime of candidates) {
        if (MediaRecorder.isTypeSupported(mime)) {
          return mime;
        }
      }
    }
    return 'audio/webm';
  }

  // 3. Start Recording with Voice Activity Detection (VAD) & Live Interim Speech Hook
  async startRecording(
    onInterimTranscript?: (text: string) => void,
    onSilenceAutoStop?: () => void
  ): Promise<void> {
    this.stopSpeaking(); // Cancel any existing speech output immediately
    this.audioChunks = [];
    this.hasSpoken = false;
    this.maxAudioVolume = 0;

    // Check / obtain stream
    if (!this.mediaStream || !this.mediaStream.active) {
      const perm = await this.requestMicPermissions();
      if (!perm.granted) {
        throw new Error(perm.error?.message || 'Microphone access failed.');
      }
    }

    const stream = this.mediaStream!;
    const mimeType = this.getBestMimeType();

    // Setup MediaRecorder
    try {
      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      this.mediaRecorder.start(200); // 200ms time slice
    } catch (e) {
      console.warn('Failed to start MediaRecorder with mimeType:', mimeType, e);
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) this.audioChunks.push(event.data);
      };
      this.mediaRecorder.start(200);
    }

    // Setup AudioContext for Volume & Silence Detection (VAD)
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        const source = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.3;
        source.connect(this.analyser);

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkAudioEnergy = () => {
          if (!this.analyser || this.mediaRecorder?.state !== 'recording') return;

          this.analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          if (average > this.maxAudioVolume) {
            this.maxAudioVolume = average;
          }

          // Voice Activity Detection threshold
          if (average > 14) {
            this.hasSpoken = true;
            if (this.silenceTimer) {
              clearTimeout(this.silenceTimer);
              this.silenceTimer = null;
            }
          } else if (this.hasSpoken && average <= 10) {
            // User spoke earlier and is now silent for 2.2 seconds -> trigger auto-stop
            if (!this.silenceTimer) {
              this.silenceTimer = setTimeout(() => {
                if (this.mediaRecorder?.state === 'recording') {
                  if (onSilenceAutoStop) onSilenceAutoStop();
                }
              }, 2200);
            }
          }

          requestAnimationFrame(checkAudioEnergy);
        };

        checkAudioEnergy();
      }
    } catch (err) {
      console.warn('VAD AudioContext initialization warning:', err);
    }

    // Simultaneously start browser SpeechRecognition for immediate interim feedback & fallback
    this.startBrowserRecognition(onInterimTranscript);
  }

  // 4. Client-side SpeechRecognition (Web Speech API) supporting English (India)
  private startBrowserRecognition(onInterim?: (text: string) => void) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      this.activeRecognition = new SpeechRec();
      this.activeRecognition.continuous = false;
      this.activeRecognition.interimResults = true;
      this.activeRecognition.maxAlternatives = 1;
      // Configure Indian English locale default
      this.activeRecognition.lang = 'en-IN';

      this.activeRecognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            final += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }

        const currentText = (final || interim).trim();
        if (currentText && onInterim) {
          this.hasSpoken = true;
          onInterim(this.preservePunctuation(currentText));
        }
      };

      this.activeRecognition.onerror = (e: any) => {
        console.warn('Web Speech API event error (will rely on Deepgram if configured):', e?.error);
      };

      this.activeRecognition.start();
    } catch (e) {
      console.warn('Could not launch Web Speech API recognition:', e);
    }
  }

  // 5. Stop Recording and return finalized Audio Blob
  stopRecording(): Promise<{ audioBlob: Blob; emptyAudio: boolean; peakVolume: number }> {
    return new Promise((resolve) => {
      // Abort / stop Web Speech
      if (this.activeRecognition) {
        try {
          this.activeRecognition.stop();
        } catch (_) {}
      }

      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }

      // Close AudioContext
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close().catch(() => {});
        this.audioContext = null;
        this.analyser = null;
      }

      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        const dummyBlob = new Blob([], { type: 'audio/webm' });
        resolve({ audioBlob: dummyBlob, emptyAudio: true, peakVolume: 0 });
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        const isEmpty = !this.hasSpoken && this.maxAudioVolume < 8;
        resolve({
          audioBlob,
          emptyAudio: isEmpty,
          peakVolume: this.maxAudioVolume
        });
      };

      this.mediaRecorder.stop();
    });
  }

  // 6. Deepgram Cloud Speech Recognition with Indian English (en-IN) preference
  async transcribeWithDeepgram(audioBlob: Blob): Promise<SpeechRecognitionResultPayload | null> {
    const apiKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEEPGRAM_API_KEY) || 
      (typeof process !== 'undefined' ? process.env?.VITE_DEEPGRAM_API_KEY : undefined);
    if (!apiKey || apiKey === 'your_deepgram_api_key_here' || audioBlob.size === 0) {
      return null;
    }

    try {
      // Documentation-compatible Deepgram Nova-2 request
      // We explicitly pass language=en-IN for Indian English accent optimization
      const endpoint = new URL('https://api.deepgram.com/v1/listen');
      endpoint.searchParams.set('model', 'nova-2');
      endpoint.searchParams.set('language', 'en-IN');
      endpoint.searchParams.set('smart_format', 'true');
      endpoint.searchParams.set('punctuate', 'true');
      endpoint.searchParams.set('filler_words', 'false');

      const response = await fetch(endpoint.toString(), {
        method: 'POST',
        headers: {
          Authorization: `Token ${apiKey}`,
          'Content-Type': audioBlob.type || 'audio/webm'
        },
        body: audioBlob
      });

      if (!response.ok) {
        throw new Error(`Deepgram API returned HTTP ${response.status}`);
      }

      const json = await response.json();
      const channel = json?.results?.channels?.[0];
      const primaryAlt = channel?.alternatives?.[0];
      const transcript = (primaryAlt?.transcript || '').trim();
      const confidence = primaryAlt?.confidence ?? 0.85;

      if (!transcript) {
        return null;
      }

      return {
        transcript: this.preservePunctuation(transcript),
        isFinal: true,
        confidence,
        engine: 'deepgram',
        language: 'en-IN'
      };
    } catch (error) {
      console.warn('Deepgram STT failed; falling back to client engine:', error);
      return null;
    }
  }

  // 7. Preserves punctuation, Indian English idioms, contractions, and sentence capitalization
  preservePunctuation(rawText: string): string {
    if (!rawText) return '';
    let text = rawText.trim();

    // Standardize spacing around contractions
    text = text.replace(/\b(i)\s+('m|m)\b/gi, "I'm");
    text = text.replace(/\b(can)\s*('t|t)\b/gi, "can't");
    text = text.replace(/\b(don)\s*('t|t)\b/gi, "don't");
    text = text.replace(/\b(won)\s*('t|t)\b/gi, "won't");
    text = text.replace(/\b(it)\s*('s|s)\b/gi, "it's");
    text = text.replace(/\b(i)\s+(have)\b/gi, "I have");
    text = text.replace(/\b(i)\s+(feel|am|was|will)\b/gi, (_match, _p1, p2) => `I ${p2}`);

    // Capitalize first character
    if (text.length > 0) {
      text = text.charAt(0).toUpperCase() + text.slice(1);
    }

    // Ensure ending punctuation if reasonable length and none exists
    if (text.length > 3 && !/[.!?]$/.test(text)) {
      text += '.';
    }

    return text;
  }

  // 8. Text-To-Speech with Indian English voice preference, rate/pitch modulation, and stop control
  async speak(text: string, voiceSpec: RecommendedVoice, onEnd?: () => void): Promise<void> {
    this.stopSpeaking(); // Cancel any existing speech

    if (!text || !text.trim()) {
      if (onEnd) onEnd();
      return;
    }

    // Clean text for speech (expand abbreviations, remove markdown symbols)
    const sanitizedText = text
      .replace(/[*_#`~]+/g, '')
      .replace(/•\s*/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();

    // Cartesia TTS Check
    const cartesiaKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CARTESIA_API_KEY) || 
      (typeof process !== 'undefined' ? process.env?.VITE_CARTESIA_API_KEY : undefined);
    if (cartesiaKey && cartesiaKey !== 'your_cartesia_api_key_here' && typeof Audio !== 'undefined') {
      try {
        const response = await fetch('https://api.cartesia.ai/tts/bytes', {
          method: 'POST',
          headers: {
            'X-API-Key': cartesiaKey,
            'Cartesia-Version': '2024-06-10',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model_id: 'sonic-english',
            transcript: sanitizedText,
            voice: {
              mode: 'id',
              id: 'a0e99841-438c-4a64-b679-ae501e7d6091' // Calm, empathetic warm voice
            },
            output_format: {
              container: 'mp3',
              sample_rate: 44100
            }
          })
        });

        if (response.ok) {
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            if (onEnd) onEnd();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            this.speakWithBrowser(sanitizedText, voiceSpec, onEnd);
          };
          await audio.play();
          return;
        }
      } catch (err) {
        console.warn('Cartesia TTS error, falling back to Web SpeechSynthesis:', err);
      }
    }

    // Fallback: Web SpeechSynthesis
    this.speakWithBrowser(sanitizedText, voiceSpec, onEnd);
  }

  private speakWithBrowser(text: string, voiceSpec: RecommendedVoice, onEnd?: () => void): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;

    // Set voice properties
    utterance.rate = voiceSpec.speechRate || 0.95;
    utterance.pitch = voiceSpec.speechPitch || 1.0;

    // Pick optimal voice: prioritize Indian English or high quality neural voices
    const voices = window.speechSynthesis.getVoices();
    const indianVoice = voices.find(v => 
      v.lang === 'en-IN' || 
      v.name.includes('India') || 
      v.name.includes('Heera') || 
      v.name.includes('Ravi')
    );
    const naturalVoice = voices.find(v => 
      v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))
    );
    const fallbackVoice = voices.find(v => v.lang.startsWith('en'));

    if (indianVoice) {
      utterance.voice = indianVoice;
      utterance.lang = 'en-IN';
    } else if (naturalVoice) {
      utterance.voice = naturalVoice;
    } else if (fallbackVoice) {
      utterance.voice = fallbackVoice;
    }

    utterance.onend = () => {
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  }

  // 9. Stop speech synthesis immediately
  stopSpeaking(): void {
    if (this.currentUtterance && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
  }

  // 10. Release audio streams on unmount / cleanup
  cleanup(): void {
    this.stopSpeaking();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.activeRecognition) {
      try {
        this.activeRecognition.abort();
      } catch (_) {}
      this.activeRecognition = null;
    }
  }
}

export const speechService = new SpeechService();
