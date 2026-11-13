// src/services/contextEngine.ts
import type { EmotionCategory, ContextualSituation } from './types.ts';

export interface TurnContext {
  id: string;
  role: 'user' | 'agent';
  text: string;
  emotion?: EmotionCategory;
  topic?: string;
  situation?: ContextualSituation;
  timestamp: number;
}

export interface ContextualAnalysisResult {
  situation: ContextualSituation;
  cues: string[];
  isEventOnly: boolean;
  explicitEmotionFound?: EmotionCategory;
  contextualNote: string;
}

export class ContextEngine {
  private history: TurnContext[] = [];
  private activeTopic: string | null = null;
  private recentQuestionsAsked: Set<string> = new Set();
  private recentOpeningsUsed: Set<string> = new Set();

  // 1. Add turn to conversational memory
  addTurn(role: 'user' | 'agent', text: string, emotion?: EmotionCategory): TurnContext {
    const topic = role === 'user' ? this.extractOrResolveTopic(text) : undefined;
    if (topic) {
      this.activeTopic = topic;
    }

    const turn: TurnContext = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
      role,
      text,
      emotion,
      topic: topic || this.activeTopic || undefined,
      timestamp: Date.now()
    };

    this.history.push(turn);
    // Keep last 12 turns in active rolling context for memory efficiency
    if (this.history.length > 12) {
      this.history.shift();
    }

    return turn;
  }

  // 2. Extract or Resolve Topic across turns (handles anaphora & pronoun resolution)
  extractOrResolveTopic(currentText: string): string | null {
    const t = currentText.toLowerCase();

    // Direct topic detection rules
    if (/\b(exam|test|midterm|finals|quiz|paper|submission|assignment)\b/.test(t)) {
      return 'academic evaluation';
    }
    if (/\b(interview|job|promotion|work|career|boss|manager|client|presentation)\b/.test(t)) {
      return 'professional career';
    }
    if (/\b(project|code|build|app|deadline|launch)\b/.test(t)) {
      return 'project milestone';
    }
    if (/\b(relationship|friend|boyfriend|girlfriend|partner|parents|family|argument)\b/.test(t)) {
      return 'interpersonal relationship';
    }
    if (/\b(future|life|direction|purpose|decision)\b/.test(t)) {
      return 'future trajectory';
    }

    // Contextual Anaphora Resolution: "I'm scared I'll fail", "how do I prepare for it?"
    if (/\b(fail|failing|pass|it|this|them|mess up|screw up)\b/.test(t) && this.activeTopic) {
      return this.activeTopic;
    }

    return null;
  }

  // 3. Dedicated Contextual Situation Interpreter (Distinguishes topic from emotional state)
  identifyContextualSituation(text: string): ContextualAnalysisResult {
    const t = text.toLowerCase().trim();
    const cues: string[] = [];

    // Check for explicit emotion markers in sentence
    let explicitEmotionFound: EmotionCategory | undefined;
    if (/\b(i'?m\s+happy|feeling\s+happy|so\s+glad|thrilled|proud)\b/i.test(t)) {
      explicitEmotionFound = 'Happy';
    } else if (/\b(i'?m\s+sad|feeling\s+sad|heartbroken|depressed|unhappy)\b/i.test(t)) {
      explicitEmotionFound = 'Sad';
    } else if (/\b(i'?m\s+angry|feeling\s+angry|so\s+mad|furious|livid)\b/i.test(t)) {
      explicitEmotionFound = 'Angry';
    } else if (/\b(i'?m\s+worried|worried\s+about|anxious|scared|nervous|panicking)\b/i.test(t)) {
      explicitEmotionFound = 'Anxious';
    } else if (/\b(i'?m\s+frustrated|frustrating|fed\s+up|annoyed|nobody\s+listens)\b/i.test(t)) {
      explicitEmotionFound = 'Frustrated';
    } else if (/\b(don't\s+understand|confused|unclear|don't\s+know\s+how\s+i\s+feel)\b/i.test(t)) {
      explicitEmotionFound = 'Confused';
    } else if (/^\s*(i'?m\s+)?fine[.!?,]?\s*$/i.test(t)) {
      explicitEmotionFound = 'Neutral';
    }

    // 1. Friendship conflict
    const hasFriendToken = /\b(friend|best\s+friend|roommate|pal|buddy)\b/i.test(t);
    const hasConflictToken = /\b(fight|fought|had\s+(a\s+)?fight|argument|argued|disagreement|stopped\s+talking|falling\s+out|fell\s+out|mad\s+at\s+me|blamed\s+me|upset\s+with\s+me)\b/i.test(t);
    if ((hasFriendToken && hasConflictToken) || /\b(had\s+(a\s+)?fight|my\s+friend\s+and\s+i\s+had\s+(a\s+)?fight|friend\s+and\s+i\s+fought)\b/i.test(t)) {
      if (hasFriendToken) cues.push('friend');
      if (hasConflictToken) cues.push('had fight');
      if (t.includes('blamed me')) cues.push('blamed me');
      return {
        situation: 'Friendship conflict',
        cues,
        isEventOnly: !explicitEmotionFound,
        explicitEmotionFound,
        contextualNote: 'Interpersonal conflict with friend'
      };
    }

    // 2. Achievement and celebration
    if (/\b(passed\s+my\s+exam|passed\s+the\s+exam|achieved\s+my\s+goal|reached\s+my\s+goal|got\s+the\s+job|got\s+the\s+promotion|won\s+the|finally\s+achieved|finished\s+the\s+project|milestone)\b/i.test(t)) {
      if (t.includes('exam')) cues.push('passed exam');
      if (t.includes('goal')) cues.push('achieved goal');
      if (t.includes('finally')) cues.push('finally');
      return {
        situation: 'Achievement and celebration',
        cues,
        isEventOnly: false,
        explicitEmotionFound: explicitEmotionFound || 'Happy',
        contextualNote: 'Accomplishment milestone celebration'
      };
    }

    // 3. Fear of failure / performance anxiety
    if (/\b(worried\s+about\s+tomorrow'?s\s+presentation|presentation\s+tomorrow|speech\s+tomorrow|fear\s+of\s+failing|scared\s+i'?ll\s+fail|afraid\s+to\s+fail|mess\s+up|nervous\s+about\s+the\s+interview)\b/i.test(t)) {
      if (t.includes('presentation')) cues.push('presentation');
      if (t.includes('worried')) cues.push('worried');
      if (t.includes('fail')) cues.push('fear of failure');
      return {
        situation: 'Fear of failure',
        cues,
        isEventOnly: false,
        explicitEmotionFound: explicitEmotionFound || 'Anxious',
        contextualNote: 'Anticipatory performance apprehension'
      };
    }

    // 4. Academic stress
    if (/\b(exam|test|midterm|finals|quiz|paper|submission|thesis|assignment|grading|gpa)\b/i.test(t)) {
      cues.push('academic evaluation');
      return {
        situation: 'Academic stress',
        cues,
        isEventOnly: !explicitEmotionFound,
        explicitEmotionFound,
        contextualNote: 'Academic evaluation pressure'
      };
    }

    // 5. Disappointment
    if (/\b(disappointed|disappointment|let\s+down|cancelled|rejected|didn't\s+get|was\s+hoping|plans\s+fell\s+through)\b/i.test(t)) {
      cues.push('disappointment');
      return {
        situation: 'Disappointment',
        cues,
        isEventOnly: !explicitEmotionFound,
        explicitEmotionFound,
        contextualNote: 'Unmet expectations or setback'
      };
    }

    // 6. Relationship misunderstanding
    if (/\b(misunderstanding|misunderstood|took\s+it\s+the\s+wrong\s+way|talking\s+past\s+each\s+other|mixed\s+signals|twisted\s+my\s+words)\b/i.test(t)) {
      cues.push('misunderstanding');
      return {
        situation: 'Relationship misunderstanding',
        cues,
        isEventOnly: !explicitEmotionFound,
        explicitEmotionFound,
        contextualNote: 'Communication breakdown or misinterpretation'
      };
    }

    // 7. General dialogue
    return {
      situation: 'General dialogue',
      cues: explicitEmotionFound ? [explicitEmotionFound.toLowerCase()] : [],
      isEventOnly: false,
      explicitEmotionFound,
      contextualNote: 'General dialogue and inquiry'
    };
  }

  // 4. Get Context Summary for LLM / Reasoner prompt
  getContextSummary(): string {
    if (this.history.length === 0) return '';

    const recent = this.history.slice(-4);
    const summaryLines = recent.map(r => `${r.role === 'user' ? 'User' : 'ECHO'}: "${r.text}"`);
    if (this.activeTopic) {
      summaryLines.push(`[Active Shared Topic: ${this.activeTopic}]`);
    }
    return summaryLines.join(' | ');
  }

  // 4. Resolve Context-Aware Emotion Interpretation
  resolveContextualCue(text: string, rawEmotion: EmotionCategory): {
    resolvedEmotion: EmotionCategory;
    contextualNote?: string;
  } {
    const t = text.toLowerCase();
    
    // Exam Context: "I'm scared I'll fail" when topic is exam -> Anxious performance fear
    if (this.activeTopic === 'academic evaluation') {
      if (t.includes('fail') || t.includes('scared') || rawEmotion === 'Anxious') {
        return {
          resolvedEmotion: 'Anxious',
          contextualNote: 'Anticipatory performance anxiety linked to upcoming exam'
        };
      }
      if (t.includes('manage') || t.includes('too much') || t.includes('overwhelm')) {
        return {
          resolvedEmotion: 'Anxious',
          contextualNote: 'Academic preparation overload'
        };
      }
    }

    // Work / Project Context
    if (this.activeTopic === 'project milestone' || this.activeTopic === 'professional career') {
      if (t.includes('finished') || t.includes('completed') || rawEmotion === 'Happy') {
        return {
          resolvedEmotion: 'Happy',
          contextualNote: 'Accomplishment breakthrough on professional project'
        };
      }
    }

    return { resolvedEmotion: rawEmotion };
  }

  // 5. Repetition Prevention: registers and checks recent phrase patterns
  isRepetitiveOpening(opening: string): boolean {
    return this.recentOpeningsUsed.has(opening.toLowerCase().trim());
  }

  registerOpening(opening: string): void {
    this.recentOpeningsUsed.add(opening.toLowerCase().trim());
    if (this.recentOpeningsUsed.size > 8) {
      const first = this.recentOpeningsUsed.values().next().value;
      if (first) this.recentOpeningsUsed.delete(first);
    }
  }

  registerQuestion(question: string): void {
    this.recentQuestionsAsked.add(question.toLowerCase().trim());
    if (this.recentQuestionsAsked.size > 6) {
      const first = this.recentQuestionsAsked.values().next().value;
      if (first) this.recentQuestionsAsked.delete(first);
    }
  }

  hasQuestionBeenAsked(question: string): boolean {
    return this.recentQuestionsAsked.has(question.toLowerCase().trim());
  }

  // 6. Reset Session (privacy preservation: no permanent storage)
  resetSession(): void {
    this.history = [];
    this.activeTopic = null;
    this.recentQuestionsAsked.clear();
    this.recentOpeningsUsed.clear();
  }

  getActiveTopic(): string | null {
    return this.activeTopic;
  }

  getTurnCount(): number {
    return this.history.length;
  }
}

export const contextEngine = new ContextEngine();

