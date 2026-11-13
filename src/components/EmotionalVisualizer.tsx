// src/components/EmotionalVisualizer.tsx
import React, { useState, useEffect } from 'react';
import { Wind, X, Heart, Sparkles } from 'lucide-react';
import type { PipelineState, EmotionAnalysis } from '../services/types.ts';
import './EmotionalVisualizer.css';

interface EmotionalVisualizerProps {
  state: PipelineState;
  currentEmotion?: EmotionAnalysis;
  groundingActive: boolean;
  onToggleGrounding: () => void;
}

export const EmotionalVisualizer: React.FC<EmotionalVisualizerProps> = ({
  state,
  currentEmotion,
  groundingActive,
  onToggleGrounding
}) => {
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Rest'>('Inhale');
  const [breathCounter, setBreathCounter] = useState(4);

  useEffect(() => {
    if (!groundingActive) return;

    const interval = setInterval(() => {
      setBreathCounter((prev) => {
        if (prev <= 1) {
          setBreathPhase((current) => {
            switch (current) {
              case 'Inhale': return 'Hold';
              case 'Hold': return 'Exhale';
              case 'Exhale': return 'Rest';
              case 'Rest': return 'Inhale';
            }
          });
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [groundingActive]);

  // Determine orb theme color based on 5 canonical emotions
  const getEmotionTheme = () => {
    if (!currentEmotion) return 'theme-neutral';
    switch (currentEmotion.primaryEmotion) {
      case 'Happy': return 'theme-joy';
      case 'Sad': return 'theme-grief';
      case 'Angry': return 'theme-burnout';
      case 'Frustrated': return 'theme-burnout';
      case 'Anxious': return 'theme-anxiety';
      case 'Confused': return 'theme-vulnerable';
      case 'Neutral':
      default:
        return 'theme-neutral';
    }
  };

  return (
    <div className="emotional-visualizer-card glass-panel">
      {groundingActive ? (
        <div className="grounding-mode">
          <div className="grounding-header">
            <span className="grounding-title">
              <Wind size={16} className="grounding-icon" />
              Somatic Grounding: Box Breathing (4-4-4-4)
            </span>
            <button className="close-btn" onClick={onToggleGrounding} title="Close exercise">
              <X size={16} />
            </button>
          </div>

          <div className="breath-circle-container">
            <div className={`breath-circle ${breathPhase.toLowerCase()}`}>
              <div className="breath-inner">
                <span className="phase-text">{breathPhase}</span>
                <span className="countdown-number">{breathCounter}s</span>
              </div>
            </div>
          </div>
          <p className="grounding-hint">Allow your shoulders to drop, soften your gaze, and release tension in your jaw.</p>
        </div>
      ) : (
        <div className="visualizer-content">
          <div className={`orb-wrapper ${getEmotionTheme()} ${state}`}>
            <div className="resonance-ring ring-3"></div>
            <div className="resonance-ring ring-2"></div>
            <div className="resonance-ring ring-1"></div>
            <div className="core-orb">
              {state === 'analyzing_emotion' && <Sparkles size={24} className="orb-icon spin" />}
              {state === 'speaking' && <Heart size={20} className="orb-icon pulse-heart" />}
              {state === 'listening' && <div className="audio-wave-dot" />}
              {(state === 'idle' || state === 'transcribing' || state === 'understanding' || state === 'thinking') && (
                <div className="pearl-nucleus" />
              )}
            </div>
          </div>

          <div className="emotional-meta">
            <div className="meta-headline">
              <span className="meta-badge">
                {currentEmotion ? currentEmotion.primaryEmotion : 'Affective Sensing Active'}
              </span>
              {currentEmotion && (
                <span className="intensity-chip">
                  Confidence: {currentEmotion.confidencePercentage}
                </span>
              )}
            </div>

            <p className="meta-description">
              {state === 'idle' && (currentEmotion 
                ? `${currentEmotion.explanation}` 
                : 'Listening with compassionate curiosity. Tap the mic or type to explore your emotional state.')}
              {state === 'listening' && 'Listening... speak naturally in English (India) or your native tone.'}
              {state === 'transcribing' && 'Transcribing audio buffer via Deepgram / Web Speech API...'}
              {state === 'understanding' && 'Resolving multi-turn context, topic & anaphoric references...'}
              {state === 'analyzing_emotion' && 'Analyzing complete sentence syntax & linguistic markers across Happy, Sad, Angry, Anxious, Neutral...'}
              {state === 'thinking' && 'Formulating empathetic response across Self-Awareness, Self-Regulation, Empathy & Social Skills...'}
              {state === 'speaking' && 'Speaking in attunement: gentle cadence, soothing pitch & warm resonance...'}
            </p>

            <div className="quick-actions">
              <button 
                type="button"
                className="grounding-toggle-btn"
                onClick={onToggleGrounding}
              >
                <Wind size={14} />
                <span>Need a grounding moment?</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
