// src/services/coachingEngine.ts
import type { SayItBetterResult } from './types.ts';

export class CoachingEngine {
  // 1. "Say It Better" Communication Reframing Engine (Professional, Friendly, Assertive)
  async sayItBetter(rawText: string): Promise<SayItBetterResult> {
    const text = (rawText || '').trim();
    if (!text) {
      return {
        originalText: '',
        professional: '',
        friendly: '',
        assertive: '',
        coreIntent: 'Empty input'
      };
    }

    const groqKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GROQ_API_KEY) || 
      (typeof process !== 'undefined' ? (process as any).env?.VITE_GROQ_API_KEY : undefined);

    if (groqKey && groqKey !== 'your_groq_api_key_here') {
      try {
        const groqResult = await this.sayItBetterWithGroq(text, groqKey);
        if (groqResult) return groqResult;
      } catch (err) {
        console.warn('Groq Say It Better generation failed; using deterministic rule engine:', err);
      }
    }

    return this.sayItBetterLocally(text);
  }

  // 2. Groq LLM Reframing Call
  private async sayItBetterWithGroq(text: string, apiKey: string): Promise<SayItBetterResult | null> {
    const systemPrompt = `You are the "Say It Better" communication coach for ECHO.
Your job is to rewrite raw, frustrated, anxious, or unpolished sentences into 3 constructive communication styles:
1. Professional: Diplomatic, structured, objective, focused on solutions and shared goals.
2. Friendly: Warm, collaborative, empathetic, gentle, preserving rapport.
3. Assertive: Clear, direct, holding firm boundaries, confident without aggression or over-apologizing.

Output strictly valid JSON:
{
  "professional": string,
  "friendly": string,
  "assertive": string,
  "coreIntent": string
}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Rewrite this sentence:\n"${text}"` }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');

    if (!parsed.professional || !parsed.friendly || !parsed.assertive) return null;

    return {
      originalText: text,
      professional: parsed.professional,
      friendly: parsed.friendly,
      assertive: parsed.assertive,
      coreIntent: parsed.coreIntent || 'Expressing perspective constructively'
    };
  }

  // 3. Deterministic Reframing Fallback (Offline & Immediate)
  private sayItBetterLocally(text: string): SayItBetterResult {
    const lower = text.toLowerCase();

    // Work / deadline / delay
    if (lower.includes('late') || lower.includes('deadline') || lower.includes('hurry') || lower.includes('waiting')) {
      return {
        originalText: text,
        professional: "Could you provide an update on the current timeline? Having visibility into the delivery schedule will help us coordinate next steps effectively.",
        friendly: "Hey! Just wanted to gently check in on where we stand with this. Let me know if there's anything I can help with to wrap it up!",
        assertive: "I need this finalized by end of day to proceed with my deliverables. Please confirm when the completed version will be ready.",
        coreIntent: "Requesting a clear milestone timeline and accountability"
      };
    }

    // Boundary / Leave me alone / Busy
    if (lower.includes('leave me alone') || lower.includes('stop bothering') || lower.includes('busy') || lower.includes("don't have time")) {
      return {
        originalText: text,
        professional: "I am currently at full capacity with existing commitments and unable to take on additional items right now. I will reconnect when bandwidth opens up.",
        friendly: "I'd love to connect soon, but I really need to focus on getting through some urgent tasks today. Can we circle back later in the week?",
        assertive: "I am not available to discuss this right now. I need uninterrupted focus for the rest of the day, so let's pause here.",
        coreIntent: "Setting an explicit, guilt-free personal boundary"
      };
    }

    // Unfair / Frustrated / Blame / Chronic Disappointment
    if (lower.includes('unfair') || lower.includes('fault') || lower.includes('angry') || lower.includes('ridiculous') || lower.includes('never listen') || lower.includes('sick and tired') || lower.includes('never do') || lower.includes('dealing with you')) {
      return {
        originalText: text,
        professional: "I have concerns regarding task accountability and workload balance. I would appreciate the opportunity to review project responsibilities together to establish an equitable path forward.",
        friendly: "Hey, I'm feeling a bit overwhelmed by how the tasks are currently landing. Could we chat about how to support each other and balance things out more smoothly?",
        assertive: "The current distribution of work is unsustainable for me. I need you to take full ownership of your assigned responsibilities so we can meet our commitments.",
        coreIntent: "Addressing chronic imbalance or unreliability without resorting to personal attacks"
      };
    }

    // General default transformation
    return {
      originalText: text,
      professional: `I wanted to communicate my perspective clearly: ${text.replace(/you always|you never/gi, 'I noticed that')}. Moving forward, I would like to establish a collaborative approach.`,
      friendly: `Hey, I wanted to share what's been on my mind: ${text}. I value our communication and would love to hear your thoughts on this!`,
      assertive: `I want to be upfront about this: ${text}. It is important to me that we address this directly and find a clear resolution.`,
      coreIntent: "Expressing thoughts with clarity and composure"
    };
  }

  // 4. Compare Responses for Retry Feedback
  compareResponses(original: string, revised: string): { original: string; revised: string; whatImproved: string } {
    const origLower = (original || '').toLowerCase();
    const revLower = (revised || '').toLowerCase();

    let whatImproved = "Your second attempt shows greater conversational awareness and emotional regulation.";

    const origAggressive = /\b(you always|you never|idiot|stupid|shut up|hate|ridiculous|jerk)\b/i.test(origLower);
    const revAggressive = /\b(you always|you never|idiot|stupid|shut up|hate|ridiculous|jerk)\b/i.test(revLower);

    const origPassive = /\b(fine whatever|fine just do it|i guess you can|whatever you want)\b/i.test(origLower);
    const revAssertive = /\b(cannot|can't|my boundary|i need|not able to|not comfortable)\b/i.test(revLower);

    if (origAggressive && !revAggressive) {
      whatImproved = "You eliminated hostile accusatory language, focusing on the boundary rather than attacking the person.";
    } else if (origPassive && revAssertive) {
      whatImproved = "You replaced reluctant surrender with a firm, respectful boundary statement.";
    } else if (revLower.includes('understand') || revLower.includes('hear you') || revLower.includes('appreciate')) {
      whatImproved = "You introduced empathetic validation before holding your ground, significantly reducing defensiveness.";
    }

    return {
      original,
      revised,
      whatImproved
    };
  }

  // 5. Post-Conversation Reflection Prompts
  generateReflectionPrompt(contextTopic?: string): string {
    const prompts = [
      "What did you notice about your internal emotional state when the other person pushed back?",
      "If you were to practice this conversation again, what is one sentence you would refine?",
      "What core boundary or need felt most important for you to uphold during this dialogue?",
      "Where did you feel tension in your body, and how did your breathing shift during difficult turns?",
      "How well did you balance listening with standing your ground?"
    ];

    if (contextTopic === 'academic evaluation') {
      return "How confident did you feel presenting your evidence, and what would help you feel more grounded next time?";
    }
    if (contextTopic === 'conflict') {
      return "Did you feel the impulse to get defensive, and what helped you keep the conversation constructive?";
    }

    return prompts[Math.floor(Math.random() * prompts.length)];
  }
}

export const coachingEngine = new CoachingEngine();
