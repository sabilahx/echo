// src/components/MessageList.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Wind, HeartHandshake, Mic, Volume2, Square, Sparkles, HelpCircle } from 'lucide-react';
import type { AIMessage, EmotionCategory } from '../services/types.ts';
import './MessageList.css';

interface MessageListProps {
  messages: AIMessage[];
  isThinking: boolean;
  onTriggerGrounding?: () => void;
  onCorrectEmotion?: (messageId: string, correctedEmotion: EmotionCategory) => void;
  onSpeakMessage?: (text: string, voiceSpec?: any) => void;
  onStopSpeech?: () => void;
  isSpeaking?: boolean;
}

const SEVEN_EMOTIONS: EmotionCategory[] = [
  'Happy', 'Sad', 'Angry', 'Anxious', 'Frustrated', 'Confused', 'Neutral'
];

export const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  isThinking, 
  onTriggerGrounding,
  onCorrectEmotion,
  onSpeakMessage,
  onStopSpeech,
  isSpeaking = false
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [activeSpeakingMsgId, setActiveSpeakingMsgId] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleToggleSpeak = (msg: AIMessage) => {
    if (activeSpeakingMsgId === msg.id && isSpeaking) {
      if (onStopSpeech) onStopSpeech();
      setActiveSpeakingMsgId(null);
    } else {
      if (onSpeakMessage) {
        onSpeakMessage(msg.content, msg.emotion?.recommendedVoice);
        setActiveSpeakingMsgId(msg.id);
      }
    }
  };

  return (
    <div className="message-list-container">
      {messages.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon-halo">
            <HeartHandshake size={32} className="empty-heart-icon" />
          </div>
          <h3>Emotionally Intelligent Companion</h3>
          <p className="empty-subtitle">
            Speak or type naturally. ECHO listens without judgment and responds with attuned emotional intelligence.
          </p>
          <div className="empty-guide-chips">
            <span className="guide-chip"><Mic size={12} /> Tap mic to speak</span>
            <span className="guide-chip"><Sparkles size={12} /> 7 Emotion Classes</span>
            <span className="guide-chip"><Wind size={12} /> Box-breathing support</span>
          </div>
        </div>
      ) : (
        <div className="messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-wrapper ${msg.role}`}>
              {msg.role === 'agent' && <div className="avatar agent-avatar">ECHO</div>}
              
              <div className="message-content-group">
                {/* User Emotional Detection Tag */}
                {msg.role === 'user' && msg.emotion && (
                  <div className="emotion-detected-tag">
                    <div className="emotion-tag-header">
                      <span className="emotion-name">
                        {msg.emotion.isAmbiguous 
                          ? (msg.emotion.contextualSituation || 'Interpersonal Dynamic') 
                          : msg.emotion.primaryEmotion}
                      </span>
                      <span className={`emotion-confidence ${msg.emotion.isAmbiguous ? 'ambiguous' : ''}`}>
                        {msg.emotion.confidencePercentage}
                      </span>
                    </div>

                    {/* Low Confidence Clarification Prompt */}
                    {msg.emotion.needsClarification && !msg.emotion.isUserCorrected && !msg.emotion.isAmbiguous && (
                      <div className="clarification-prompt-box">
                        <HelpCircle size={12} className="clarify-icon" />
                        <span>Did you mean:</span>
                        <div className="clarify-chips">
                          {SEVEN_EMOTIONS.filter(e => e !== msg.emotion?.primaryEmotion).slice(0, 3).map((emo) => (
                            <button
                              key={emo}
                              type="button"
                              className="btn-clarify-chip"
                              onClick={() => onCorrectEmotion && onCorrectEmotion(msg.id, emo)}
                            >
                              {emo}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="message-bubble">
                  {msg.content}
                </div>

                {/* Agent Action Bar */}
                {msg.role === 'agent' && (
                  <div className="message-action-bar">
                    <button 
                      type="button"
                      className="msg-action-btn"
                      onClick={() => handleToggleSpeak(msg)}
                      title="Audio voice playback"
                    >
                      {activeSpeakingMsgId === msg.id && isSpeaking ? (
                        <>
                          <Square size={11} className="stop-icon" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Volume2 size={11} />
                          <span>Listen</span>
                        </>
                      )}
                    </button>

                    {msg.groundingExerciseSuggested && (
                      <button 
                        type="button"
                        className="msg-action-btn grounding-btn"
                        onClick={onTriggerGrounding}
                      >
                        <Wind size={11} />
                        <span>Breathe (4-4-4-4)</span>
                      </button>
                    )}
                  </div>
                )}

                <span className="timestamp">{msg.timestamp}</span>
              </div>

              {msg.role === 'user' && <div className="avatar user-avatar">YOU</div>}
            </div>
          ))}

          {isThinking && (
            <div className="message-wrapper agent">
              <div className="avatar agent-avatar">ECHO</div>
              <div className="message-content-group">
                <div className="message-bubble thinking-bubble">
                  <div className="typing-dots">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
};
