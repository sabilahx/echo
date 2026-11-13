// src/services/responseEngine.ts
import type { EmotionAnalysis, EIDimension } from './types.ts';
import { contextEngine } from './contextEngine.ts';

export interface EmpatheticResponseResult {
  text: string;
  eiDimension: EIDimension;
  offersExercise: boolean;
  offersSayItBetter: boolean;
  followUpQuestion?: string;
}

export class ResponseEngine {
  private conflictTurnCount: number = 0;

  // 1. Generate Empathetic Response Orchestrator
  async generateResponse(
    userText: string,
    emotion: EmotionAnalysis
  ): Promise<EmpatheticResponseResult> {
    const text = userText.trim();
    const contextSummary = contextEngine.getContextSummary();
    const activeTopic = contextEngine.getActiveTopic();

    // Check if Groq API key is present
    const groqKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GROQ_API_KEY) || 
      (typeof process !== 'undefined' ? (process as any).env?.VITE_GROQ_API_KEY : undefined);

    if (groqKey && groqKey !== 'your_groq_api_key_here') {
      try {
        const groqResponse = await this.generateWithGroq(text, emotion, contextSummary, groqKey);
        if (groqResponse) return groqResponse;
      } catch (err: any) {
        console.warn(`[ECHO Companion: Live Groq API unreachable (${err?.message || 'Network error'}). Using on-device affective reasoning.]`);
      }
    }

    // High-EQ Deterministic Empathetic Synthesis Engine
    return this.synthesizeLocally(text, emotion, activeTopic);
  }

  // 2. Groq LLM Empathetic Reasoning Call
  private async generateWithGroq(
    userText: string,
    emotion: EmotionAnalysis,
    contextSummary: string,
    apiKey: string
  ): Promise<EmpatheticResponseResult | null> {
    const systemPrompt = `You are ECHO, an emotionally intelligent communication companion.
You operate across 4 core EI dimensions:
1. SELF-AWARENESS: Help the user name and reflect on feelings without judgment.
2. SELF-REGULATION: Suggest constructive pacing, somatic breathing, or chunking.
3. EMPATHY: Deeply validate their experience without toxic positivity or cliché phrases.
4. SOCIAL SKILLS: Constructive boundaries, assertive communication ("Say It Better").

CRITICAL RULES:
- Respond DIRECTLY to the meaning of what the user said.
- If the user proposes an action (e.g., "talk to the teacher"), evaluate and support that action.
- If the user expresses fear about family/parents, address that fear directly.
- If the user disagrees, explore their perspective respectfully.
- If the user is confused or says "I don't understand", explain in simple terms with NO motivational speeches. Ask one clear question.
- If the user is happy, celebrate naturally and do NOT suggest breathing/calming exercises.
- If the user is frustrated, acknowledge the feeling of not being heard and offer clear framing.
- NEVER echo the user's message back to them. NEVER say "I hear what you said: ... Let's look at what that means for our next step."
- Keep response concise: 2 to 3 natural conversational sentences.

Output valid JSON matching:
{
  "text": string,
  "eiDimension": "self-awareness" | "self-regulation" | "empathy" | "social-skills",
  "offersExercise": boolean,
  "offersSayItBetter": boolean,
  "followUpQuestion": string
}`;

    const userPrompt = `User said: "${userText}"
Detected Emotion: ${emotion.primaryEmotion} (${emotion.confidencePercentage})
Extracted Cues: ${emotion.linguisticCues.join(', ')}
Prior Conversation: ${contextSummary || 'Beginning of session'}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

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
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = await response.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');

    if (!parsed.text) return null;

    return {
      text: parsed.text,
      eiDimension: parsed.eiDimension || 'empathy',
      offersExercise: Boolean(parsed.offersExercise),
      offersSayItBetter: Boolean(parsed.offersSayItBetter),
      followUpQuestion: parsed.followUpQuestion
    };
  }

  // 3. High-EQ Semantic Contextual Dialogue Engine (Never echoes, never generic)
  private synthesizeLocally(
    userText: string,
    emotion: EmotionAnalysis,
    activeTopic: string | null
  ): EmpatheticResponseResult {
    const t = userText.toLowerCase().trim();
    const primary = emotion.primaryEmotion;

    // --- TOP LEVEL CONTEXTUAL & INTENT HANDLERS (Non-generic, High-EQ) ---

    // 1. Friendship conflict: Event Report ("My friend and I had a fight")
    if ((emotion.contextualSituation === 'Friendship conflict' && emotion.isAmbiguous) ||
        (/\b(my\s+friend\s+and\s+i\s+had\s+(a\s+)?fight|friend\s+and\s+i\s+had\s+(a\s+)?fight|had\s+(a\s+)?fight\s+with\s+my\s+friend|friend\s+and\s+i\s+fought)\b/i.test(t)) ||
        (t.includes('friend') && (t.includes('fight') || t.includes('fought')) && !t.includes('blamed'))) {
      const variants = [
        "I'm sorry that happened. Arguments with friends can be difficult. Do you feel hurt about what happened, or are you more frustrated about the disagreement?",
        "Navigating a clash with a close friend takes time to process. Have you had a chance to reflect on what triggered the disagreement, or does it still feel raw?",
        "When things get tense with someone close, it can leave you feeling unsettled. What part of the conversation is replaying most in your head?"
      ];
      const replyText = variants[this.conflictTurnCount % variants.length];
      this.conflictTurnCount++;
      return {
        text: replyText,
        eiDimension: 'self-awareness',
        offersExercise: false,
        offersSayItBetter: false,
        followUpQuestion: "Do you feel hurt about what happened, or are you more frustrated about the disagreement?"
      };
    }

    // 2. Follow-up / Direct Blame: "I'm angry because she blamed me"
    if ((t.includes('blamed me') || t.includes('unfairly blamed')) && (t.includes('angry') || t.includes('mad') || primary === 'Angry' || primary === 'Frustrated')) {
      return {
        text: "That sounds frustrating, especially if you feel unfairly blamed. Would you like to explain what happened, or would you rather work out how to respond to her?",
        eiDimension: 'social-skills',
        offersExercise: true,
        offersSayItBetter: true,
        followUpQuestion: "Would you like to explain what happened, or would you rather work out how to respond to her?"
      };
    }

    // 3. Academic Achievement: "I'm happy because I passed my exam"
    if (t.includes('passed my exam') || t.includes('passed the exam') || (primary === 'Happy' && t.includes('exam'))) {
      return {
        text: "Passing your exam after all the effort you put in is a fantastic accomplishment! Celebrating your hard work builds confidence for the next challenge. What part of the subject did you feel best about during the test?",
        eiDimension: 'self-awareness',
        offersExercise: false,
        offersSayItBetter: false,
        followUpQuestion: "What part of the subject did you feel best about during the test?"
      };
    }

    // 4. Unheard Anger: "I'm angry because nobody listens to me"
    if ((t.includes('angry') || primary === 'Angry') && (t.includes('nobody listens') || t.includes('no one listens'))) {
      return {
        text: "Having to repeat yourself while feeling ignored is infuriating. When people dismiss us, anger is our mind's way of signaling that our boundaries matter. Let's take a quick breath so we can turn that energy into a clear, direct boundary they can't overlook. What is the single most important point you need them to understand?",
        eiDimension: 'self-regulation',
        offersExercise: true,
        offersSayItBetter: true,
        followUpQuestion: "What is the single most important point you need them to understand?"
      };
    }

    // 5. Presentation Anxiety / Fear of failure: "I am worried about tomorrow's presentation"
    if (t.includes('presentation') || t.includes('tomorrow\'s presentation') || (t.includes('worried') && (t.includes('speech') || t.includes('interview')))) {
      return {
        text: "Anticipatory anxiety before a presentation is very real—your nervous system is spiking because you care about doing well. Let's take a slow breath to steady your body. Instead of worrying about the entire presentation right now, how about we focus on nailing just your opening 60 seconds?",
        eiDimension: 'self-regulation',
        offersExercise: true,
        offersSayItBetter: false,
        followUpQuestion: "What is the key takeaway you want your audience to remember?"
      };
    }

    // 6. Emotional Ambiguity: "I don't know how I feel"
    if (t.includes("don't know how i feel") || t.includes("dont know how i feel") || t.includes("not sure how i feel")) {
      return {
        text: "Not knowing how you feel is completely fine—emotions often arrive in tangled, messy waves. You don't need to put an instant label on it. If you take a gentle pause right now, where in your body do you notice the most tension—is it in your shoulders, chest, or throat?",
        eiDimension: 'self-awareness',
        offersExercise: true,
        offersSayItBetter: false,
        followUpQuestion: "Where in your body do you notice the most tension right now?"
      };
    }

    // 7. Goal Achievement: "I finally achieved my goal"
    if (t.includes('achieved my goal') || t.includes('achieved a goal') || (t.includes('goal') && (t.includes('finally') || t.includes('reached')))) {
      return {
        text: "Reaching a goal you've worked hard toward is a major milestone! Take a moment to genuinely acknowledge your persistence and resilience. What was the toughest hurdle you had to overcome to get here?",
        eiDimension: 'self-awareness',
        offersExercise: false,
        offersSayItBetter: false,
        followUpQuestion: "What was the toughest hurdle you had to overcome to get here?"
      };
    }

    // --- CASE 1: "I don't know what to do" (Paralysis / Indecision) ---
    if (t.includes("don't know what to do") || t.includes("dont know what to do") || t.includes("what should i do") || t.includes("feel stuck") || t.includes("no idea what to do")) {
      return {
        text: "Feeling stuck when you don't know the next step is completely normal. When we feel overwhelmed, trying to solve everything at once creates paralysis. You don't have to map out the whole journey today—what is just one small choice right in front of you?",
        eiDimension: 'self-regulation',
        offersExercise: true,
        offersSayItBetter: false,
        followUpQuestion: "What is the single thing causing you the most stress right now?"
      };
    }

    // --- CASE 2: Confusion / "I don't understand" ---
    if (t.includes("don't understand") || t.includes("dont understand") || t === "what?" || t === "huh?") {
      return {
        text: "Let me make that simpler: We are looking at what feels difficult or tense in your situation right now and finding a clear, calm way to handle it. What part feels most unclear to you?",
        eiDimension: 'empathy',
        offersExercise: false,
        offersSayItBetter: false,
        followUpQuestion: "What is the main thing you want clarified?"
      };
    }

    // --- CASE 3: "I think we should talk to the teacher" ---
    if (t.includes("talk to the teacher") || t.includes("speak with the teacher") || t.includes("tell the teacher") || t.includes("ask the teacher") || t.includes("talk to the professor")) {
      return {
        text: "Talking to the teacher directly is a proactive and constructive idea. Going in with documented notes and asking for feedback rather than arguing a grade usually gets the best response. Would you like to practice what you'll say before you approach them?",
        eiDimension: 'social-skills',
        offersExercise: false,
        offersSayItBetter: true,
        followUpQuestion: "What is the primary question or point you want to raise with them?"
      };
    }

    // --- CASE 4: "I'm scared my parents will find out" ---
    if (t.includes("parents will find out") || t.includes("scared my parents") || t.includes("trouble with my parents") || t.includes("family will find out") || t.includes("mom and dad")) {
      return {
        text: "The fear of your parents or family finding out can feel suffocating, because their judgment or disappointment matters deeply to you. Right now, that fear is making worst-case scenarios feel guaranteed. Let's take a slow breath together: what is the actual realistic consequence if they find out, and how can we navigate it calmly?",
        eiDimension: 'self-regulation',
        offersExercise: true,
        offersSayItBetter: false,
        followUpQuestion: "Is there someone safe you can confide in first?"
      };
    }

    // --- CASE 5: Disagreement / "I disagree with you" ---
    if (t.includes("i disagree") || t.includes("disagree with you") || t.includes("don't agree") || t.includes("dont agree") || t.includes("you're wrong") || t.includes("that's wrong")) {
      return {
        text: "I completely respect that you see this differently. Genuine dialogue only happens when we challenge each other honestly. Walk me through your perspective—what part of what I suggested doesn't align with your situation?",
        eiDimension: 'social-skills',
        offersExercise: false,
        offersSayItBetter: false,
        followUpQuestion: "How do you view the situation from your side?"
      };
    }

    // --- CASE 6: Repeated Venting / "I've tried explaining repeatedly, but nobody listens" ---
    if ((t.includes("repeatedly") || t.includes("so many times")) && (t.includes("nobody listens") || t.includes("no one listens"))) {
      return {
        text: "Having to explain yourself repeatedly only to feel ignored is deeply exhausting and frustrating. Your voice matters, and feeling unheard takes an emotional toll. Let's take a brief pause, then look at how we can express your boundary with crisp assertion so they cannot brush it aside.",
        eiDimension: 'social-skills',
        offersExercise: true,
        offersSayItBetter: true,
        followUpQuestion: "What is the core message they keep missing?"
      };
    }

    // --- CASE 7: Checking Listening / "OK, you are listening right? So what we have to do..." ---
    if (t.includes("you are listening") || t.includes("are you listening") || t.includes("what we have to do") || t.includes("the next step is")) {
      return {
        text: "I am listening closely with full attention. Go ahead and lay out your thoughts or the next steps you're considering, and we can talk through how to make it happen smoothly.",
        eiDimension: 'self-awareness',
        offersExercise: false,
        offersSayItBetter: false,
        followUpQuestion: "What is step one in your plan?"
      };
    }

    // --- Academic Evaluation Context Carryover ---
    if (activeTopic === 'academic evaluation' || t.includes('exam') || t.includes('fail')) {
      if (primary === 'Anxious' || t.includes('fail') || t.includes('scared')) {
        contextEngine.registerOpening('anticipating an exam');
        return {
          text: "Anticipating an exam can trigger an intense fear of failure, because you care deeply about doing well. That fear is your nervous system trying to protect you, but right now it is magnifying the pressure. Can we take one slow, steady breath together to center yourself before you review another page?",
          eiDimension: 'self-regulation',
          offersExercise: true,
          offersSayItBetter: false,
          followUpQuestion: "What is the single smallest, most manageable concept you could review next?"
        };
      }
    }

    // --- General Category-Specific Synthesis ---
    switch (primary) {
      case 'Happy': {
        const isProject = t.includes('project') || t.includes('completed') || t.includes('finished') || t.includes('finally');
        const text = isProject
          ? "Finishing a project you invested real effort into is a major accomplishment! Congratulations on seeing it through. Savor that feeling of completion—what part of the result are you proudest of?"
          : "That spark of genuine happiness is wonderful to see! Celebrating your wins reinforces your confidence and resilience. How does that positive momentum feel for you today?";
        return {
          text,
          eiDimension: 'self-awareness',
          offersExercise: false,
          offersSayItBetter: false,
          followUpQuestion: "What contributed most to this great outcome?"
        };
      }

      case 'Frustrated': {
        return {
          text: "Feeling stuck against a wall when you've been putting in genuine effort is deeply exhausting. When roadblocks keep appearing, frustration is an internal signal that something is unfair or broken. Let's take thirty seconds to breathe, then look at how to frame this concern assertively.",
          eiDimension: 'social-skills',
          offersExercise: true,
          offersSayItBetter: true,
          followUpQuestion: "What is the core issue that feels most out of your control right now?"
        };
      }

      case 'Sad': {
        const isLonely = t.includes('nobody understands') || t.includes('alone') || t.includes('lonely');
        const text = isLonely
          ? "Feeling like nobody understands you is a painful and isolating weight to carry. Your feelings are completely valid here, and you are being heard. What is something you wish people could truly see about what you're experiencing?"
          : "I hear the heaviness you are carrying, and it is completely okay to feel sad right now. You don't need to put on a brave face or rush to fix it immediately. I am listening—would it help to share what feels heaviest today?";
        return {
          text,
          eiDimension: 'empathy',
          offersExercise: false,
          offersSayItBetter: false,
          followUpQuestion: "What would feel most comforting for you right now?"
        };
      }

      case 'Angry': {
        return {
          text: "I hear that intensity, and your anger is valid. Anger is an internal alarm telling us a boundary was crossed or something felt unfair. Let's take a brief pause to steady your ground, so we can channel that energy into a clear, strong response.",
          eiDimension: 'self-regulation',
          offersExercise: true,
          offersSayItBetter: true,
          followUpQuestion: "What specific boundary or expectation was broken here?"
        };
      }

      case 'Anxious': {
        const isOverloaded = t.includes('too much') || t.includes('manage') || t.includes('workload');
        const text = isOverloaded
          ? "Carrying a massive pile of responsibilities when everything feels urgent is overwhelming. When we try to juggle everything at once, our cognitive load spikes. You don't have to carry the whole mountain right now. Can we pick just one small piece to look at together?"
          : "When anxiety hits, our mind races ahead into catastrophic 'what ifs' that haven't occurred. Let's anchor ourselves in the present room: you are safe here right now. A slow, steady exhale can help reset that alarm.";
        return {
          text,
          eiDimension: 'self-regulation',
          offersExercise: true,
          offersSayItBetter: false,
          followUpQuestion: "What is one grounded fact you know to be true right now?"
        };
      }

      case 'Neutral':
      default: {
        const cleanPunct = t.replace(/[.!?]/g, '').trim();
        if (cleanPunct === "i'm fine" || cleanPunct === "i am fine" || cleanPunct === "fine") {
          return {
            text: "Good to hear you're feeling balanced. If there's ever anything on your mind you want to practice or explore, I'm right here. How has the rest of your day been going?",
            eiDimension: 'self-awareness',
            offersExercise: false,
            offersSayItBetter: false
          };
        }

        if (t.includes('leave me alone')) {
          return {
            text: "I completely respect your space. When you need quiet or time to recharge, taking a step back is a healthy boundary. I'll be right here whenever you want to return.",
            eiDimension: 'self-awareness',
            offersExercise: false,
            offersSayItBetter: false
          };
        }

        return {
          text: "I'm listening with full attention. Whether you want to reflect on how you're feeling, practice an upcoming conversation, or work through a situation, I am here to help. What's on your mind?",
          eiDimension: 'self-awareness',
          offersExercise: false,
          offersSayItBetter: false
        };
      }
    }
  }
}

export const responseEngine = new ResponseEngine();
