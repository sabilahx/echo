// src/services/rehearsalEngine.ts
import type { 
  RehearsalScenario, 
  RehearsalMessage, 
  RehearsalFeedbackReport, 
  CommunicationStyle, 
  CoachingFeedback, 
  ScenarioStage, 
  RehearsalTurnResult,
  ConversationProgressState,
  ConversationStateTracker
} from './types.ts';

// 1. Seven Benchmark Real-Life Rehearsal Scenarios
export const REHEARSAL_SCENARIOS: RehearsalScenario[] = [
  {
    id: 'friend_disagreement',
    title: 'Resolving a Disagreement with a Friend',
    tagline: 'De-escalate tension and address broken trust without attacking the friendship.',
    category: 'conflict',
    partnerName: 'Alex',
    partnerRole: 'Close Friend',
    partnerAttitude: 'Defensive, guarded, but values the friendship deep down.',
    situation: "Alex borrowed your car/laptop and returned it with damage, then brushed it off as 'not a big deal' when you brought it up.",
    initialStatement: "Look, I don't see why you're making such a massive deal out of this. Accidents happen, and we've been friends for five years. Why are you acting like I did it on purpose?",
    learningGoal: 'Express how their dismissive attitude made you feel, establish clear accountability, and resolve the friction without escalating into a fight.'
  },
  {
    id: 'expressing_disappointment',
    title: 'Expressing Disappointment',
    tagline: 'Communicate unmet expectations clearly without passive-aggressive blaming.',
    category: 'personal',
    partnerName: 'Taylor',
    partnerRole: 'Project Co-lead / Peer',
    partnerAttitude: 'Preoccupied with excuses, quick to minimize impact on others.',
    situation: "Taylor promised to complete their half of an important client presentation by Friday afternoon, but didn't deliver or communicate until Sunday night.",
    initialStatement: "Hey, sorry I went quiet this weekend. Things got completely out of hand with my family. I figured you'd just handle whatever was left anyway.",
    learningGoal: 'Articulate the tangible impact of their silence, state your disappointment calmly, and set a firm expectation for future commitments.'
  },
  {
    id: 'handling_criticism',
    title: 'Handling Criticism with Composure',
    tagline: 'Receive sharp critique professionally without collapsing or becoming hostile.',
    category: 'work',
    partnerName: 'Jordan',
    partnerRole: 'Demanding Team Lead',
    partnerAttitude: 'Direct, results-oriented, skeptical of excuses, respects composed confidence.',
    situation: "Jordan just reviewed your quarterly proposal in front of the team and called it 'unprepared and lacking real depth.'",
    initialStatement: "I'll be honest with you: this proposal is nowhere near ready for leadership. It feels rushed, the data isn't verified, and I expected much higher quality from you.",
    learningGoal: 'Acknowledge valid points, clarify the feedback without getting defensive or shutting down, and propose a concrete revision path.'
  },
  {
    id: 'speaking_with_teacher',
    title: 'Speaking Confidently with a Teacher',
    tagline: 'Advocate for your academic work respectfully and persuasively.',
    category: 'personal',
    partnerName: 'Prof. Sharma',
    partnerRole: 'Senior Academic Instructor',
    partnerAttitude: 'Firm, time-pressed, skeptical of complaints, but respects evidence and courteous logic.',
    situation: "You received a lower grade on an essay because the rubric penalised a topic that you had previously received written approval to cover.",
    initialStatement: "I have office hours for only ten minutes. I've already posted the rubric guidelines on the portal, and I grade everyone by the exact same standards.",
    learningGoal: 'State your case with documented evidence, maintain academic courtesy, and invite an objective review of the specific criteria.'
  },
  {
    id: 'setting_boundaries',
    title: 'Setting Personal Boundaries',
    tagline: 'Say a clear, guilt-free NO to persistent pressure or boundary crossing.',
    category: 'boundaries',
    partnerName: 'Morgan',
    partnerRole: 'Acquaintance / Friend',
    partnerAttitude: 'Persistent, pushy, uses guilt-tripping to get their way.',
    situation: "Morgan is asking to crash on your couch for a week right in the middle of your most demanding work sprint.",
    initialStatement: "Hey! My landlord is doing renovations this week and I really need a place to crash. Can I stay on your couch for a few days? You have plenty of room!",
    learningGoal: 'Deliver a clear, definitive boundary without over-apologizing or leaving room for pushy negotiations.'
  },
  {
    id: 'giving_constructive_feedback',
    title: 'Giving Constructive Feedback',
    tagline: 'Address recurring coworker mistakes directly without provoking resentment.',
    category: 'work',
    partnerName: 'Sam',
    partnerRole: 'Team Coworker',
    partnerAttitude: 'Sensitive to criticism, prone to feeling singled out or defensive.',
    situation: "Sam frequently misses handoff deadlines on shared tasks, forcing you to rush at the eleventh hour to cover for them.",
    initialStatement: "Are you checking up on my status again? I told you I'll finish my part as soon as I can. You don't have to micromanage me.",
    learningGoal: 'Focus on objective workflow impact, avoid personal attacks, and agree on a concrete milestone checkpoint.'
  },
  {
    id: 'handling_stressful_conversation',
    title: 'Handling a Stressful High-Stakes Conversation',
    tagline: 'De-escalate panic and establish calm, structured alignment under pressure.',
    category: 'conflict',
    partnerName: 'Chris',
    partnerRole: 'Panicked Team Member',
    partnerAttitude: 'High anxiety, catastrophic thinking, feels everything is spiraling out of control.',
    situation: "A major release demo is in two hours and an unexpected bug appeared. Chris is spiraling and ready to pull the plug entirely.",
    initialStatement: "Everything is ruined! The staging build is broken, the client is going to cancel the contract, and we're all going to take the blame for this disaster!",
    learningGoal: 'Validate the urgency without catching their panic, break the problem into sequential steps, and re-establish productive focus.'
  }
];

export type UserSemanticIntent = 
  | 'PAY_IN_FULL'
  | 'SPLIT_EXPENSES'
  | 'PAYMENT_PLAN'
  | 'GET_ESTIMATE_FIRST'
  | 'EMOTIONAL_IMPACT'
  | 'DISENGAGE_PAUSE'
  | 'AGGRESSIVE_ATTACK'
  | 'PASSIVE_SURRENDER'
  | 'BOUNDARY_REFUSAL'
  | 'CONFUSED_OR_HESITANT'
  | 'ACADEMIC_EVIDENCE'
  | 'DISAGREEMENT'
  | 'LISTENING_CHECK'
  | 'PROPOSAL_OR_STEP'
  | 'AGREEMENT_CONFIRMATION'
  | 'GENERAL_COMMUNICATION';

export class RehearsalEngine {
  // =========================================================================
  // 1. SEMANTIC INTENT & PROPOSAL EXTRACTION
  // =========================================================================
  detectUserSemanticIntent(input: string, _scenario: RehearsalScenario): UserSemanticIntent {
    const text = (input || '').toLowerCase().trim();
    if (!text) return 'CONFUSED_OR_HESITANT';

    // 1. Specific Proposal: Pay in full for car / damage
    if (/\b(pay for (my |the )?(car|laptop|damage|repair)|you (should|must|have to) pay|agreeing on paying|cover the (damage|repair|cost|bill)|you pay for it|take care of the bill)\b/i.test(text)) {
      return 'PAY_IN_FULL';
    }

    // 2. Specific Proposal: Split expenses 50/50
    if (/\b(split (the |our )?(expenses|cost|repair|bill)|50\/50|half and half|share the (cost|repair|expenses)|each pay half)\b/i.test(text)) {
      return 'SPLIT_EXPENSES';
    }

    // 3. Specific Proposal: Payment plan / installments
    if (/\b(half now (and|&) half next|pay in installments|pay (it )?over time|monthly payments|split across two months|pay half now)\b/i.test(text)) {
      return 'PAYMENT_PLAN';
    }

    // 4. Specific Proposal: Get estimate / quote first
    if (/\b(wait until (we|i) (get|receive) the (repair )?estimate|get (a |an )?(quote|estimate) first|review the estimate|mechanic (quote|estimate))\b/i.test(text)) {
      return 'GET_ESTIMATE_FIRST';
    }

    // 5. Emotional impact / Distress acknowledgment
    if (/\b(how much trouble this caused|understand how much trouble|stranded|inconvenience|caused me a lot of|disruption|hurt my feelings|really disappointed)\b/i.test(text)) {
      return 'EMOTIONAL_IMPACT';
    }

    // 6. Disengage / Pause discussion
    if (/\b(forget it|don't want to discuss|dont want to discuss|stop discussing|not discussing|drop (this|it)|talk about this later|leave it alone)\b/i.test(text)) {
      return 'DISENGAGE_PAUSE';
    }

    // 7. Aggressive hostility
    if (/\b(completely irresponsible|irresponsible and|hate dealing with you|idiot|stupid|jerk|shut up|hate you|screw you|moron|crazy|insane|you always|you never|selfish|so selfish)\b/i.test(text)) {
      return 'AGGRESSIVE_ATTACK';
    }

    // 8. Passive concession
    if (/\b(fine whatever|fine just do it|i guess you can|whatever you want|if you really have to|my fault anyway|sorry sorry)\b/i.test(text)) {
      return 'PASSIVE_SURRENDER';
    }

    // 9. Clear Boundary Refusal (e.g. Morgan couch request)
    if (/\b(cannot let you|can't let you|cannot host|can't host|not able to host|not possible|not going to happen|my boundary is)\b/i.test(text) ||
        /^(no|nope|nah)\b/i.test(text)) {
      return 'BOUNDARY_REFUSAL';
    }

    // 10. Agreement confirmation / Closure acceptance
    if (/\b(agreed|deal|sounds good|sounds fair|that works|let's do that|i agree|perfect)\b/i.test(text)) {
      return 'AGREEMENT_CONFIRMATION';
    }

    // 11. Academic evidence submission (Sharma essay)
    if (/\b(rubric|section 3|on page|email approval|comparative data|regression|this is the place|notes and the rubric|approved rubric)\b/i.test(text)) {
      return 'ACADEMIC_EVIDENCE';
    }

    // 12. Confusion or hesitation
    if (/\b(i don't know|dont know|not sure|what should i do|what am i supposed to do|don't know what to do|don't understand|dont understand)\b/i.test(text)) {
      return 'CONFUSED_OR_HESITANT';
    }

    // 13. Explicit disagreement
    if (/\b(i disagree|disagree with you|don't agree|dont agree|you're wrong|see it differently)\b/i.test(text)) {
      return 'DISAGREEMENT';
    }

    // 14. Listening check
    if (/\b(are you listening|you are listening|can you hear|listen to me|are you paying attention)\b/i.test(text)) {
      return 'LISTENING_CHECK';
    }

    // 15. General step or proposal
    if (/\b(what we have to do|next step|we should|how about|what if|let's do|my plan is|proposal)\b/i.test(text)) {
      return 'PROPOSAL_OR_STEP';
    }

    return 'GENERAL_COMMUNICATION';
  }

  // =========================================================================
  // 2. COMMUNICATION STYLE CLASSIFICATION ENGINE
  // =========================================================================
  classifyCommunicationStyle(input: string, scenario?: RehearsalScenario): CommunicationStyle {
    const text = (input || '').toLowerCase().trim();
    if (!text) return 'avoidant';

    const intent = this.detectUserSemanticIntent(input, scenario || REHEARSAL_SCENARIOS[0]);

    if (intent === 'AGGRESSIVE_ATTACK') return 'aggressive';
    if (intent === 'PASSIVE_SURRENDER') return 'passive';
    if (intent === 'CONFUSED_OR_HESITANT' || intent === 'DISENGAGE_PAUSE') return 'avoidant';

    // Empathetic markers
    const hasEmpathy = /\b(i understand|i hear you|i see where you're coming from|perspective|must be stressful|value our friendship)\b/i.test(text);
    if (hasEmpathy) return 'empathetic';

    return 'assertive';
  }

  // =========================================================================
  // 3. CONVERSATION STATE MACHINE & INTELLIGENT CLOSURE TRACKER
  // =========================================================================
  evaluateConversationProgress(
    scenario: RehearsalScenario,
    transcript: RehearsalMessage[],
    intent: UserSemanticIntent,
    userMessage: string,
    characterReply: string
  ): ConversationStateTracker {
    const userTurns = transcript.filter(m => m.role === 'user').length + 1;
    const lowerUser = userMessage.toLowerCase();
    const lowerReply = characterReply.toLowerCase();

    const acceptedProposals: string[] = [];
    const unresolvedIssues: string[] = [];
    let progressState: ConversationProgressState = 'ACTIVE';
    let isComplete = false;
    let closureRecommendation: string | undefined;

    // --- SCENARIO 1: Alex (friend_disagreement) ---
    if (scenario.id === 'friend_disagreement') {
      if (intent === 'PAY_IN_FULL' || intent === 'SPLIT_EXPENSES' || intent === 'PAYMENT_PLAN' || intent === 'GET_ESTIMATE_FIRST') {
        acceptedProposals.push(
          intent === 'PAY_IN_FULL' ? "Alex takes responsibility for repair costs" :
          intent === 'SPLIT_EXPENSES' ? "50/50 split of repair costs" :
          intent === 'PAYMENT_PLAN' ? "Two-month installment payment" :
          "Wait for repair estimate first"
        );
        unresolvedIssues.push("Obtain official repair estimate/quote");

        if (userTurns >= 3 || lowerReply.includes('agreed') || lowerReply.includes('fair')) {
          progressState = 'RESOLVED';
          isComplete = true;
          closureRecommendation = "Good work! You communicated a practical solution, acknowledged the situation and reached a mutual understanding. You demonstrated Assertiveness, Problem-solving, and Respectful communication. You've reached a reasonable conclusion. This conversation can end here.";
        } else {
          progressState = 'PARTIALLY_RESOLVED';
          closureRecommendation = "Good progress. You've agreed on the core resolution approach (payment / repair estimate), even though the final estimate remains to be reviewed.";
        }
      } else if (intent === 'AGREEMENT_CONFIRMATION') {
        acceptedProposals.push("Mutual resolution confirmed");
        progressState = 'RESOLVED';
        isComplete = true;
        closureRecommendation = "Good work! You communicated a practical solution, acknowledged the situation and reached a mutual understanding. You demonstrated Assertiveness, Problem-solving, and Respectful communication. You've reached a reasonable conclusion. This conversation can end here.";
      } else if (intent === 'DISENGAGE_PAUSE') {
        progressState = 'ACTIVE';
        unresolvedIssues.push("Conversation paused at user's request; resume when cool");
        closureRecommendation = "You chose to pause the conversation. Stepping away when emotions run high is valid self-regulation.";
      } else if (intent === 'AGGRESSIVE_ATTACK') {
        progressState = 'ACTIVE';
        unresolvedIssues.push("Interpersonal friction escalated by accusatory language");
        closureRecommendation = "We haven't reached an agreement yet. Hostile accusations put Alex on the defensive; try reframing with a clear, objective boundary.";
      } else {
        progressState = 'NEGOTIATING';
      }
    }

    // --- SCENARIO 2: Morgan (setting_boundaries) ---
    else if (scenario.id === 'setting_boundaries') {
      if (intent === 'BOUNDARY_REFUSAL') {
        acceptedProposals.push("User upheld boundary: no overnight guests on couch");
        if (lowerReply.includes('respect') || lowerReply.includes('hostel') || lowerReply.includes('jordan') || lowerReply.includes('motel') || userTurns >= 2) {
          progressState = 'RESOLVED';
          isComplete = true;
          closureRecommendation = "Outstanding boundary setting! You delivered a definitive, guilt-free 'No' without over-apologizing. Morgan acknowledged the limitation and accepted alternative arrangements. Objective achieved.";
        } else {
          progressState = 'NEGOTIATING';
          unresolvedIssues.push("Morgan is testing boundary once more");
        }
      } else if (intent === 'PASSIVE_SURRENDER') {
        progressState = 'ACTIVE';
        unresolvedIssues.push("User yielded personal boundary; Morgan moving in");
        closureRecommendation = "Boundary failed: you conceded reluctantly to Morgan's pushiness. We recommend clicking 'Try Again' to practice saying No with composure.";
      } else {
        progressState = 'NEGOTIATING';
      }
    }

    // --- SCENARIO 3: Prof. Sharma (speaking_with_teacher) ---
    else if (scenario.id === 'speaking_with_teacher') {
      if (intent === 'ACADEMIC_EVIDENCE' || intent === 'AGREEMENT_CONFIRMATION' || lowerUser.includes('addendum')) {
        acceptedProposals.push("Submit 2-page comparative addendum by Friday");
        if (userTurns >= 2 || lowerReply.includes('re-evaluate') || lowerReply.includes('portal') || lowerReply.includes('friday')) {
          progressState = 'RESOLVED';
          isComplete = true;
          closureRecommendation = "Excellent academic advocacy! You presented documented evidence with academic courtesy and secured an objective re-evaluation path with Prof. Sharma. Objective achieved.";
        } else {
          progressState = 'PARTIALLY_RESOLVED';
          unresolvedIssues.push("Submit addendum by Friday deadline");
          closureRecommendation = "Partial resolution: Prof. Sharma agreed to re-evaluate upon submission of the comparative addendum.";
        }
      } else if (intent === 'CONFUSED_OR_HESITANT') {
        progressState = 'NEEDS_CLARIFICATION';
      } else {
        progressState = 'NEGOTIATING';
      }
    }

    // --- OTHER SCENARIOS: Taylor, Jordan, Sam, Chris ---
    else {
      if (lowerReply.includes('agreed') || lowerReply.includes('agree on') || lowerReply.includes('moving forward') || lowerReply.includes('checkpoint') || userTurns >= 3) {
        progressState = 'RESOLVED';
        isComplete = true;
        closureRecommendation = "Good communication! Both parties have established a mutual understanding and aligned on concrete next steps. This conversation can conclude.";
      } else {
        progressState = 'NEGOTIATING';
      }
    }

    return {
      progressState,
      userIntent: intent,
      proposedSolution: acceptedProposals[0],
      acceptedProposals,
      unresolvedIssues,
      agreedNextStep: acceptedProposals.length > 0 ? acceptedProposals[0] : undefined,
      isComplete,
      closureRecommendation,
      closureGuidance: closureRecommendation
    };
  }

  // =========================================================================
  // 4. SITUATION-AWARE CHARACTER RESPONSE GENERATOR
  // =========================================================================
  async generateCharacterResponse(
    scenario: RehearsalScenario,
    transcript: RehearsalMessage[],
    userLatestInput: string,
    forcedStyle?: CommunicationStyle
  ): Promise<string> {
    const input = (userLatestInput || '').trim();
    if (!input) {
      return "I didn't quite catch that. What did you want to say?";
    }

    const previousPartnerUtterances = transcript
      .filter(m => m.role === 'partner')
      .map(m => m.content.trim().toLowerCase());

    const intent = this.detectUserSemanticIntent(input, scenario);
    const style = forcedStyle || this.classifyCommunicationStyle(input, scenario);
    const userTurns = transcript.filter(m => m.role === 'user').length + 1;

    // Groq LLM if online and configured
    const groqKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GROQ_API_KEY) || 
      (typeof process !== 'undefined' ? (process as any).env?.VITE_GROQ_API_KEY : undefined);

    if (groqKey && groqKey !== 'your_groq_api_key_here') {
      try {
        const groqReply = await this.generatePartnerWithGroq(scenario, transcript, input, style, intent, groqKey);
        if (groqReply && this.validateCharacterResponse(groqReply, intent, scenario) && !previousPartnerUtterances.includes(groqReply.trim().toLowerCase())) {
          return groqReply;
        }
      } catch (err: any) {
        console.warn(`[ECHO Rehearsal: Live Groq API unreachable (${err?.message || 'Network error'}). Using on-device situational engine.]`);
      }
    }

    // On-device deterministic situational reasoning
    return this.generateCharacterLocally(scenario, transcript, input, style, intent, userTurns, previousPartnerUtterances);
  }

  // Live LLM generator with strict situation-awareness
  private async generatePartnerWithGroq(
    scenario: RehearsalScenario,
    transcript: RehearsalMessage[],
    userLatestInput: string,
    userStyle: CommunicationStyle,
    intent: UserSemanticIntent,
    apiKey: string
  ): Promise<string | null> {
    const systemPrompt = `You are roleplaying as "${scenario.partnerName}", a ${scenario.partnerRole} in a realistic emotional intelligence roleplay.
Scenario: "${scenario.title}"
Context: ${scenario.situation}
Your Personality & Attitude: ${scenario.partnerAttitude}
User's Semantic Intent: "${intent}"
User's Communication Style: "${userStyle}"

CRITICAL SITUATION-AWARENESS RULES:
1. React directly to what the user JUST proposed:
   - If the user proposed who pays (e.g. "You should pay for the damage"), acknowledge that exact proposal! Do NOT ask "what next step do you think is fair".
   - If the user proposed splitting 50/50, evaluate the 50/50 split!
   - If the user proposed an installment plan (half now, half next month), evaluate the installment schedule!
   - If the user expressed how much disruption/trouble this caused, validate that emotional impact!
   - If the user says "Forget it, I don't want to discuss this", acknowledge their need to pause without forcing conversation!
   - If the user says "I don't know", suggest a concrete first step (like getting a mechanic quote).
2. NEVER invent facts (do not invent unagreed dollar amounts or say "everything is good, I feel good about you").
3. NEVER repeat questions already answered.
4. Keep responses concise (2 natural conversational sentences).`;

    const formattedHistory = transcript.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }));
    formattedHistory.push({ role: 'user', content: userLatestInput });

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
          ...formattedHistory.slice(-8)
        ],
        temperature: 0.5
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  }

  // Response Relevance & Sanity Validator
  validateCharacterResponse(reply: string, intent: UserSemanticIntent, _scenario: RehearsalScenario): boolean {
    const lower = reply.toLowerCase().trim();

    // Rejection 1: Generic circular question when user already proposed next step
    if ((intent === 'PAY_IN_FULL' || intent === 'SPLIT_EXPENSES' || intent === 'PAYMENT_PLAN') && 
        (lower.includes('tell me what next step you think makes this fair') || lower.includes("let's look at what that means for our next step"))) {
      return false;
    }

    // Rejection 2: Unnatural motivational fluff
    if (lower.includes('i feel good about you') || lower.includes('proud of you for admitting it') || lower.includes('everything is good, actually')) {
      return false;
    }

    return true;
  }

  // Deterministic Situational Character Engine
  private generateCharacterLocally(
    scenario: RehearsalScenario,
    _transcript: RehearsalMessage[],
    _userLatestInput: string,
    style: CommunicationStyle,
    intent: UserSemanticIntent,
    userTurns: number,
    previousUtterances: string[]
  ): string {
    let candidates: string[] = [];

    // =======================================================================
    // SCENARIO 1: Alex (friend_disagreement - Car / Laptop Damage)
    // =======================================================================
    if (scenario.id === 'friend_disagreement') {
      // CASE A: User proposes full payment
      if (intent === 'PAY_IN_FULL') {
        candidates = [
          "That's fair. I was the one using your car when it got damaged, so I should take responsibility for the repair. Do you have an estimate from a mechanic so we can agree on the exact amount?",
          "You're right. It was my fault for being careless, and I should pay for the damage. Let's get an official repair estimate so I can transfer the money.",
          "I agree. I was defensive earlier, but you shouldn't have to carry the cost for my mistake. Let's get a quote and I'll cover the repair."
        ];
      }
      // CASE B: User proposes splitting expenses 50/50
      else if (intent === 'SPLIT_EXPENSES') {
        candidates = [
          "I really appreciate you offering to split it 50/50, even though I was borrowing it. Let's get the repair quote together so we know what half comes out to.",
          "That's very generous of you. Since I caused the scratch, I'm glad to split it down the middle. Once you have the bill, let me know the total."
        ];
      }
      // CASE F: User proposes payment plan / installments
      else if (intent === 'PAYMENT_PLAN') {
        candidates = [
          "Splitting it across two months would really help my budget right now. As soon as we get the repair bill, I'll send you the first half right away.",
          "Paying half now and half next month works for me. Let's agree on the mechanic estimate so I can budget the two transfers."
        ];
      }
      // User proposes getting estimate first
      else if (intent === 'GET_ESTIMATE_FIRST') {
        candidates = [
          "Alright, let's review the estimate when it arrives, and then we'll settle the exact payment.",
          "That makes sense. Having the official quote first gives us a real number to work with."
        ];
      }
      // CASE C: User expresses trouble / emotional distress caused
      else if (intent === 'EMOTIONAL_IMPACT') {
        candidates = [
          "You're right. I was so caught up in feeling defensive that I didn't stop to think how stranded you were without your car this week. I'm really sorry for putting you in that spot.",
          "I hear you. I was minimizing it because I felt guilty, but I see now how much hassle and stress this created for you."
        ];
      }
      // CASE D: User disengages / pauses
      else if (intent === 'DISENGAGE_PAUSE') {
        candidates = [
          "I can tell how frustrated and overwhelmed you are right now. We don't have to force this out today, but please let's talk once things cool down so I can make this right.",
          "Fair enough. Let's pause for now. When you're ready to look at repair options, just let me know."
        ];
      }
      // CASE E: Aggressive attack
      else if (intent === 'AGGRESSIVE_ATTACK' || style === 'aggressive') {
        candidates = [
          "Whoa, don't attack my whole character! I made a mistake and I know it, but yelling that you hate dealing with me doesn't solve the car repair.",
          "Calling me irresponsible and screaming doesn't help us fix your car. I apologized for the accident, but I won't be talked to like that."
        ];
      }
      // User confirms agreement
      else if (intent === 'AGREEMENT_CONFIRMATION') {
        candidates = [
          "Agreed. Let's get the estimate tomorrow and settle this fairly. I really appreciate you working this through with me.",
          "Deal. I'm glad we worked this out without letting it ruin our friendship. I'll check in once the invoice arrives."
        ];
      }
      // CASE G: User says "I don't know"
      else if (intent === 'CONFUSED_OR_HESITANT') {
        candidates = [
          "It's okay. How about step one is just taking the car to the auto shop for a quote tomorrow? Once we have the numbers, we can decide how to handle it together.",
          "Take a breath. Let's just agree to get an inspection estimate first, and neither of us has to pay anything until we see the cost."
        ];
      }
      // User checks listening
      else if (intent === 'LISTENING_CHECK') {
        candidates = [
          "I am listening. Tell me what specific resolution you want us to reach regarding the car repair.",
          "I'm listening. Tell me what next step you think makes this fair for both of us regarding the repair expenses."
        ];
      }
      // User disagrees
      else if (intent === 'DISAGREEMENT') {
        candidates = [
          "You disagree? I apologized for the scratch! How can you say I don't care about your things after I offered to help clean it?",
          "What part do you disagree with? Accidents happen between friends all the time."
        ];
      }
      // Fallback
      else {
        candidates = userTurns >= 2 ? [
          "I hear you, and honestly... seeing how much it hurt you made me realize I was being defensive because I felt embarrassed. Let's get a quote and sort out the repair.",
          "We've been friends too long to let money make things weird between us. How do we square this away?"
        ] : [
          "I still think you're overreacting a bit, but I'm listening. Tell me what exactly you expect me to do about it now.",
          "We've known each other five years. Let's find a practical way to resolve the damage."
        ];
      }
    }

    // =======================================================================
    // SCENARIO 2: Morgan (setting_boundaries)
    // =======================================================================
    else if (scenario.id === 'setting_boundaries') {
      if (intent === 'BOUNDARY_REFUSAL') {
        candidates = userTurns >= 2 ? [
          "I hear you. Honestly, I'm in a bind and was counting on you as a friend, but I respect that it's your place. Is there any chance you could help me look for a cheap motel or give me a ride from the station instead?",
          "Fair enough. It puts me in a tough spot with my landlord, but I don't want to force myself on you if you can't host. I'll ask Jordan instead.",
          "I understand... I admit I was hoping you'd say yes, but I appreciate you being direct with me rather than giving a reluctant yes and resenting me later."
        ] : [
          "Are you completely sure? I'm in such a bind with my apartment renovations right now. Not even for a couple of days?",
          "Come on, we've known each other for years and I'm in a tough bind! Why are you being so inflexible about a few nights on the couch?"
        ];
      } else if (intent === 'PASSIVE_SURRENDER' || style === 'passive') {
        candidates = [
          "Awesome! Thank you so much, you're a lifesaver! I'll come over around 8 PM tonight with my luggage. You won't even notice I'm there!",
          "Great! I really appreciate it. Can I stay through the weekend too then? That way I don't have to rush around while they do the drywall."
        ];
      } else if (intent === 'AGGRESSIVE_ATTACK' || style === 'aggressive') {
        candidates = [
          "Whoa, why are you screaming at me? I asked you nicely because I'm in a bind with my apartment renovations. You didn't have to attack me like that.",
          "Hold on, there's no need to be hostile. I thought we were friends. If you can't host me, just say so instead of insulting me."
        ];
      } else if (intent === 'CONFUSED_OR_HESITANT') {
        candidates = [
          "Look, if having me for the whole week is too much, what if I only stayed Thursday night while I find another place?",
          "I can tell you're stressed about this. Can I just leave my bags at your place while I look for a room?"
        ];
      } else if (intent === 'LISTENING_CHECK' || intent === 'PROPOSAL_OR_STEP') {
        candidates = [
          "I'm all ears! If you have another idea that helps me out with a place to crash without messing up your work week, I'm ready to hear it.",
          "Tell me! Are you thinking about a hotel nearby, or does someone else have space?"
        ];
      } else if (intent === 'DISAGREEMENT') {
        candidates = [
          "You disagree that friends should help each other in an emergency? That really hurts after everything we've been through.",
          "I didn't think asking for a couch for a few nights was so controversial. What part of this feels unfair to you?"
        ];
      } else {
        candidates = [
          "I'm listening. Tell me if I can count on your couch or if I need to scramble for another option.",
          "Are you completely sure? Not even for a couple of days?"
        ];
      }
    }

    // =======================================================================
    // SCENARIO 3: Prof. Sharma (speaking_with_teacher)
    // =======================================================================
    else if (scenario.id === 'speaking_with_teacher') {
      if (intent === 'ACADEMIC_EVIDENCE') {
        candidates = [
          "Looking right here at the section you're highlighting on page 4... while you mentioned the email approval, the regression analysis lacks depth. If you submit a two-page addendum addressing the comparative analysis by Friday, I will gladly re-evaluate the grade.",
          "I see the paragraph you're pointing to. While you received permission for the topic, the rubric requires evaluative depth. Show me how you will bridge that gap."
        ];
      } else if (intent === 'CONFUSED_OR_HESITANT') {
        candidates = [
          "Let me put it simply without the academic jargon: Section 3 needed a direct comparison between two companies. Your current draft only summarizes the first one. Do you see where that gap is in your outline?",
          "In plain terms: A summary isn't an analysis. I need to see how you evaluate the data, not just narrate what happened. Does that distinction make sense?"
        ];
      } else if (intent === 'DISAGREEMENT') {
        candidates = [
          "You are entitled to disagree with an academic evaluation, but you must substantiate it using the rubric criteria. What specific grading discrepancy are you asserting?",
          "Disagreeing with a grade requires evidence, not just emotion. Point out where in the text your comparative analysis meets the rubric benchmark."
        ];
      } else if (intent === 'AGGRESSIVE_ATTACK' || style === 'aggressive') {
        candidates = [
          "I do not appreciate that tone in my office. If you cannot discuss your academic standing with professional courtesy, I will ask you to leave.",
          "Raising your voice and making accusations will not alter your academic grade."
        ];
      } else if (intent === 'LISTENING_CHECK' || intent === 'PROPOSAL_OR_STEP') {
        candidates = [
          "I am listening. If you have a specific proposal to reconcile your essay with the approved rubric, go ahead and lay it out.",
          "I am paying full attention. Are you proposing to submit an addendum or provide the comparative documentation for section 3?"
        ];
      } else {
        candidates = userTurns >= 2 ? [
          "I appreciate you advocating for your work with composure and documented notes. If you submit a two-page addendum addressing the comparative analysis by Friday, I will gladly re-evaluate the grade.",
          "Alright, show me the specific notes where you addressed the core rubric milestone, and we can discuss how to bridge the differential."
        ] : [
          "Walk me through your thought process for section 3, and let's see how closely it aligns with the rubric prompt.",
          "State your primary question regarding the assignment so we can address it directly."
        ];
      }
    }

    // =======================================================================
    // SCENARIOS 4, 5, 6, 7 (Taylor, Jordan, Sam, Chris)
    // =======================================================================
    else if (scenario.id === 'expressing_disappointment') {
      if (intent === 'DISENGAGE_PAUSE') {
        candidates = ["I understand you need space right now. I'll finish the slide deck myself and send it over for your review."];
      } else if (intent === 'AGGRESSIVE_ATTACK' || style === 'aggressive') {
        candidates = ["You don't need to attack my character! I told you it was a family emergency. You have no idea what I was dealing with this weekend."];
      } else {
        candidates = userTurns >= 2 ? [
          "When you put it that way, I realize I left you in a really stressful spot before Monday morning. I should have texted you on Friday even if I couldn't finish. I'm sorry.",
          "You're right. Disappearing for three days wasn't fair to you. Moving forward, I commit to communicating status updates even if things get hectic."
        ] : [
          "I'm listening. Tell me how you want us to divide the remaining slides before the client meeting.",
          "Look, the client meeting is still two days away. Can't we just merge the decks now and move forward?"
        ];
      }
    }
    else if (scenario.id === 'handling_criticism') {
      if (intent === 'AGGRESSIVE_ATTACK' || style === 'aggressive') {
        candidates = ["If you cannot handle professional critique from your team lead without throwing a tantrum, you are not ready for leadership reviews."];
      } else if (intent === 'DISAGREEMENT') {
        candidates = ["You disagree? Fine. Challenge my critique with hard data. Why do you believe your quarterly assumptions hold up against market baselines?"];
      } else {
        candidates = userTurns >= 2 ? [
          "I appreciate you taking the feedback on the chin without getting flustered. That's the leadership maturity I want to see. Walk me through your plan to verify the numbers by tomorrow.",
          "That's a productive attitude. If you tighten the financial assumptions and stress-test the risk section, this can still be a winning deck."
        ] : [
          "I'm listening. What is your proposed remediation timeline before the leadership review?",
          "I need more than general assurances. Which specific data points in section two do you plan to verify before our rehearsal?"
        ];
      }
    }
    else if (scenario.id === 'giving_constructive_feedback') {
      if (intent === 'AGGRESSIVE_ATTACK' || style === 'aggressive') {
        candidates = ["Stop attacking me! I'm already drowning in tickets and doing the work of two people. You're not my manager."];
      } else {
        candidates = userTurns >= 2 ? [
          "I appreciate you explaining that without attacking me. I've been drowning in ticket escalations, but I didn't realize it was pushing late hours onto you. Let's agree on a noon checkpoint.",
          "Thanks for having this conversation directly. I can set an automated alert at 1 PM to send whatever draft I have so you aren't waiting in the dark."
        ] : [
          "I'm listening. How do you propose we adjust the handoff workflow?",
          "I hear you, but my workload has doubled this quarter. What do you suggest I deprioritize to get you those files earlier?"
        ];
      }
    }
    else {
      // Chris - Stressful conversation
      if (intent === 'AGGRESSIVE_ATTACK' || style === 'aggressive') {
        candidates = ["Don't yell at me! I didn't break the build on purpose! Shouting isn't going to make the staging server come back online!"];
      } else {
        candidates = userTurns >= 2 ? [
          "You're right... taking a breath helps. Hearing you stay calm makes me realize we still have two hours. Where should we look first?",
          "Okay, I'm listening. If we rollback the last commit to staging, will that restore the demo flow?"
        ] : [
          "Okay, okay, I'm listening! Tell me what step one is before I lose my mind.",
          "I can't believe this happened today of all days! Tell me you have a plan to patch this."
        ];
      }
    }

    // Filter out previously used utterances
    const freshCandidates = candidates.filter(c => !previousUtterances.includes(c.toLowerCase().trim()));
    if (freshCandidates.length > 0) {
      return freshCandidates[0];
    }

    return candidates[0] || "I hear what you're saying, but we need to agree on how we handle this situation right now.";
  }

  // =========================================================================
  // 5. ECHO COMMUNICATION COACH FEEDBACK GENERATOR
  // =========================================================================
  generateCoachFeedback(
    scenario: RehearsalScenario,
    transcript: RehearsalMessage[],
    userMessage: string,
    forcedStyle?: CommunicationStyle,
    conversationState?: ConversationStateTracker
  ): CoachingFeedback {
    const style = forcedStyle || this.classifyCommunicationStyle(userMessage, scenario);
    const intent = this.detectUserSemanticIntent(userMessage, scenario);
    const userTurns = transcript.filter(m => m.role === 'user').length + 1;

    // Better response model library
    let betterResponse = "I hear your perspective, but I need us to agree on a concrete resolution.";
    if (scenario.id === 'friend_disagreement') {
      betterResponse = "Alex, I value our friendship too much to let resentment build. Since the damage happened while you were driving, let's get a repair estimate and agree on how to settle it.";
    } else if (scenario.id === 'setting_boundaries') {
      betterResponse = "I understand this is an emergency for you, Morgan, but I cannot host guests this week. I need uninterrupted focus for my work sprint.";
    } else if (scenario.id === 'speaking_with_teacher') {
      betterResponse = "Thank you for your time, Professor Sharma. I have my essay and the email approval here; could we look at section 3 together?";
    }

    // 1. AGGRESSIVE COMMUNICATION COACHING
    if (style === 'aggressive') {
      return {
        skill: 'Emotional Self-Regulation & De-escalation',
        communicationStyle: 'aggressive',
        observation: "Your response used attacking or accusatory language. Hostility triggers immediate defensive resistance from the other person and derails resolution.",
        whatWentWell: "You communicated that you are dissatisfied rather than bottling it up.",
        improvement: "Replace personal attacks and blame with an 'I' statement focused strictly on the boundary or financial resolution.",
        betterResponse,
        coachingTip: "Focus critique on the specific event or cost, never on the other person's personality.",
        shouldRetry: true
      };
    }

    // 2. PASSIVE COMMUNICATION COACHING
    if (style === 'passive') {
      return {
        skill: 'Boundary Setting & Self-Advocacy',
        communicationStyle: 'passive',
        observation: "You conceded reluctantly or softened your stance to avoid uncomfortable friction. Reluctant surrender invites future boundary overstepping.",
        whatWentWell: "You maintained a polite tone.",
        improvement: "Deliver a clear, definitive stance without apologizing for having boundaries or asking for basic accountability.",
        betterResponse,
        coachingTip: "Setting a boundary or asking for repair costs is not an attack; it is healthy accountability.",
        shouldRetry: true
      };
    }

    // 3. AVOIDANT COMMUNICATION COACHING
    if (style === 'avoidant') {
      return {
        skill: 'Constructive Directness',
        communicationStyle: 'avoidant',
        observation: "You deflected or expressed hesitation ('I don't know'). When you leave decisions open, the other person will continue pushing their own agenda.",
        whatWentWell: "You paused instead of reacting aggressively.",
        improvement: "Propose just one concrete initial step (such as getting a quote) to move past paralysis.",
        betterResponse,
        coachingTip: "When uncertain, propose a fact-finding step: 'Let's get an estimate first so we have real data.'",
        shouldRetry: true
      };
    }

    // 4. RESOLVED / CLOSURE COACHING
    if (conversationState?.progressState === 'RESOLVED') {
      return {
        skill: 'Collaborative Problem-Solving & Closure',
        communicationStyle: 'assertive',
        observation: "Good assertive communication! You identified the problem, proposed a clear solution without personal attacks, and reached a mutual agreement.",
        whatWentWell: "Maintained composure and guided the dialogue to a natural resolution.",
        improvement: "No further dialogue needed—you have reached a reasonable conclusion.",
        betterResponse,
        coachingTip: "When agreement is reached, close cleanly and confirm the next milestone.",
        shouldRetry: false
      };
    }

    // 5. ASSERTIVE / EMPATHETIC COACHING (Default)
    return {
      skill: intent === 'SPLIT_EXPENSES' || intent === 'PAYMENT_PLAN' ? 'Collaborative Negotiation' : 'Clear Assertiveness & Grounded Composure',
      communicationStyle: style === 'empathetic' ? 'empathetic' : 'assertive',
      observation: intent === 'PAY_IN_FULL'
        ? "Good assertive communication. You clearly communicated the solution (paying for the damage) without resorting to personal attacks."
        : intent === 'SPLIT_EXPENSES'
        ? "Constructive compromise. Offering a 50/50 split balances accountability with friendship preservation."
        : intent === 'PAYMENT_PLAN'
        ? "Practical negotiation. Offering a two-part payment plan accommodates real budget constraints while maintaining accountability."
        : "You expressed your point clearly and directly without passive hedging or hostile aggression.",
      whatWentWell: "Directly addressed the problem and proposed a clear path forward.",
      improvement: userTurns >= 3 ? "Guide the dialogue toward final agreement confirmation." : "Keep holding this composure through the next turn.",
      betterResponse,
      coachingTip: "Pairing a firm boundary with a constructive alternative achieves resolutions without escalating conflict.",
      shouldRetry: false
    };
  }

  // =========================================================================
  // 6. UNIFIED REHEARSAL TURN PIPELINE
  // =========================================================================
  async generateTurnResult(
    scenario: RehearsalScenario,
    transcript: RehearsalMessage[],
    userLatestInput: string
  ): Promise<RehearsalTurnResult> {
    const input = (userLatestInput || '').trim();
    const intent = this.detectUserSemanticIntent(input, scenario);
    const style = this.classifyCommunicationStyle(input, scenario);
    const userTurns = transcript.filter(m => m.role === 'user').length + 1;

    // 1. Generate Character Reaction
    let characterResponse = await this.generateCharacterResponse(scenario, transcript, input, style);

    // 2. Validate relevance (prevent circular or unnatural responses)
    if (!this.validateCharacterResponse(characterResponse, intent, scenario)) {
      characterResponse = this.generateCharacterLocally(scenario, transcript, input, style, intent, userTurns, []);
    }

    // 3. Track Conversation Progress & Closure
    const conversationState = this.evaluateConversationProgress(scenario, transcript, intent, input, characterResponse);

    // 4. Generate Independent Coaching Feedback
    const coaching = this.generateCoachFeedback(scenario, transcript, input, style, conversationState);

    // 5. Determine Stage
    let stage: ScenarioStage = 'opening';
    if (userTurns === 2) stage = 'developing';
    else if (userTurns >= 3) {
      stage = conversationState.isComplete ? 'resolution' : 'climax';
    }

    return {
      characterResponse,
      coaching,
      scenarioStage: stage,
      conversationState
    };
  }

  // Backwards-compatible partner generation method
  async generatePartnerResponse(
    scenario: RehearsalScenario,
    transcript: RehearsalMessage[],
    userLatestInput: string
  ): Promise<string> {
    const result = await this.generateTurnResult(scenario, transcript, userLatestInput);
    return result.characterResponse;
  }

  // =========================================================================
  // 7. RETRY COMPARISON ENGINE
  // =========================================================================
  compareResponses(
    original: string,
    revised: string,
    scenario: RehearsalScenario
  ): { original: string; revised: string; whatImproved: string } {
    const origStyle = this.classifyCommunicationStyle(original, scenario);
    const revStyle = this.classifyCommunicationStyle(revised, scenario);

    let whatImproved = "Your revised response shows increased communication awareness and intentionality.";

    if ((origStyle === 'aggressive' || origStyle === 'passive' || origStyle === 'avoidant') && 
        (revStyle === 'assertive' || revStyle === 'empathetic')) {
      whatImproved = `Significant improvement! You shifted from a ${origStyle} tone to a ${revStyle} approach, clearly upholding your perspective while maintaining composure.`;
    } else if (origStyle === 'aggressive' && revStyle !== 'aggressive') {
      whatImproved = "You removed the attacking language and focused on the core issue without escalating hostility.";
    } else if (origStyle === 'passive' && revStyle === 'assertive') {
      whatImproved = "You replaced apologetic concession with a firm, unambiguous boundary.";
    } else if (origStyle === 'avoidant' && (revStyle === 'assertive' || revStyle === 'empathetic')) {
      whatImproved = "You stepped up to address the dilemma directly instead of deflecting with uncertainty.";
    }

    return {
      original,
      revised,
      whatImproved
    };
  }

  // =========================================================================
  // 8. END-OF-SCENARIO 5-PILLAR FEEDBACK REPORT
  // =========================================================================
  async generateFeedbackReport(
    scenario: RehearsalScenario,
    transcript: RehearsalMessage[]
  ): Promise<RehearsalFeedbackReport> {
    const userMessages = transcript.filter(m => m.role === 'user');
    const totalTurns = userMessages.length;

    const allUserText = userMessages.map(m => m.content).join(' ');
    const lower = allUserText.toLowerCase();

    // 1. Empathy Evaluation
    const hasPerspectiveTaking = /\b(understand|hear you|see where you're coming from|perspective|feeling|valid|appreciate|know you're|stressful for you)\b/i.test(lower);
    const hasActiveListening = /\b(you said|as you mentioned|makes sense|i know you)\b/i.test(lower);
    let empathyScore = 65;
    if (hasPerspectiveTaking) empathyScore += 18;
    if (hasActiveListening) empathyScore += 12;
    empathyScore = Math.min(Math.max(empathyScore, 45), 96);

    // 2. Clarity Evaluation
    const avgLength = totalTurns > 0 ? allUserText.split(/\s+/).length / totalTurns : 0;
    const isConcise = avgLength >= 8 && avgLength <= 35;
    const hasRambling = avgLength > 45;
    let clarityScore = 70;
    if (isConcise) clarityScore += 18;
    if (hasRambling) clarityScore -= 15;
    clarityScore = Math.min(Math.max(clarityScore, 50), 95);

    // 3. Emotional Control
    const hasAggression = /\b(you always|you never|shut up|hate|idiot|stupid|ridiculous|jerk|screw you|moron)\b/i.test(lower);
    const hasComposure = /\b(let's|calm|pause|take a breath|moving forward|objective|substantiate|rubric)\b/i.test(lower);
    let emotionalControlScore = 80;
    if (hasAggression) emotionalControlScore -= 35;
    if (hasComposure) emotionalControlScore += 12;
    emotionalControlScore = Math.min(Math.max(emotionalControlScore, 40), 98);

    // 4. Assertiveness
    const hasBoundaryWords = /\b(need|my expectation|cannot|i will not|important to me|boundary|standard|can't let you|cannot host)\b/i.test(lower);
    const hasPassivity = /\b(sorry sorry|whatever you want|it's fine just do it|fine whatever|my fault anyway)\b/i.test(lower);
    let assertivenessScore = 68;
    if (hasBoundaryWords) assertivenessScore += 20;
    if (hasPassivity) assertivenessScore -= 22;
    assertivenessScore = Math.min(Math.max(assertivenessScore, 45), 94);

    // 5. Respectful Communication
    const hasRespectfulMarkers = /\b(please|thank you|appreciate|respect|courtesy|professor|dr|friend)\b/i.test(lower);
    let respectfulScore = 75;
    if (hasRespectfulMarkers) respectfulScore += 15;
    if (hasAggression) respectfulScore -= 25;
    respectfulScore = Math.min(Math.max(respectfulScore, 50), 96);

    const overallScore = Math.round(
      (empathyScore + clarityScore + emotionalControlScore + assertivenessScore + respectfulScore) / 5
    );

    // Identify Best & Challenging Moments
    let bestMoment = { turnIndex: 1, text: userMessages[0]?.content || '', reason: "Initial opening engagement" };
    let worstMoment = { turnIndex: 1, text: userMessages[0]?.content || '', reason: "Could be refined with greater composure" };

    userMessages.forEach((m, idx) => {
      const s = this.classifyCommunicationStyle(m.content, scenario);
      if (s === 'empathetic' || s === 'assertive') {
        bestMoment = { turnIndex: idx + 1, text: m.content, reason: `Exemplified ${s} communication with clear boundaries and composure.` };
      }
      if (s === 'aggressive' || s === 'passive') {
        worstMoment = { turnIndex: idx + 1, text: m.content, reason: `Showed ${s} tendencies that compromised emotional regulation or personal boundary.` };
      }
    });

    const whatUserDidWell: string[] = [];
    if (empathyScore >= 70) whatUserDidWell.push("Acknowledged the other person's perspective before defending your stance.");
    if (clarityScore >= 70) whatUserDidWell.push("Stated your core point with direct, concise phrasing.");
    if (emotionalControlScore >= 75) whatUserDidWell.push("Maintained emotional composure under pushback without resorting to insults.");
    if (assertivenessScore >= 70) whatUserDidWell.push("Upheld your expectations clearly without collapsing into passive avoidance.");
    if (whatUserDidWell.length === 0) whatUserDidWell.push("Engaged across multiple dialogue turns to work through a tense topic.");

    const whatCouldBeImproved: string[] = [];
    if (empathyScore < 75) whatCouldBeImproved.push("Incorporate more active listening markers ('I hear that you're stressed about...') before stating your need.");
    if (assertivenessScore < 75) whatCouldBeImproved.push("Replace apologetic softening with definitive, calm boundaries.");
    if (emotionalControlScore < 75) whatCouldBeImproved.push("Avoid using sweeping absolute phrases ('you always', 'you never') during conflict.");
    if (clarityScore < 75) whatCouldBeImproved.push("Keep responses between 2-3 focused sentences to avoid diluting your message.");
    if (whatCouldBeImproved.length === 0) whatCouldBeImproved.push("Practice guiding the conversation toward a mutual closing checkpoint.");

    const skillScores = [
      { name: 'Empathy & Attunement', score: empathyScore, rationale: "Ability to sense and mirror the counterpart's pressure." },
      { name: 'Clarity & Directness', score: clarityScore, rationale: 'Efficiency and focus of conversational statements.' },
      { name: 'Emotional Self-Regulation', score: emotionalControlScore, rationale: 'Composure and resilience under direct challenge.' },
      { name: 'Assertiveness & Boundaries', score: assertivenessScore, rationale: 'Firmness in upholding personal standards without aggression.' },
      { name: 'Respectful Dignity', score: respectfulScore, rationale: 'Politeness and mutual dignity preserved during friction.' }
    ];
    skillScores.sort((a, b) => b.score - a.score);

    const strongestSkill = `${skillScores[0].name} (${skillScores[0].score}/100) — ${skillScores[0].rationale}`;
    const weakestSkill = `${skillScores[skillScores.length - 1].name} (${skillScores[skillScores.length - 1].score}/100) — ${skillScores[skillScores.length - 1].rationale}`;

    const keyTurn = worstMoment.text || userMessages[0]?.content || "I don't know what to say.";
    const keyStyle = this.classifyCommunicationStyle(keyTurn, scenario);
    const feedback = this.generateCoachFeedback(scenario, transcript, keyTurn, keyStyle);
    const improvedVersion = feedback.betterResponse || "I hear your perspective, and I want to make sure we find a constructive resolution. Here is what I need moving forward.";

    return {
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      totalTurns,
      overallScore,
      dimensions: {
        empathy: {
          score: empathyScore,
          rationale: empathyScore >= 75 
            ? "Effectively recognized the other person's context."
            : "Focus more on validating their pressure before presenting your solution.",
          actionableTip: "Mirror one key emotion word they used before replying."
        },
        clarity: {
          score: clarityScore,
          rationale: clarityScore >= 75
            ? "Messages were concise and direct."
            : "Reduce qualifying preamble words and state your request directly.",
          actionableTip: "State the primary request in the very first sentence."
        },
        emotionalControl: {
          score: emotionalControlScore,
          rationale: emotionalControlScore >= 75
            ? "Stayed centered and non-defensive."
            : "Avoid retaliating to provocative remarks.",
          actionableTip: "Take a three-second breath before answering sharp critique."
        },
        assertiveness: {
          score: assertivenessScore,
          rationale: assertivenessScore >= 75
            ? "Held ground without over-apologizing."
            : "Avoid softening a 'no' with unnecessary guilt-driven excuses.",
          actionableTip: "Use 'I' statements rather than questioning their intentions."
        },
        respectfulCommunication: {
          score: respectfulScore,
          rationale: respectfulScore >= 75
            ? "Maintained courteous professional dignity."
            : "Guard against sarcastic or passive-aggressive phrasing.",
          actionableTip: "Frame disagreements around outcomes rather than personalities."
        }
      },
      whatUserDidWell,
      whatCouldBeImproved,
      keyMoment: {
        originalResponse: keyTurn,
        improvedResponse: improvedVersion,
        suggestedAlternativeSentence: improvedVersion,
        explanation: feedback.observation
      },
      bestMoment,
      worstMoment,
      strongestSkill,
      weakestSkill,
      practicalTakeaway: `In conversations with ${scenario.partnerName}, leading with ${skillScores[0].name.toLowerCase()} while strengthening your ${skillScores[skillScores.length - 1].name.toLowerCase()} creates the highest probability of constructive agreement.`,
      disclaimer: "AI-generated practice feedback (not a scientifically validated psychological assessment)."
    };
  }
}

export const rehearsalEngine = new RehearsalEngine();
