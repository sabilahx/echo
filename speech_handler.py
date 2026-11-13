"""
ECHO 2.0 - Emotionally Intelligent Voice Companion
Module: speech_handler.py
Purpose: Utilities for Web Speech API and SpeechSynthesis with English (India) voice locale defaults,
transcript sanitization, and phonetic cadence formatting.
"""

import re
from typing import Dict, Any


def prepare_for_tts(text: str) -> str:
    """
    Sanitize and optimize text for browser SpeechSynthesis API.
    Expands common abbreviations, removes asterisks/markdown, and ensures gentle, natural pacing.
    """
    if not text:
        return ""

    tts_text = text.strip()

    # Remove markdown formatting like bold, bullet points, asterisks
    tts_text = re.sub(r'[*_~`#]+', '', tts_text)
    tts_text = re.sub(r'•\s*', ', ', tts_text)

    # Expand abbreviations
    abbreviations = {
        r'\be\.g\.\b': 'for example',
        r'\bi\.e\.\b': 'that is',
        r'\betc\.\b': 'etcetera',
        r'\bw/o\b': 'without',
        r'\bw/\b': 'with',
        r'\bvs\.\b': 'versus',
        r'\bapprox\.\b': 'approximately',
    }

    for pattern, replacement in abbreviations.items():
        tts_text = re.sub(pattern, replacement, tts_text, flags=re.IGNORECASE)

    # Normalize excessive spaces and linebreaks
    tts_text = re.sub(r'[\r\n]+', ', ', tts_text)
    tts_text = re.sub(r'\s+', ' ', tts_text)

    # Soften ellipses for TTS pauses
    tts_text = tts_text.replace('...', ', ')

    return tts_text


def sanitize_speech_transcript(transcript: str) -> str:
    """
    Clean raw speech recognition input from Web Speech API.
    Normalizes spacing and capitalizes the first letter.
    """
    if not transcript:
        return ""

    cleaned = transcript.strip()
    cleaned = re.sub(r'\s+', ' ', cleaned)

    if len(cleaned) > 1:
        cleaned = cleaned[0].upper() + cleaned[1:]

    return cleaned


def get_speech_config() -> Dict[str, Any]:
    """
    Return recommended SpeechSynthesis and Web Speech API configuration metadata.
    Configured with English (India) [en-IN] as the initial voice locale.
    """
    return {
        'recognition': {
            'lang': 'en-IN',          # Initial voice locale: English (India)
            'continuous': False,
            'interimResults': True,
            'maxAlternatives': 1
        },
        'synthesis': {
            'lang': 'en-IN',
            'default_rate': 0.95,       # Slightly gentle, calm pace for emotional resonance
            'default_pitch': 1.0,      # Natural pitch
            'default_volume': 1.0,
            'preferred_voices': [
                'Google हिन्दी',
                'Microsoft Heera - English (India)',
                'Microsoft Ravi - English (India)',
                'Google UK English Female',
                'Google US English',
                'Samantha',
                'Zira'
            ]
        },
        'browser_support': {
            'webkitSpeechRecognition': 'Supported in Google Chrome, Microsoft Edge, Brave, and Safari.',
            'speechSynthesis': 'Supported across modern desktop and mobile browsers.'
        }
    }
