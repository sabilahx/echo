// src/services/types.ts

// 1. Seven Core Canonical Emotion Categories
export type EmotionCategory = 
  | 'Happy'
  | 'Sad'
  | 'Angry'
  | 'Anxious'
  | 'Frustrated'
  | 'Confused'
  | 'Neutral';

export type ContextualSituation =
  | 'Friendship conflict'
  | 'Academic stress'
  | 'Disappointment'
  | 'Relationship misunderstanding'
  | 'Fear of failure'
  | 'Achievement and celebration'
  | 'General dialogue';

export type EIDimension = 
  | 'self-awareness' 
  | 'self-regulation' 
  | 'empathy' 
  | 'social-skills';

export type PipelineState = 
  | 'idle' 
  | 'listening' 
  | 'transcribing' 
  | 'understanding' 
  | 'analyzing_emotion' 
  | 'thinking' 
  | 'speaking';

export interface RecommendedVoice {
  tempo: string;
  tone: string;
  speechRate: number; // for WebSpeech API (0.8 - 1.2)
  speechPitch: number; // for WebSpeech API (0.8 - 1.2)
}

export interface EmotionAnalysis {
  primaryEmotion: EmotionCategory;
  alternativeEmotion: EmotionCategory;
  confidence: number; // 0.0 - 1.0
  confidencePercentage: string; // "88.0%"
  isLowConfidence: boolean;
  needsClarification: boolean;
  isAmbiguous?: boolean;
  contextualSituation?: ContextualSituation;
  emoji: string;
  intensity: number; // 0 - 100
  valence: 'positive' | 'neutral' | 'negative';
  linguisticCues: string[];
  explanation: string; // Strictly textual and semantic analysis — never claiming vocal pitch/facial tracking
  suggestedAction: string;
  eiDimension?: EIDimension;
  recommendedVoice: RecommendedVoice;
  dairMappingNote: string;
  isUserCorrected?: boolean;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  emotion?: EmotionAnalysis;
  groundingExerciseSuggested?: boolean;
  topic?: string;
  reflectionQuestion?: string;
  transcriptEdited?: boolean;
}

export interface PresetScenario {
  id: string;
  label: string;
  preview: string;
  emotionPreview: string;
}

// 2. Conversation Rehearsal Types

// Communication style classification for the user's messages
export type CommunicationStyle = 'aggressive' | 'passive' | 'assertive' | 'avoidant' | 'empathetic';

// Conversation progress state machine
export type ConversationProgressState = 
  | 'ACTIVE' 
  | 'NEEDS_CLARIFICATION' 
  | 'NEGOTIATING' 
  | 'PARTIALLY_RESOLVED' 
  | 'RESOLVED' 
  | 'ENDED_BY_USER' 
  | 'COMPLETED';

export interface ConversationStateTracker {
  progressState: ConversationProgressState;
  userIntent: string;
  proposedSolution?: string;
  acceptedProposals: string[];
  unresolvedIssues: string[];
  agreedNextStep?: string;
  isComplete: boolean;
  closureRecommendation?: string;
  closureGuidance?: string;
}

// Scenario stage progression tracking
export type ScenarioStage = 'opening' | 'developing' | 'climax' | 'resolution';

export interface RehearsalScenario {
  id: string;
  title: string;
  tagline: string;
  category: 'conflict' | 'work' | 'boundaries' | 'feedback' | 'personal';
  partnerName: string;
  partnerRole: string;
  partnerAttitude: string;
  situation: string;
  initialStatement: string;
  learningGoal: string;
}

// Per-turn coaching feedback from the ECHO Coach
export interface CoachingFeedback {
  skill: string;                        // e.g. "Boundary setting", "Empathetic listening"
  communicationStyle: CommunicationStyle;
  observation: string;                   // What the coach noticed
  whatWentWell?: string;                 // Positive reinforcement
  improvement?: string;                  // Specific suggestion
  betterResponse?: string;              // Model answer example
  coachingTip?: string;                 // Quick actionable tip
  shouldRetry: boolean;                 // Whether coach recommends retrying
}

// Retry state for the "Try Again" feature
export interface RetryState {
  turnIndex: number;
  originalMessage: string;
  isRetrying: boolean;
  revisedMessage?: string;
  comparison?: {
    original: string;
    revised: string;
    whatImproved: string;
  };
}

export interface RehearsalMessage {
  id: string;
  role: 'user' | 'partner' | 'coach';
  content: string;
  timestamp: string;
  coaching?: CoachingFeedback;           // Coach feedback attached to user messages
  isRetry?: boolean;                     // Whether this is a retried message
  retryOf?: string;                      // id of original message being retried
}

// Combined result from the rehearsal pipeline
export interface RehearsalTurnResult {
  characterResponse: string;
  coaching: CoachingFeedback;
  scenarioStage: ScenarioStage;
  conversationState: ConversationStateTracker;
}

export interface DimensionAssessment {
  score: number; // 0 - 100
  rationale: string;
  actionableTip: string;
}

export interface RehearsalFeedbackReport {
  scenarioId: string;
  scenarioTitle: string;
  completedAt: string;
  totalTurns: number;
  overallScore: number; // 0 - 100
  dimensions: {
    empathy: DimensionAssessment;
    clarity: DimensionAssessment;
    emotionalControl: DimensionAssessment;
    assertiveness: DimensionAssessment;
    respectfulCommunication: DimensionAssessment;
  };
  whatUserDidWell: string[];
  whatCouldBeImproved: string[];
  keyMoment: {
    originalResponse: string;
    improvedResponse: string;
    suggestedAlternativeSentence: string;
    explanation: string;
  };
  bestMoment?: { turnIndex: number; text: string; reason: string };
  worstMoment?: { turnIndex: number; text: string; reason: string };
  strongestSkill?: string;
  weakestSkill?: string;
  practicalTakeaway?: string;
  disclaimer: string;
}

// 3. Say It Better Feature Types
export type SayItBetterStyle = 'Professional' | 'Friendly' | 'Assertive';

export interface SayItBetterResult {
  originalText: string;
  professional: string;
  friendly: string;
  assertive: string;
  coreIntent: string;
}

// 4. Speech Recognition Payload
export interface SpeechRecognitionResultPayload {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  engine: 'deepgram' | 'webspeech' | 'manual';
  language: string;
}

export interface AudioCaptureError {
  code: 'PERMISSION_DENIED' | 'NOT_SUPPORTED' | 'EMPTY_AUDIO' | 'NETWORK_ERROR' | 'DEVICE_BUSY' | 'UNKNOWN';
  message: string;
}

// 5. Active Application View
export type AppViewMode = 'dashboard' | 'companion' | 'rehearsal' | 'rehearsal_active' | 'rehearsal_feedback' | 'say_it_better';
