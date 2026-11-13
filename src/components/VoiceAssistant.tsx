// src/components/VoiceAssistant.tsx
import React, { useState, useEffect } from 'react';
import type { AIMessage, PipelineState, EmotionAnalysis, EmotionCategory, PresetScenario } from '../services/types.ts';
import { aiPipeline } from '../services/aiPipeline.ts';
import { speechService } from '../services/speechService.ts';
import { EmotionalVisualizer } from './EmotionalVisualizer.tsx';
import { PipelineStatus } from './PipelineStatus.tsx';
import { MessageList } from './MessageList.tsx';
import { InputController } from './InputController.tsx';
import { ShieldCheck, RotateCcw, AlertCircle, Edit3, Wind } from 'lucide-react';
import './VoiceAssistant.css';

export const VoiceAssistant: React.FC = () => {
  const [state, setState] = useState<PipelineState>('idle');
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'welcome_1',
      role: 'agent',
      content: "Hello! I am ECHO, your Emotional Intelligence Companion. How are you feeling today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionAnalysis | undefined>();
  const [groundingActive, setGroundingActive] = useState<boolean>(false);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [pendingTranscript, setPendingTranscript] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isEditingEmotion, setIsEditingEmotion] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      speechService.cleanup();
    };
  }, []);

  const processPipeline = async (userText: string) => {
    const cleanText = userText.trim();
    if (!cleanText) return;

    try {
      setErrorMessage(null);
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const userMsgId = Date.now().toString();

      // 1. Add user message
      const initialUserMsg: AIMessage = {
        id: userMsgId,
        role: 'user',
        content: cleanText,
        timestamp: now
      };
      setMessages(prev => [...prev, initialUserMsg]);

      // 2. Understanding Context & Intent
      setState('understanding');
      await new Promise(r => setTimeout(r, 200));

      // 3. Analyzing Emotional Cues
      setState('analyzing_emotion');
      const emotionAnalysis = await aiPipeline.analyzeEmotion(cleanText);
      setCurrentEmotion(emotionAnalysis);

      // Attach detected emotion to user message
      setMessages(prev => 
        prev.map(msg => msg.id === userMsgId ? { ...msg, emotion: emotionAnalysis } : msg)
      );

      // 4. Empathetic Reasoning & Synthesis Layer
      setState('thinking');
      const llmResponse = await aiPipeline.generateEmpatheticResponse(cleanText, emotionAnalysis);

      // 5. Speaking with Attuned Voice
      setState('speaking');
      setIsSpeaking(true);

      const agentMsg: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: llmResponse.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        emotion: emotionAnalysis,
        groundingExerciseSuggested: llmResponse.offersExercise
      };
      setMessages(prev => [...prev, agentMsg]);

      await aiPipeline.speak(llmResponse.text, emotionAnalysis.recommendedVoice, () => {
        setIsSpeaking(false);
      });

    } catch (error: any) {
      console.error("ECHO Pipeline error:", error);
      setErrorMessage(error?.message || "An error occurred while processing the conversation.");
    } finally {
      setState('idle');
      setIsSpeaking(false);
    }
  };

  const handleStartListening = async () => {
    setErrorMessage(null);
    setInterimTranscript('');
    setPendingTranscript('');

    try {
      setState('listening');
      await speechService.startRecording(
        (interimText: string) => {
          setInterimTranscript(interimText);
        },
        () => handleStopListening()
      );
    } catch (err: any) {
      console.error("Microphone capture error:", err);
      let friendlyError = "Unable to access microphone. Please check permissions.";
      if (err.name === 'NotAllowedError') {
        friendlyError = "Microphone permission was denied. Please allow microphone access in your browser.";
      } else if (err.name === 'NotFoundError') {
        friendlyError = "No audio input device detected. Please connect a microphone.";
      }
      setErrorMessage(friendlyError);
      setState('idle');
    }
  };

  const handleStopListening = async () => {
    if (state === 'listening') {
      setState('transcribing');
      try {
        const { audioBlob, emptyAudio } = await speechService.stopRecording();
        const currentInterim = interimTranscript;

        if (emptyAudio && !currentInterim) {
          setErrorMessage("No audible speech detected. Please speak closer to your microphone.");
          setState('idle');
          return;
        }

        const result = await aiPipeline.transcribeSpokenAudio(audioBlob, currentInterim);
        const transcript = result.transcript.trim();

        if (!transcript) {
          setErrorMessage("No audible speech detected. Please speak closer to your microphone.");
          setState('idle');
          return;
        }

        setPendingTranscript(transcript);
        setState('idle');
      } catch (transcriptionError: any) {
        console.error("Transcription error:", transcriptionError);
        setErrorMessage(transcriptionError?.message || "Transcription failed.");
        setState('idle');
      }
    }
  };

  const handleConfirmTranscript = async (editedText: string) => {
    setPendingTranscript('');
    setInterimTranscript('');
    await processPipeline(editedText);
  };

  const handleCancelTranscript = () => {
    setPendingTranscript('');
    setInterimTranscript('');
    setState('idle');
  };

  const handleCustomTextInput = async (text: string) => {
    if (state !== 'idle') return;
    await processPipeline(text);
  };

  const handleSelectScenario = async (scenario: PresetScenario) => {
    if (state !== 'idle') return;
    setPendingTranscript('');
    await processPipeline(scenario.preview);
  };

  const handleCorrectEmotion = (messageId: string, correctedCategory: EmotionCategory) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && msg.emotion) {
        const updated = aiPipeline.correctEmotion(msg.emotion, correctedCategory);
        setCurrentEmotion(updated);
        return { ...msg, emotion: updated };
      }
      return msg;
    }));
    setIsEditingEmotion(false);
  };

  const handleDirectEmotionCorrection = (category: EmotionCategory) => {
    if (!currentEmotion) return;
    const updated = aiPipeline.correctEmotion(currentEmotion, category);
    setCurrentEmotion(updated);
    setIsEditingEmotion(false);
  };

  const handleSpeakMessage = async (text: string, voiceSpec?: any) => {
    if (isSpeaking) {
      speechService.stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    const spec = voiceSpec || (currentEmotion ? currentEmotion.recommendedVoice : {
      speechRate: 1.0,
      speechPitch: 1.0,
      tempo: '1.0x',
      tone: 'Clear'
    });

    await aiPipeline.speak(text, spec, () => {
      setIsSpeaking(false);
    });
  };

  const handleStopSpeech = () => {
    speechService.stopSpeaking();
    setIsSpeaking(false);
  };

  const handleResetSession = () => {
    aiPipeline.resetSession();
    setMessages([
      {
        id: 'welcome_reset',
        role: 'agent',
        content: "Session memory reset. What would you like to talk about?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setCurrentEmotion(undefined);
    setGroundingActive(false);
    setInterimTranscript('');
    setPendingTranscript('');
    setErrorMessage(null);
    setState('idle');
    setIsSpeaking(false);
  };

  const allEmotionCategories: EmotionCategory[] = [
    'Happy', 'Sad', 'Angry', 'Anxious', 'Frustrated', 'Confused', 'Neutral'
  ];

  return (
    <div className="companion-screen">
      {/* Top Banner / Pipeline Status */}
      <div className="companion-header">
        <div className="companion-title-group">
          <h2>Emotion Companion</h2>
          <p className="companion-subtitle">Attuned voice dialogue with real-time emotional intelligence</p>
        </div>

        <div className="companion-header-actions">
          <button 
            type="button" 
            className="action-pill-btn" 
            onClick={handleResetSession}
            title="Reset conversation memory"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
          <div className="status-pill">
            <span className={`status-dot ${state !== 'idle' ? 'active' : ''}`} />
            <span>{state === 'idle' ? 'Attuned' : state.replace('_', ' ').toUpperCase()}</span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="companion-error-banner">
          <AlertCircle size={15} />
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage(null)}>Dismiss</button>
        </div>
      )}

      {/* 2-Column Responsive Layout */}
      <div className="companion-layout-grid">
        {/* LEFT COLUMN: Conversation & Controls */}
        <div className="companion-left-column">
          <div className="conversation-thread-panel glass-panel">
            <PipelineStatus state={state} />

            <MessageList 
              messages={messages} 
              isThinking={['understanding', 'analyzing_emotion', 'thinking', 'speaking'].includes(state)} 
              onTriggerGrounding={() => setGroundingActive(true)}
              onCorrectEmotion={handleCorrectEmotion}
              onSpeakMessage={handleSpeakMessage}
              onStopSpeech={handleStopSpeech}
              isSpeaking={isSpeaking}
            />

            <InputController 
              state={state} 
              onStartListening={handleStartListening} 
              onStopListening={handleStopListening}
              onSubmitText={handleCustomTextInput}
              interimTranscript={interimTranscript}
              pendingTranscript={pendingTranscript}
              onConfirmTranscript={handleConfirmTranscript}
              onCancelTranscript={handleCancelTranscript}
              onSelectScenario={handleSelectScenario}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Dedicated Emotion Insight Panel */}
        <div className="companion-right-column">
          <div className="emotion-insight-card glass-panel">
            <div className="card-top-header">
              <div className="header-meta-row">
                <span className="card-eyebrow">Real-Time EQ Analysis</span>
                {currentEmotion?.contextualSituation && (
                  <span className="context-pill">{currentEmotion.contextualSituation}</span>
                )}
              </div>
              <h3 className="card-title">Emotion Insight</h3>
            </div>

            {currentEmotion ? (
              <div className="insight-content">
                {/* 1. Detected Emotion & Confidence */}
                <div className="detected-emotion-banner">
                  <div className="emotion-pill-main">
                    <span className="emotion-name">
                      {currentEmotion.isAmbiguous ? 'Inquiring Emotion' : currentEmotion.primaryEmotion}
                    </span>
                  </div>
                  <span className={`confidence-badge ${currentEmotion.isAmbiguous ? 'ambiguous-badge' : ''}`}>
                    {currentEmotion.confidencePercentage}
                  </span>
                </div>

                {/* 2. Linguistic Cues */}
                <div className="insight-section">
                  <span className="section-label">Linguistic Cues:</span>
                  <div className="cues-chips-row">
                    {currentEmotion.linguisticCues.length > 0 ? (
                      currentEmotion.linguisticCues.map((cue, idx) => (
                        <span key={idx} className="cue-chip">"{cue}"</span>
                      ))
                    ) : (
                      <span className="cue-chip-empty">Sentence context</span>
                    )}
                  </div>
                </div>

                {/* 3. Short Explanation */}
                <div className="insight-section">
                  <span className="section-label">Interpretation:</span>
                  <p className="insight-explanation">{currentEmotion.explanation}</p>
                </div>

                {/* 4. Suggested EI Action */}
                <div className="insight-section">
                  <span className="section-label">Suggested EI Action:</span>
                  <div className="suggested-action-box">
                    <p className="action-text">{currentEmotion.suggestedAction}</p>
                    {currentEmotion.eiDimension && (
                      <span className="ei-dimension-tag">
                        Focus: {currentEmotion.eiDimension.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {/* 5. Emotion Correction Option */}
                <div className="correction-row">
                  {!isEditingEmotion ? (
                    <button 
                      type="button" 
                      className="edit-emotion-btn"
                      onClick={() => setIsEditingEmotion(true)}
                    >
                      <Edit3 size={12} />
                      <span>Not accurate? Change emotion</span>
                    </button>
                  ) : (
                    <div className="inline-correction-dropdown">
                      <span className="dropdown-label">Select matching emotion:</span>
                      <div className="category-chips-grid">
                        {allEmotionCategories.map(cat => (
                          <button
                            key={cat}
                            type="button"
                            className={`category-pill ${currentEmotion.primaryEmotion === cat ? 'active' : ''}`}
                            onClick={() => handleDirectEmotionCorrection(cat)}
                          >
                            <span className="cat-dot" />
                            <span>{cat}</span>
                          </button>
                        ))}
                      </div>
                      <button 
                        type="button" 
                        className="cancel-correction-btn"
                        onClick={() => setIsEditingEmotion(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* 6. Optional Self-Regulation Grounding Tool */}
                {(currentEmotion.primaryEmotion === 'Anxious' || currentEmotion.primaryEmotion === 'Frustrated' || groundingActive) && (
                  <div className="grounding-tool-container">
                    <div className="grounding-tool-header">
                      <Wind size={14} className="wind-icon" />
                      <span>4-4-4-4 Box Breathing</span>
                    </div>
                    <EmotionalVisualizer 
                      state={state}
                      currentEmotion={currentEmotion}
                      groundingActive={true}
                      onToggleGrounding={() => setGroundingActive(!groundingActive)}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="insight-placeholder">
                <p className="placeholder-text">
                  Speak or type a message to see detected emotional cues, confidence metrics, and EI suggestions here.
                </p>
                <div className="placeholder-hint">
                  <ShieldCheck size={14} />
                  <span>Text-only syntactic analysis • Zero acoustic overreach</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
