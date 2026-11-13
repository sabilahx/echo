"""
ECHO 2.0 - Emotionally Intelligent Voice Companion
Module: response_engine.py
Purpose: Response Generation Engine implementing the Four Emotional Intelligence Modules:
- Module A: Self-Awareness (confirmation prompts & reflection)
- Module B: Self-Regulation (pacing, grounding, optional box breathing, milestone chunking)
- Module C: Empathy (multi-turn context resolution, safety & crisis handling)
- Module D: Social Skills (Say It Better in Polite, Professional, Friendly styles)
"""

import random
import re
from typing import Dict, List, Any, Optional


def detect_context_topic(text: str) -> str:
    """Detect topic category from text for context-aware tailoring."""
    t = text.lower()
    if any(k in t for k in ['interview', 'hiring', 'recruiter', 'resume', 'job interview']):
        return 'interview'
    if any(k in t for k in ['assignment', 'exam', 'test', 'study', 'homework', 'project', 'deadline', 'grade', 'class', 'college', 'school', 'university', 'presentation']):
        return 'academic'
    if any(k in t for k in ['teammate', 'colleague', 'coworker', 'boss', 'office', 'client', 'career', 'workplace']):
        return 'workplace'
    if any(k in t for k in ['future', 'path', 'direction', 'life', 'ahead', 'uncertainty']):
        return 'future'
    if any(k in t for k in ['mom', 'mother', 'dad', 'father', 'sister', 'brother', 'parent', 'family', 'relatives']):
        return 'family'
    if any(k in t for k in ['friend', 'friends', 'friendship', 'bestie', 'pal']):
        return 'friendship'
    if any(k in t for k in ['partner', 'relationship', 'boyfriend', 'girlfriend', 'husband', 'wife', 'spouse']):
        return 'relationship'
    if any(k in t for k in ['lonely', 'alone', 'isolated', 'nobody', 'left out', 'empty']):
        return 'loneliness'
    if any(k in t for k in ['tired', 'sleep', 'sick', 'exhausted', 'burnout', 'drained', 'health']):
        return 'wellness'
    return 'general'


def generate_crisis_response() -> Dict[str, Any]:
    """Provides compassionate emergency support and helpline resources."""
    return {
        'response': (
            "I hear that you are going through immense pain right now, and I want you to know that you are not alone. "
            "Please reach out to someone who can support you immediately—whether a trusted friend, family member, or professional counselor. "
            "Help and compassionate human support are available right now:\n\n"
            "• India: Tele-MANAS (14416 or 1800-891-4416) | Vandrevala Foundation (9999 666 555) | AASRA (9820466726)\n"
            "• US/Canada: 988 Suicide & Crisis Lifeline (Call or Text 988)\n"
            "• UK: 111 / Samaritans (116 123)\n"
            "• International: https://findahelpline.com\n\n"
            "Please take a gentle breath and reach out to one of these free, confidential resources. People truly want to support you through this."
        ),
        'reflection': "Who is one person in your life or community you can connect with today?",
        'suggest_breathing': True,
        'strategy': "Immediate crisis support and professional referral"
    }


def generate_empathetic_response(
    user_text: str,
    emotion: str,
    confidence: float,
    context_info: Optional[Dict[str, Any]] = None,
    is_low_confidence: bool = False,
    is_crisis: bool = False
) -> Dict[str, Any]:
    """
    Synthesizes a response integrating Modules A, B, and C.
    Considers:
    - User's sentence
    - Detected emotion
    - Contextual entities / anaphora (e.g. 'it' refers to 'interview')
    - Low-confidence ambiguity
    - Suggested self-regulation interventions
    """
    if is_crisis:
        return generate_crisis_response()

    topic = detect_context_topic(user_text)
    suggest_breathing = False
    referenced_entity = None

    if context_info:
        referenced_entity = context_info.get('referenced_entity')
        if not referenced_entity and context_info.get('recent_entities'):
            referenced_entity = context_info['recent_entities'][-1]
        if topic == 'general' and context_info.get('active_topic'):
            topic = context_info['active_topic']

    # Low-confidence / Ambiguous input handling
    if is_low_confidence:
        if topic == 'interview' or (referenced_entity and 'interview' in referenced_entity):
            resp = (
                "I sense subtle or mixed feelings regarding your interview—perhaps a blend of anticipation and nervous tension. "
                "An upcoming interview naturally brings forward multiple thoughts at once. "
                "Could you share a little more about which aspect of the interview is occupying your mind most?"
            )
        elif topic == 'academic':
            resp = (
                "I hear a mixture of stress and uncertainty in your message. "
                "Facing an academic task when the path forward feels unclear can feel disorienting. "
                "Would it help to take one breath and look at just the first paragraph or initial step together? "
                "Tell me a bit more about what feels most unclear."
            )
        elif topic in ['family', 'relationship']:
            resp = (
                "I notice nuanced emotional undertones here—relationships often bring together warmth alongside subtle complexities. "
                "How are you feeling in this moment? Tell me a bit more so I can understand what is on your heart."
            )
        else:
            resp = (
                f"I'm noticing subtle linguistic cues that might suggest {emotion}, though there seem to be several layers to what you shared. "
                "Rather than assuming, I want to listen closely: could you tell me a little more about what you are experiencing?"
            )
        return {
            'response': resp,
            'reflection': "What is the primary thought running through your mind as you reflect on this?",
            'suggest_breathing': False,
            'strategy': "Supportive clarification and open exploration (Self-Awareness)"
        }

    # High / Confident Emotion Responses with Context Integration
    # 1. SADNESS
    if emotion == 'sadness':
        if referenced_entity:
            resp = (
                f"I hear how heavy this feels, especially dealing with the {referenced_entity}. "
                "Disappointment and fatigue are completely valid when something matters deeply to you. "
                "You don't need to force yourself to feel positive immediately. What would offer you a small sense of comfort right now?"
            )
        elif topic == 'academic':
            resp = (
                "It is completely understandable to feel discouraged when academic efforts don't yield the outcome you hoped for. "
                "Your worth is not defined by a single exam or assignment. "
                "Would you like to step back for a moment and give yourself some breathing room before deciding your next step?"
            )
        elif topic == 'loneliness':
            resp = (
                "Loneliness can feel very quiet and heavy, and I want to honor the courage it takes to voice that feeling. "
                "Feeling disconnected right now does not mean you are unworthy of warmth and companionship. "
                "What is one kind, self-compassionate thing you can do for yourself tonight?"
            )
        else:
            responses = [
                "I hear the ache in what you're saying, and I want to validate that it is okay to feel sad right now. You don't have to carry this burden in silence. What kind of support would feel most helpful right now?",
                "Thank you for trusting me with this. Sadness is an emotional signal that something deeply meaningful is being processed. Be gentle with yourself today—what is one small comfort you can give yourself?",
                "I acknowledge how draining this feels. Please give yourself permission to feel without judgment. When you're ready, what would help ease even a fraction of this weight?"
            ]
            resp = random.choice(responses)

    # 2. JOY
    elif emotion == 'joy':
        if referenced_entity:
            resp = (
                f"That is fantastic news regarding the {referenced_entity}! "
                "Taking a moment to savor your accomplishment reinforces positive resilience. "
                "How does it feel to see this moment come together?"
            )
        elif topic == 'academic':
            resp = (
                "What a wonderful achievement! Academic milestones take perseverance and focused discipline. "
                "Take time to genuinely celebrate this success today—how will you reward yourself?"
            )
        else:
            responses = [
                "I love hearing this! Your positive energy is wonderful, and celebrating good moments is a vital part of emotional well-being. What made this moment particularly meaningful for you?",
                "That is wonderful! When joy arises, pausing to truly savor it strengthens our emotional foundations. How can you carry this uplifting feeling into the rest of your day?",
                "It brings me so much warmth to hear your happiness! You deserve to celebrate this feeling fully. What are you most grateful for right now?"
            ]
            resp = random.choice(responses)

    # 3. ANGER
    elif emotion == 'anger':
        suggest_breathing = True
        if referenced_entity:
            resp = (
                f"I can hear how deeply frustrating this situation with the {referenced_entity} is. "
                "Anger often signals that an important expectation or personal boundary was disregarded. "
                "Before addressing it, taking a moment to breathe protects your peace and gives you control. "
                "Would you like to take a quick pause, or explore a constructive way to state your needs clearly?"
            )
        elif topic == 'workplace':
            resp = (
                "I hear how unfairly burdened you feel by this workplace situation. When effort feels one-sided, resentment naturally builds. "
                "Taking a moment to steady yourself allows you to communicate your boundaries with strength and calm. "
                "Would it help to take a few slow breaths before we draft a constructive response?"
            )
        else:
            responses = [
                "I hear the intense frustration in your words, and anger is a natural response when boundaries feel violated. Pausing for a steady breath before reacting preserves your power. What outcome would you truly like to see happen?",
                "Your frustration is completely understandable. Anger is often our mind's alarm that something needs to be corrected. What would help you regain your calm before you decide how to respond?",
                "I acknowledge your anger. It's completely valid to feel heated, but taking a mindful pause ensures you respond with clarity rather than reacting on impulse. What is at the very core of this frustration?"
            ]
            resp = random.choice(responses)

    # 4. FEAR
    elif emotion == 'fear':
        suggest_breathing = True
        if referenced_entity:
            resp = (
                f"It is completely natural to feel anxious or scared about the {referenced_entity}. "
                "When something is significant to our future, our mind anticipates worst-case scenarios to protect us. "
                "Remember: you don't need to control every variable, only your very next step. "
                "Would you like to try a short breathing exercise to ground yourself, or break down the preparation step by step?"
            )
        elif topic == 'interview':
            resp = (
                "Interview nerves are one of the most common and natural stress responses—it proves how much you care about doing well. "
                "You do not need to deliver a flawless performance; you only need to share your genuine capabilities. "
                "Let's take a slow, grounding breath together. What is one strength you can remind yourself of today?"
            )
        elif topic == 'academic':
            resp = (
                "Feeling paralyzed when facing a large assignment or exam deadline is a common stress reaction—your brain is experiencing cognitive overload. "
                "You do not have to conquer the whole project today. What is one tiny, manageable piece we can look at first?"
            )
        else:
            responses = [
                "I hear the fear and worry in what you shared. When uncertainty rises, grounding ourselves in the present moment restores clarity. You have navigated difficult moments before. What is one tangible thing within your control today?",
                "It takes vulnerability to acknowledge feeling scared. Fear is your mind's warning system, but it doesn't mean you are incapable. Would taking a steady, calming breath together help right now?",
                "I'm here with you. When fear feels overwhelming, breaking your situation into bite-sized actions creates stability. What is one small step that would bring you a sense of reassurance?"
            ]
            resp = random.choice(responses)

    # 5. LOVE
    elif emotion == 'love':
        if referenced_entity:
            resp = (
                f"It is deeply moving to hear how much warmth and appreciation you hold for {referenced_entity}. "
                "Cherishing meaningful relationships anchors our emotional fulfillment. "
                "What is one memory or quality that makes this connection so special to you?"
            )
        else:
            responses = [
                "It is truly touching to hear such genuine warmth and affection. Expressing love and gratitude nurtures our deepest social connections. Have you had the chance to share this appreciation with them directly?",
                "That feeling of affection and gratitude is so grounding. Recognizing the positive connections in our lives builds emotional resilience. How does being around them influence your perspective?",
                "Such a tender and uplifting feeling! Cherishing those we care about enriches our emotional health. What is something you appreciate most about this bond?"
            ]
            resp = random.choice(responses)

    # 6. SURPRISE
    elif emotion == 'surprise':
        if referenced_entity:
            resp = (
                f"The news regarding the {referenced_entity} certainly seems to have caught you off guard! "
                "Unexpected events require a moment of mental recalibration. "
                "Now that you've had a moment to absorb it, how is this surprise settling with you?"
            )
        else:
            responses = [
                "Unexpected moments can completely shift our awareness! Life has a way of catching us off guard. How is this surprising news sitting with you—does it feel exciting, disorienting, or a mix of both?",
                "What an unforeseen turn of events! When things happen suddenly, it takes our minds a moment to process. What was your very first thought when this happened?",
                "That certainly sounds unexpected! Surprises often open up angles we hadn't previously considered. What does this mean for your next move?"
            ]
            resp = random.choice(responses)

    else:
        resp = "Thank you for sharing your thoughts with me. I am listening and here to support you."

    # Reflection Prompt
    reflection = generate_reflection_prompt(emotion, topic, referenced_entity)

    # Strategy text
    strategies = {
        'sadness': 'Emotional validation and patient self-compassion',
        'joy': 'Active savoring and celebrating progress',
        'anger': 'Pause before reacting, boundary reflection, and de-escalation',
        'fear': 'Somatic grounding, manageable next steps, and realistic reassurance',
        'love': 'Relational gratitude and deepening connection',
        'surprise': 'Cognitive adaptability and exploratory reflection'
    }

    return {
        'response': resp,
        'reflection': reflection,
        'suggest_breathing': suggest_breathing,
        'strategy': strategies.get(emotion, 'Supportive dialogue')
    }


def generate_reflection_prompt(emotion: str, topic: Optional[str] = None, entity: Optional[str] = None) -> str:
    """Generate meaningful reflection prompts aligned with EI self-awareness."""
    prompts = {
        'sadness': [
            "What is the underlying need or comfort that you are longing for right now?",
            "If a close friend were in this exact situation, what words of kindness would you offer them?",
            "What is one self-compassionate action you can take to honor your feelings today?"
        ],
        'joy': [
            "What personal effort or value helped create this positive experience?",
            "How can you anchor this feeling so you can revisit it during challenging times?",
            "Who could you share this positive energy or gratitude with today?"
        ],
        'anger': [
            "What boundary or core value of yours felt violated or disregarded in this situation?",
            "How can you express your need clearly and firmly without letting anger control the tone?",
            "What is one physical or mental pause that could help discharge the tension before you respond?"
        ],
        'fear': [
            "What parts of this situation are genuinely within your control, and what parts belong to the unknown?",
            "If the worst-case fear occurred, what inner resilience or support network would you rely on?",
            "What is the very next 10-minute action that would give you some peace of mind?"
        ],
        'love': [
            "How does expressing appreciation for this person deepen your own sense of contentment?",
            "What is a small, intentional gesture you can make to show your gratitude today?",
            "What does this relationship teach you about your own emotional values?"
        ],
        'surprise': [
            "How does this unexpected turn challenge or expand your previous assumptions?",
            "What new opportunities or perspectives might be hidden within this surprise?",
            "How quickly does your mind transition from surprise to curiosity?"
        ]
    }
    options = prompts.get(emotion, [
        "What is one thing you could do differently when handling a similar situation?",
        "What made you feel this way in this moment?",
        "How would you communicate this feeling constructively to someone who cares?"
    ])
    return random.choice(options)


def say_it_better(user_text: str, emotion: Optional[str] = None, preferred_style: str = "polite") -> Dict[str, Any]:
    """
    Module D: Social Skills - 'Say It Better' Communication Transformation.
    Generates three distinct communication styles:
    - Polite: Respectful, considerate, gentle
    - Professional: Workplace-appropriate, objective, solution-focused
    - Friendly: Warm, collaborative, empathetic
    Preserves the user's core intent without escalating conflict.
    """
    clean_str = user_text.strip()
    lower = clean_str.lower()

    # Rule 1: Teammate / Work completion blame
    if (any(k in lower for k in ['teammate', 'colleague', 'coworker', 'partner']) or 'you never do' in lower or 'never do your work' in lower or 'never completes' in lower) and \
       any(k in lower for k in ['never', 'completes their work', "doesn't do", 'lazy', 'tired of dealing', 'finish', 'work']):
        styles = {
            'polite': "I feel concerned because the agreed work hasn't been completed. Could we please take a moment to discuss how we can divide the remaining tasks?",
            'professional': "I'd like to follow up on our project milestones, as several deliverables remain outstanding. Let's align on an updated task distribution to ensure we meet our deadline.",
            'friendly': "Hey, I've been feeling a bit overwhelmed trying to cover everything. Can we sync up for a few minutes and split up the remaining tasks together?"
        }
        strategy = "Constructive I-Statement & Collaborative Task Division"
        ei_principle = "Replaces accusatory 'you never' phrasing with an objective description of impact and an actionable way forward."

    # Rule 2: Assignment / Academic overload
    elif any(k in lower for k in ['assignment', 'project', 'paper', 'homework']) and \
         any(k in lower for k in ["don't know where to start", 'lost', 'stuck', 'overwhelmed', 'no idea']):
        styles = {
            'polite': "I am feeling quite overwhelmed by the scope of this assignment. Would it be possible to get some guidance on the initial milestone?",
            'professional': "To ensure high quality on this project, I'd like to clarify the initial requirements and break them down into structured phases.",
            'friendly': "I'm feeling a bit stuck on where to kick this off. Could we brainstorm the first couple of steps together?"
        }
        strategy = "Milestone Chunking & Proactive Support Request"
        ei_principle = "Transforms helpless avoidance into structured problem-solving and clear self-advocacy."

    # Rule 3: Extreme anger / Emotional flooding
    elif any(k in lower for k in ['extremely angry', 'so angry', 'pissed off', 'furious', 'hate dealing', 'tired of you']):
        styles = {
            'polite': "I am experiencing significant frustration right now. I'd appreciate taking a short break so we can revisit this discussion calmly.",
            'professional': "I believe it would be most productive to pause our discussion momentarily and reconvene once we've both had time to process the key points objectively.",
            'friendly': "I'm feeling really heated right now and don't want to say something harsh. Let's take a quick breather and talk in a bit."
        }
        strategy = "Emotional Boundary Setting & Responsible Self-Regulation"
        ei_principle = "Communicates emotional intensity while protecting the relationship through responsible pacing rather than verbal escalation."

    # Rule 4: Fear of the future / Career anxiety
    elif any(k in lower for k in ['future', 'career', 'path']) and any(k in lower for k in ['scared', 'afraid', 'worried', 'terrified', 'anxious']):
        styles = {
            'polite': "I am feeling quite uncertain about my future path, and I would value some perspective on how to take steady, manageable steps forward.",
            'professional': "I am currently assessing my upcoming milestones and looking to define 2 or 3 strategic priorities to navigate upcoming uncertainties effectively.",
            'friendly': "I've been feeling really anxious about what lies ahead. I'd love to chat and get some grounded advice on taking things one step at a time."
        }
        strategy = "Action-Oriented Sphere-of-Control Reframing"
        ei_principle = "Validates anxiety without catastrophizing, shifting cognitive energy toward actionable sphere-of-influence items."

    # Rule 5: Loneliness / Social isolation
    elif any(k in lower for k in ['lonely', 'alone', 'isolated', 'nobody cares', 'no one understands']):
        styles = {
            'polite': "I've been feeling rather isolated lately and would deeply appreciate catching up if you have some time.",
            'professional': "I am currently finding the workload somewhat isolating, and would appreciate scheduling a brief check-in to touch base.",
            'friendly': "Hey, I've been feeling pretty lonely today and could really use some warm connection. Are you free to catch up for a few minutes?"
        }
        strategy = "Vulnerable & Healthy Reconnection Request"
        ei_principle = "Replaces internal withdrawal with direct, vulnerable self-expression that invites genuine social connection."

    # Rule 6: General conflict / Assertive template
    else:
        # Convert accusatory patterns into I-statements
        rephrased = re.sub(r'\b(you always|you never)\b', 'it often feels like', clean_str, flags=re.IGNORECASE)
        rephrased = re.sub(r'\b(you need to|you must)\b', 'could we please', rephrased, flags=re.IGNORECASE)
        styles = {
            'polite': f"I feel concerned regarding this situation. Would you be open to discussing how we can resolve this together respectfully?",
            'professional': f"I would like to address this matter directly so we can align on clear expectations and a constructive solution moving forward.",
            'friendly': f"Hey, I wanted to talk through what happened so we're on the same page and can work it out together."
        }
        strategy = "Constructive I-Statement & Solution Focus"
        ei_principle = "Reframes emotional discomfort into clear personal accountability and an invitation for open dialogue."

    suggested_text = styles.get(preferred_style.lower(), styles['polite'])

    return {
        'original_text': clean_str,
        'suggested_text': suggested_text,
        'selected_style': preferred_style.lower(),
        'all_styles': styles,
        'strategy': strategy,
        'ei_principle': ei_principle
    }
