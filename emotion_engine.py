"""
ECHO 2.0 - Emotionally Intelligent Voice Companion
Module: emotion_engine.py
Purpose: Advanced Emotion Classification Engine with Negation Handling,
Feature Attribution (Linguistic Cues), Uncertainty Calibration, and Crisis Detection.
"""

import os
import re
import joblib
import numpy as np
from typing import Dict, List, Any, Optional

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, 'models')

MODEL_PATH = os.path.join(MODELS_DIR, 'emotion_classifier.joblib')
VECTORIZER_PATH = os.path.join(MODELS_DIR, 'tfidf_vectorizer.joblib')

LABEL_NAMES = ['sadness', 'joy', 'love', 'anger', 'fear', 'surprise']

# Emotion metadata for UI accents and semantic icons
EMOTION_META = {
    'sadness': {
        'icon': '🌧️',
        'color': '#3b82f6',
        'display_name': 'Sadness',
        'summary': 'Expressions of sorrow, loneliness, grief, exhaustion, or discouragement.'
    },
    'joy': {
        'icon': '✨',
        'color': '#f59e0b',
        'display_name': 'Joy',
        'summary': 'Expressions of happiness, satisfaction, excitement, or gratitude.'
    },
    'love': {
        'icon': '💖',
        'color': '#ec4899',
        'display_name': 'Love',
        'summary': 'Expressions of affection, caring, warmth, or deep appreciation.'
    },
    'anger': {
        'icon': '🔥',
        'color': '#ef4444',
        'display_name': 'Anger',
        'summary': 'Expressions of frustration, resentment, irritation, or betrayal.'
    },
    'fear': {
        'icon': '⚡',
        'color': '#8b5cf6',
        'display_name': 'Fear',
        'summary': 'Expressions of anxiety, worry, panic, or uncertainty.'
    },
    'surprise': {
        'icon': '🌟',
        'color': '#06b6d4',
        'display_name': 'Surprise',
        'summary': 'Expressions of astonishment, unexpected discovery, or novelty.'
    }
}

_model = None
_vectorizer = None


def get_model():
    """Load and cache the trained logistic regression classifier."""
    global _model
    if _model is None:
        if os.path.exists(MODEL_PATH):
            _model = joblib.load(MODEL_PATH)
        else:
            raise FileNotFoundError(
                f"Model file not found at {MODEL_PATH}. Please run `python train_model.py` first."
            )
    return _model


def get_vectorizer():
    """Load and cache the trained TF-IDF vectorizer."""
    global _vectorizer
    if _vectorizer is None:
        if os.path.exists(VECTORIZER_PATH):
            _vectorizer = joblib.load(VECTORIZER_PATH)
        else:
            raise FileNotFoundError(
                f"Vectorizer file not found at {VECTORIZER_PATH}. Please run `python train_model.py` first."
            )
    return _vectorizer


def check_model_availability() -> bool:
    """Check if model and vectorizer exist on disk."""
    return os.path.exists(MODEL_PATH) and os.path.exists(VECTORIZER_PATH)


def clean_text(text: str) -> str:
    """Normalize input text for vectorization."""
    if not isinstance(text, str):
        return ""
    text = text.strip()
    text = re.sub(r'\s+', ' ', text)
    return text


def detect_crisis_signals(text: str) -> bool:
    """
    Detects if the user expresses immediate danger, self-harm, or severe crisis.
    Safety First: ECHO does not substitute professional mental healthcare or emergency services.
    """
    t = text.lower()
    crisis_patterns = [
        r'\b(kill myself|commit suicide|end my life|want to die|ending it all)\b',
        r'\b(hurt myself|self harm|hang myself|take my own life)\b',
        r'\b(no reason to live|better off dead|want to disappear forever)\b'
    ]
    for pattern in crisis_patterns:
        if re.search(pattern, t):
            return True
    return False


def apply_negation_heuristics(text: str) -> Dict[str, Any]:
    """
    Identifies explicit negations (e.g. 'not happy', 'never felt worse', 'not angry')
    that can invert or complicate conventional bag-of-words classifications.
    """
    t = text.lower()
    negation_detected = False
    inferred_shift = None

    if re.search(r'\b(not happy|not feeling good|never felt so sad|not joyful|unhappy)\b', t):
        negation_detected = True
        inferred_shift = 'sadness'
    elif re.search(r'\b(not scared|no longer afraid|not worried)\b', t):
        negation_detected = True
        inferred_shift = 'joy'
    elif re.search(r'\b(not angry|not mad|no longer frustrated)\b', t):
        negation_detected = True
        inferred_shift = 'sadness'

    return {
        'negation_detected': negation_detected,
        'inferred_shift': inferred_shift
    }


def extract_linguistic_cues(text: str, predicted_emotion: str, top_k: int = 4) -> List[str]:
    """
    Identifies which specific words/n-grams in the user's sentence
    contributed most positively to the predicted emotion class using the Logistic Regression coefficients.
    """
    try:
        classifier = get_model()
        vectorizer = get_vectorizer()

        target_idx = LABEL_NAMES.index(predicted_emotion)
        feature_names = vectorizer.get_feature_names_out()
        coefs = classifier.coef_[target_idx]

        # Analyze matching tokens from user text
        words = re.findall(r'\b[a-zA-Z]{2,}\b', text.lower())
        cues = []

        # Check 1-grams and 2-grams present in text
        for i in range(len(words)):
            unigram = words[i]
            if unigram in vectorizer.vocabulary_:
                idx = vectorizer.vocabulary_[unigram]
                weight = coefs[idx]
                if weight > 0:
                    cues.append((unigram, weight))
            if i < len(words) - 1:
                bigram = f"{words[i]} {words[i+1]}"
                if bigram in vectorizer.vocabulary_:
                    idx = vectorizer.vocabulary_[bigram]
                    weight = coefs[idx]
                    if weight > 0:
                        cues.append((bigram, weight))

        # Sort by positive weight
        cues = sorted(cues, key=lambda x: x[1], reverse=True)
        # Deduplicate while preserving order
        seen = set()
        unique_cues = []
        for word, _ in cues:
            if word not in seen:
                seen.add(word)
                unique_cues.append(word)
            if len(unique_cues) >= top_k:
                break

        return unique_cues or words[:3]
    except Exception:
        # Fallback to key meaningful words
        tokens = [w for w in re.findall(r'\b[a-zA-Z]{3,}\b', text.lower()) if w not in {'the', 'and', 'with', 'this', 'that', 'have'}]
        return tokens[:top_k]


def predict_emotion(
    text: str,
    low_confidence_threshold: float = 0.38,
    user_confirmed_emotion: Optional[str] = None
) -> Dict[str, Any]:
    """
    Full inference pipeline for emotion prediction:
    - Preprocessing & sanitation
    - Crisis check
    - TF-IDF feature extraction
    - Probability distribution
    - Negation handling
    - Linguistic cue extraction
    - Alternative predictions
    """
    text_clean = clean_text(text)
    if not text_clean:
        return {
            'error': 'Empty input text provided.',
            'predicted_emotion': None
        }

    # 1. Crisis Check
    is_crisis = detect_crisis_signals(text_clean)

    # 2. Vectorization & Prediction
    classifier = get_model()
    vectorizer = get_vectorizer()

    X_vec = vectorizer.transform([text_clean])
    probabilities = classifier.predict_proba(X_vec)[0]

    # Convert to standard Python floats
    prob_list = [float(p) for p in probabilities]
    best_idx = int(np.argmax(prob_list))
    best_emotion = LABEL_NAMES[best_idx]
    confidence = prob_list[best_idx]

    # Negation heuristic refinement
    negation_info = apply_negation_heuristics(text_clean)
    if negation_info['negation_detected'] and negation_info['inferred_shift']:
        # If strong negation was detected and shifts meaning, adjust primary emotion
        best_emotion = negation_info['inferred_shift']
        confidence = max(0.55, confidence)

    # If user previously confirmed an emotion for this current thought
    if user_confirmed_emotion and user_confirmed_emotion in LABEL_NAMES:
        best_emotion = user_confirmed_emotion

    # Sort all probabilities
    all_scores = {
        LABEL_NAMES[i]: round(prob_list[i] * 100, 2)
        for i in range(len(LABEL_NAMES))
    }

    # Top Alternatives (excluding primary emotion)
    sorted_pairs = sorted(
        [(LABEL_NAMES[i], prob_list[i]) for i in range(len(LABEL_NAMES)) if LABEL_NAMES[i] != best_emotion],
        key=lambda x: x[1],
        reverse=True
    )
    top_alternatives = [
        {
            'emotion': emo,
            'display_name': EMOTION_META[emo]['display_name'],
            'score': round(score, 4),
            'percentage': f"{round(score * 100, 1)}%"
        }
        for emo, score in sorted_pairs[:2]
    ]

    # Confidence & Uncertainty Classification
    sorted_probs = sorted(prob_list, reverse=True)
    margin = float(sorted_probs[0] - sorted_probs[1])

    if confidence < low_confidence_threshold:
        classification_status = 'low_confidence'
    elif margin < 0.12 and confidence < 0.48:
        classification_status = 'ambiguous'
    else:
        classification_status = 'confident'

    is_low_confidence = bool(classification_status != 'confident')

    # Linguistic Cues
    linguistic_cues = extract_linguistic_cues(text_clean, best_emotion)

    # Strategy recommendation according to EI module
    ei_strategies = {
        'sadness': 'Emotional validation & gentle grounding questions (Self-Regulation & Empathy)',
        'joy': 'Celebration, savoring & positive reinforcement (Self-Awareness & Social Connection)',
        'love': 'Relational gratitude & appreciative reflection (Social Skills & Empathy)',
        'anger': 'Pause before reacting, boundary reflection & non-confrontational reframing (Self-Regulation)',
        'fear': 'Somatic grounding, breaking overwhelming tasks & reassurance (Self-Regulation)',
        'surprise': 'Cognitive adaptability, exploratory curiosity & open perspective (Self-Awareness)'
    }

    linguistic_explanation = (
        "This prediction is derived from linguistic cues, vocabulary patterns, and syntactic markers "
        "present in your text. It represents automated textual classification, not an internal psychological "
        "or diagnostic evaluation."
    )

    return {
        'input_text': text_clean,
        'predicted_emotion': best_emotion,
        'display_name': EMOTION_META[best_emotion]['display_name'],
        'icon': EMOTION_META[best_emotion]['icon'],
        'color': EMOTION_META[best_emotion]['color'],
        'confidence_score': round(confidence, 4),
        'confidence_percentage': f"{confidence * 100:.1f}%",
        'classification_status': classification_status,
        'is_low_confidence': is_low_confidence,
        'is_crisis': is_crisis,
        'top_alternatives': top_alternatives,
        'all_scores': all_scores,
        'linguistic_cues': linguistic_cues,
        'suggested_strategy': ei_strategies.get(best_emotion, 'Supportive exploration'),
        'linguistic_explanation': linguistic_explanation
    }
