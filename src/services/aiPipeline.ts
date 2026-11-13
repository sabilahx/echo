// src/services/aiPipeline.ts
import type { 
  EmotionAnalysis, 
  EmotionCategory, 
  PipelineState, 
  AIMessage, 
  RecommendedVoice, 
  SpeechRecognitionResultPayload, 
  RehearsalScenario, 
  RehearsalMessage, 
  RehearsalFeedbackReport, 
  SayItBetterResult,
  CommunicationStyle,
  CoachingFeedback,
  ScenarioStage,
  RetryState,
  RehearsalTurnResult
} from './types.ts';
import { speechService } from './speechService.ts';
import { emotionEngine } from './emotionEngine.ts';
import { contextEngine } from './contextEngine.ts';
import { responseEngine } from './responseEngine.ts';
import { rehearsalEngine, REHEARSAL_SCENARIOS } from './rehearsalEngine.ts';
import { coachingEngine } from './coachingEngine.ts';

export type { 
  PipelineState, 
  EmotionAnalysis, 
  AIMessage, 
  EmotionCategory,
  RecommendedVoice,
  SpeechRecognitionResultPayload,
  RehearsalScenario,
  RehearsalMessage,
  RehearsalFeedbackReport,
  SayItBetterResult,
  CommunicationStyle,
  CoachingFeedback,
  ScenarioStage,
  RetryState,
  RehearsalTurnResult
};

export { REHEARSAL_SCENARIOS };

export const aiPipeline = {
  // 1. Speech-to-Text: Dual Engine (Deepgram en-IN + Native Web Speech API)
  transcribeSpokenAudio: async (
    audioBlob: Blob,
    interimText?: string
  ): Promise<SpeechRecognitionResultPayload> => {
    // Try Deepgram if API key exists and valid buffer was captured
    if (audioBlob && audioBlob.size > 200) {
      const dgResult = await speechService.transcribeWithDeepgram(audioBlob);
      if (dgResult && dgResult.transcript.trim()) {
        return dgResult;
      }
    }

    // Fall back to interim Web Speech API transcription
    if (interimText && interimText.trim()) {
      return {
        transcript: speechService.preservePunctuation(interimText),
        isFinal: true,
        confidence: 0.92,
        engine: 'webspeech',
        language: 'en-IN'
      };
    }

    // Empty speech detection
    if (!interimText && (!audioBlob || audioBlob.size === 0)) {
      throw new Error('No audible speech detected. Please speak closer to your microphone.');
    }

    return {
      transcript: speechService.preservePunctuation(interimText || ''),
      isFinal: true,
      confidence: 0.85,
      engine: 'webspeech',
      language: 'en-IN'
    };
  },

  // 2. Emotion Analysis Layer: 5 Core Canonical Categories (Happy, Sad, Angry, Anxious, Neutral)
  analyzeEmotion: async (userText: string): Promise<EmotionAnalysis> => {
    const contextSummary = contextEngine.getContextSummary();
    const rawAnalysis = await emotionEngine.analyze(userText, contextSummary);
    return rawAnalysis;
  },

  // 3. User Emotion Correction Handler
  correctEmotion: (current: EmotionAnalysis, newEmotion: EmotionCategory): EmotionAnalysis => {
    return emotionEngine.applyUserCorrection(current, newEmotion);
  },

  // 4. Empathetic Reasoning & Synthesis Layer (Companion Mode)
  generateEmpatheticResponse: async (
    userText: string,
    emotion: EmotionAnalysis
  ): Promise<{ text: string; offersExercise: boolean; reflectionQuestion?: string }> => {
    contextEngine.addTurn('user', userText, emotion.primaryEmotion);
    const result = await responseEngine.generateResponse(userText, emotion);
    contextEngine.addTurn('agent', result.text, emotion.primaryEmotion);

    const reflectionQuestion = coachingEngine.generateReflectionPrompt(contextEngine.getActiveTopic() || undefined);

    return {
      text: result.text,
      offersExercise: result.offersExercise,
      reflectionQuestion
    };
  },

  // 5. Conversation Rehearsal: Partner Simulation
  generateRehearsalPartnerResponse: async (
    scenario: RehearsalScenario,
    transcript: RehearsalMessage[],
    userLatestInput: string
  ): Promise<string> => {
    return rehearsalEngine.generatePartnerResponse(scenario, transcript, userLatestInput);
  },

  // 5b. Conversation Rehearsal: Turn-by-Turn Rehearsal (Character Reaction + Coach Feedback + Stage)
  generateRehearsalTurnResult: async (
    scenario: RehearsalScenario,
    transcript: RehearsalMessage[],
    userLatestInput: string
  ): Promise<RehearsalTurnResult> => {
    return rehearsalEngine.generateTurnResult(scenario, transcript, userLatestInput);
  },

  // 5c. Compare original and retried response
  compareRehearsalResponses: (
    original: string,
    revised: string,
    scenario: RehearsalScenario
  ): { original: string; revised: string; whatImproved: string } => {
    return rehearsalEngine.compareResponses(original, revised, scenario);
  },

  // 6. Conversation Rehearsal: Feedback Assessment Report
  generateRehearsalFeedback: async (
    scenario: RehearsalScenario,
    transcript: RehearsalMessage[]
  ): Promise<RehearsalFeedbackReport> => {
    return rehearsalEngine.generateFeedbackReport(scenario, transcript);
  },

  // 7. "Say It Better" Communication Reframing
  sayItBetter: async (text: string): Promise<SayItBetterResult> => {
    return coachingEngine.sayItBetter(text);
  },

  // 8. Text-To-Speech Playback
  speak: async (text: string, voiceSpec: RecommendedVoice, onEnd?: () => void): Promise<void> => {
    await speechService.speak(text, voiceSpec, onEnd);
  },

  stopSpeaking: (): void => {
    speechService.stopSpeaking();
  },

  // 9. Session Reset (In-Memory Privacy Preservation)
  resetSession: (): void => {
    contextEngine.resetSession();
    speechService.stopSpeaking();
  }
};

export const PRESET_EMOTION_SCENARIOS: import('./types.ts').PresetScenario[] = [
  { id: 'happy_project', label: 'Project Completed', preview: "I'm really happy today. I finally completed my project!", emotionPreview: 'Happy' },
  { id: 'sad_understood', label: 'Feeling Misunderstood', preview: "I feel like nobody understands me.", emotionPreview: 'Sad' },
  { id: 'frustrated_ignored', label: 'Feeling Unheard', preview: "I've explained this so many times, but nobody listens.", emotionPreview: 'Frustrated' },
  { id: 'confused_unclear', label: 'Uncertain Understanding', preview: "I don't understand.", emotionPreview: 'Confused' },
  { id: 'angry_boundary', label: 'Boundary Crossed', preview: "I'm fine, just leave me alone.", emotionPreview: 'Angry' },
  { id: 'anxious_workload', label: 'Work Overload', preview: "I have too much work and I can't manage everything.", emotionPreview: 'Anxious' },
  { id: 'neutral_fine', label: 'Balanced Check-in', preview: "I'm fine.", emotionPreview: 'Neutral' }
];
