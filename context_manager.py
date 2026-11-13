"""
ECHO 2.0 - Emotionally Intelligent Voice Companion
Module: context_manager.py
Purpose: Lightweight, in-memory, privacy-first conversational context engine.
Handles multi-turn dialogue, entity/topic tracking, user emotion confirmation feedback,
and session-level emotional intelligence analytics.
"""

import time
import re
from typing import Dict, List, Optional, Any


class ConversationTurn:
    def __init__(self, role: str, text: str, emotion: Optional[str] = None, confidence: Optional[float] = None, topic: Optional[str] = None):
        self.role = role  # 'user' or 'echo'
        self.text = text
        self.emotion = emotion
        self.confidence = confidence
        self.topic = topic
        self.timestamp = time.time()


class SessionState:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.created_at = time.time()
        self.last_active = time.time()
        self.turns: List[ConversationTurn] = []
        self.max_history = 12  # Bounded history for privacy & lightness
        
        # Track active topic and named entities across turns
        self.active_topic: Optional[str] = None
        self.active_entities: List[str] = []
        
        # User feedback & emotion confirmation tracking
        self.feedback_history: List[Dict[str, Any]] = []
        
        # Emotion counts (predicted vs confirmed)
        self.predicted_counts: Dict[str, int] = {
            'sadness': 0, 'joy': 0, 'love': 0, 'anger': 0, 'fear': 0, 'surprise': 0
        }
        self.confirmed_counts: Dict[str, int] = {
            'sadness': 0, 'joy': 0, 'love': 0, 'anger': 0, 'fear': 0, 'surprise': 0
        }

    def touch(self):
        self.last_active = time.time()

    def add_turn(self, role: str, text: str, emotion: Optional[str] = None, confidence: Optional[float] = None, topic: Optional[str] = None):
        self.touch()
        turn = ConversationTurn(role, text, emotion, confidence, topic)
        self.turns.append(turn)
        if len(self.turns) > self.max_history:
            self.turns.pop(0)

        if role == 'user' and emotion and emotion in self.predicted_counts:
            self.predicted_counts[emotion] += 1

        if topic and topic != 'general':
            self.active_topic = topic

    def extract_and_update_entities(self, text: str):
        """Extract key conversational anchors (e.g. interview, exam, teammate, mom)."""
        t = text.lower()
        anchors = [
            'interview', 'exam', 'test', 'assignment', 'presentation', 'deadline', 'job',
            'teammate', 'colleague', 'boss', 'friend', 'partner', 'mother', 'mom', 'father',
            'dad', 'family', 'project', 'meeting', 'future', 'college', 'school', 'results'
        ]
        found = [a for a in anchors if re.search(r'\b' + re.escape(a) + r'\b', t)]
        if found:
            for item in found:
                if item not in self.active_entities:
                    self.active_entities.append(item)
            # Keep only the last 4 key entities
            self.active_entities = self.active_entities[-4:]

    def resolve_contextual_references(self, current_text: str) -> Dict[str, Any]:
        """
        Detects if current text refers to previous turns using pronouns like 'it', 'that', 'this',
        and maps them to prior conversation entities (e.g., 'interview', 'presentation').
        """
        t = current_text.lower()
        has_anaphora = bool(re.search(r'\b(it|that|this|the whole thing|doing this)\b', t))
        
        referenced_entity = None
        if has_anaphora and self.active_entities:
            referenced_entity = self.active_entities[-1]
            
        return {
            'has_anaphora': has_anaphora,
            'referenced_entity': referenced_entity,
            'active_topic': self.active_topic,
            'recent_entities': list(self.active_entities)
        }

    def record_feedback(self, predicted: str, user_confirmed: str, is_accurate: bool):
        self.touch()
        self.feedback_history.append({
            'predicted_emotion': predicted,
            'user_confirmed_emotion': user_confirmed,
            'is_accurate': is_accurate,
            'timestamp': time.time()
        })
        if user_confirmed in self.confirmed_counts:
            self.confirmed_counts[user_confirmed] += 1

    def get_session_insights(self) -> Dict[str, Any]:
        """Generate comprehensive session analytics distinguishing predictions from user confirmations."""
        total_analyzed = sum(self.predicted_counts.values())
        total_feedback = len(self.feedback_history)
        accurate_count = sum(1 for fb in self.feedback_history if fb.get('is_accurate'))
        accuracy_rate = round((accurate_count / total_feedback * 100), 1) if total_feedback > 0 else None

        # Dominant predicted emotion
        dominant_predicted = "None"
        max_p = 0
        for em, c in self.predicted_counts.items():
            if c > max_p:
                max_p = c
                dominant_predicted = em

        # Dominant user-confirmed emotion
        dominant_confirmed = "None"
        max_c = 0
        for em, c in self.confirmed_counts.items():
            if c > max_c:
                max_c = c
                dominant_confirmed = em

        return {
            'session_id': self.session_id,
            'total_messages_analyzed': total_analyzed,
            'predicted_distribution': dict(self.predicted_counts),
            'dominant_predicted_emotion': dominant_predicted,
            'user_confirmed_distribution': dict(self.confirmed_counts),
            'dominant_confirmed_emotion': dominant_confirmed,
            'feedback_count': total_feedback,
            'user_confirmation_rate': accuracy_rate,
            'active_topic': self.active_topic or 'General Exploration',
            'tracked_entities': list(self.active_entities),
            'total_turns': len(self.turns),
            'disclaimer': (
                "Notice: Session insights represent conversational linguistic cues and user self-reports "
                "within the current session. They do not constitute a medical, psychiatric, or diagnostic assessment."
            )
        }


class ContextManager:
    """Singleton-style in-memory manager for active sessions."""
    def __init__(self):
        self.sessions: Dict[str, SessionState] = {}

    def get_or_create_session(self, session_id: Optional[str] = None) -> SessionState:
        if not session_id:
            session_id = f"session_{int(time.time() * 1000)}"
        if session_id not in self.sessions:
            self.sessions[session_id] = SessionState(session_id)
        return self.sessions[session_id]

    def reset_session(self, session_id: str) -> SessionState:
        """Reset or clear session history while preserving session ID."""
        self.sessions[session_id] = SessionState(session_id)
        return self.sessions[session_id]

    def prune_idle_sessions(self, max_idle_seconds: int = 7200):
        """Remove sessions idle for over 2 hours for privacy & memory cleanliness."""
        now = time.time()
        to_del = [sid for sid, s in self.sessions.items() if (now - s.last_active) > max_idle_seconds]
        for sid in to_del:
            del self.sessions[sid]


# Global Context Manager Instance
context_manager = ContextManager()

