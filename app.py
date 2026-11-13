"""
ECHO 2.0 - Emotionally Intelligent Voice Companion
Module: app.py
Purpose: Main Flask Application & Comprehensive REST API
Endpoints:
- POST /analyze
- POST /say-it-better
- POST /feedback
- POST /session/reset
- GET /session/insights
- GET /health
- GET /api/speech-config
- GET /
"""

import os
import json
import logging
from flask import Flask, render_template, request, jsonify, send_from_directory

from emotion_engine import (
    predict_emotion,
    check_model_availability,
    EMOTION_META
)
from response_engine import (
    generate_empathetic_response,
    say_it_better,
    detect_context_topic
)
from context_manager import context_manager
from speech_handler import prepare_for_tts, sanitize_speech_transcript, get_speech_config

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

app = Flask(
    __name__,
    template_folder='templates',
    static_folder='static'
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RESULTS_DIR = os.path.join(BASE_DIR, 'results')


@app.route('/')
def index():
    """Render main ECHO voice companion interface."""
    model_ready = check_model_availability()
    return render_template('index.html', model_ready=model_ready, emotion_meta=EMOTION_META)


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint: verifies service status and model availability."""
    model_ready = check_model_availability()
    return jsonify({
        'status': 'healthy' if model_ready else 'degraded',
        'service': 'ECHO 2.0 Emotionally Intelligent Voice Companion',
        'version': '2.0.0',
        'model_available': model_ready,
        'message': (
            'All systems operational. Emotion classification model loaded.'
            if model_ready
            else 'Model artifacts not found. Please run `python train_model.py` to train.'
        )
    }), 200 if model_ready else 503


@app.route('/analyze', methods=['POST'])
def analyze():
    """
    POST /analyze
    Receives user message and session_id, runs emotion classification,
    resolves conversational context, and returns empathetic guidance.
    """
    try:
        data = request.get_json(silent=True)
        if not data or 'text' not in data:
            return jsonify({'error': 'Missing required "text" field in JSON body.'}), 400

        raw_text = str(data.get('text', '')).strip()
        if not raw_text:
            return jsonify({'error': 'Input text cannot be empty.'}), 400

        session_id = data.get('session_id') or "default_session"
        user_confirmed_emotion = data.get('user_confirmed_emotion', None)

        sanitized_text = sanitize_speech_transcript(raw_text)

        # Ensure model is trained and available
        if not check_model_availability():
            return jsonify({
                'error': 'Emotion model not yet trained. Run `python train_model.py` to train the classifier.'
            }), 503

        # 1. Retrieve or initialize Session Context
        session = context_manager.get_or_create_session(session_id)
        session.extract_and_update_entities(sanitized_text)
        context_resolution = session.resolve_contextual_references(sanitized_text)

        # 2. Run Emotion Prediction Pipeline
        prediction = predict_emotion(
            sanitized_text,
            low_confidence_threshold=0.38,
            user_confirmed_emotion=user_confirmed_emotion
        )

        if prediction.get('error'):
            return jsonify({'error': prediction['error']}), 400

        emotion = prediction['predicted_emotion']
        confidence = prediction['confidence_score']
        is_low_confidence = prediction['is_low_confidence']
        is_crisis = prediction.get('is_crisis', False)

        # 3. Generate Empathetic Response with Context Awareness
        response_data = generate_empathetic_response(
            sanitized_text,
            emotion,
            confidence,
            context_info=context_resolution,
            is_low_confidence=is_low_confidence,
            is_crisis=is_crisis
        )

        empathetic_response = response_data['response']
        reflection_prompt = response_data['reflection']
        suggest_breathing = response_data['suggest_breathing']
        strategy = response_data['strategy']

        # 4. Generate "Say It Better" multi-style variations
        say_better = say_it_better(sanitized_text, emotion, preferred_style="polite")

        # 5. Format for Speech Synthesis (clean pauses, remove asterisks)
        tts_text = prepare_for_tts(empathetic_response)

        # 6. Record turn in session context
        current_topic = detect_context_topic(sanitized_text)
        session.add_turn(
            role='user',
            text=sanitized_text,
            emotion=emotion,
            confidence=confidence,
            topic=current_topic
        )
        session.add_turn(
            role='echo',
            text=empathetic_response,
            emotion=emotion,
            confidence=confidence,
            topic=current_topic
        )

        # 7. Confirmation prompt for Self-Awareness Module
        cues_str = ", ".join(prediction['linguistic_cues'][:2]) if prediction['linguistic_cues'] else "word choices"
        confirmation_prompt = f"Linguistic cues ({cues_str}) suggest {prediction['display_name']}. Does that describe how you're feeling?"

        response_payload = {
            'status': 'success',
            'session_id': session.session_id,
            'input_text': sanitized_text,
            'emotion': emotion,
            'confidence': confidence,
            'confidence_percentage': prediction['confidence_percentage'],
            'alternatives': prediction['top_alternatives'],
            'classification_status': prediction['classification_status'],
            'is_low_confidence': is_low_confidence,
            'is_crisis': is_crisis,
            'linguistic_cues': prediction['linguistic_cues'],
            'response': empathetic_response,
            'tts_text': tts_text,
            'reflection': reflection_prompt,
            'strategy': strategy,
            'suggest_breathing': suggest_breathing,
            'context_topic': current_topic,
            'referenced_entity': context_resolution.get('referenced_entity'),
            'say_it_better': say_better,
            'confirmation_prompt': confirmation_prompt,
            'prediction': prediction,
            'disclaimer': (
                "Notice: ECHO's emotion detection identifies linguistic cues in word choice and phrasing. "
                "It is designed to support emotional awareness, not to diagnose or define your internal mental state."
            )
        }

        return jsonify(response_payload), 200

    except Exception as e:
        logging.exception("Error processing /analyze request")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500


@app.route('/say-it-better', methods=['POST'])
def say_it_better_endpoint():
    """
    POST /say-it-better
    Generates polite, professional, and friendly communication alternatives.
    """
    try:
        data = request.get_json(silent=True)
        if not data or 'text' not in data:
            return jsonify({'error': 'Missing required "text" field in JSON body.'}), 400

        text = str(data.get('text', '')).strip()
        emotion = data.get('emotion', None)
        style = data.get('style', 'polite')

        if not text:
            return jsonify({'error': 'Input text cannot be empty.'}), 400

        result = say_it_better(text, emotion=emotion, preferred_style=style)
        return jsonify({
            'status': 'success',
            'result': result
        }), 200

    except Exception as e:
        logging.exception("Error processing /say-it-better request")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500


@app.route('/feedback', methods=['POST'])
def record_feedback():
    """
    POST /feedback
    Records user feedback regarding emotion accuracy (Module A: Self-Awareness).
    Treated as user experience feedback, not automatic ground truth.
    """
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({'error': 'Empty request body.'}), 400

        session_id = data.get('session_id') or "default_session"
        predicted = data.get('predicted_emotion', 'unknown')
        user_confirmed = data.get('user_confirmed_emotion', predicted)
        is_accurate = bool(data.get('is_accurate', True))

        session = context_manager.get_or_create_session(session_id)
        session.record_feedback(predicted, user_confirmed, is_accurate)

        return jsonify({
            'status': 'success',
            'message': 'User emotion feedback recorded successfully.',
            'session_id': session.session_id,
            'is_accurate': is_accurate,
            'user_confirmed_emotion': user_confirmed
        }), 200

    except Exception as e:
        logging.exception("Error processing /feedback request")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500


@app.route('/session/reset', methods=['POST'])
def reset_session():
    """
    POST /session/reset
    Clears the current conversation memory and resets session metrics.
    """
    try:
        data = request.get_json(silent=True) or {}
        session_id = data.get('session_id') or "default_session"
        new_session = context_manager.reset_session(session_id)

        return jsonify({
            'status': 'success',
            'message': 'Session history and context reset successfully.',
            'session_id': new_session.session_id
        }), 200

    except Exception as e:
        logging.exception("Error processing /session/reset request")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500


@app.route('/session/insights', methods=['GET'])
def session_insights():
    """
    GET /session/insights?session_id=...
    Returns comprehensive session-level emotion statistics, user corrections,
    and conversational topic trajectory.
    """
    try:
        session_id = request.args.get('session_id', 'default_session')
        session = context_manager.get_or_create_session(session_id)
        insights = session.get_session_insights()
        return jsonify({
            'status': 'success',
            'insights': insights
        }), 200

    except Exception as e:
        logging.exception("Error processing /session/insights request")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500


@app.route('/api/speech-config', methods=['GET'])
def speech_config():
    """Return speech recognition and synthesis settings with en-IN default."""
    return jsonify(get_speech_config()), 200


@app.route('/api/results/<path:filename>')
def serve_results(filename):
    """Serve evaluation charts from results directory."""
    return send_from_directory(RESULTS_DIR, filename)


if __name__ == '__main__':
    logging.info("Starting ECHO 2.0 Emotionally Intelligent Voice Companion on http://127.0.0.1:5000 ...")
    app.run(host='127.0.0.1', port=5000, debug=False)
