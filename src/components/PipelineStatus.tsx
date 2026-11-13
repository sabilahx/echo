// src/components/PipelineStatus.tsx
import React from 'react';
import { Mic, Activity, Compass, Brain, MessageSquareHeart, Volume2 } from 'lucide-react';
import type { PipelineState } from '../services/types';
import './PipelineStatus.css';

interface PipelineStatusProps {
  state: PipelineState;
}

export const PipelineStatus: React.FC<PipelineStatusProps> = ({ state }) => {
  if (state === 'idle') return null;

  const stepMeta: Record<string, { label: string; icon: any }> = {
    listening: { label: 'Listening to your voice...', icon: Mic },
    transcribing: { label: 'Transcribing speech...', icon: Activity },
    understanding: { label: 'Resolving conversational context...', icon: Compass },
    analyzing_emotion: { label: 'Analyzing emotional cues & syntax...', icon: Brain },
    thinking: { label: 'Formulating empathetic response...', icon: MessageSquareHeart },
    speaking: { label: 'Speaking in attunement...', icon: Volume2 }
  };

  const current = stepMeta[state] || { label: 'Processing...', icon: Activity };
  const Icon = current.icon;

  return (
    <div className="pipeline-compact-bar" aria-live="polite">
      <div className="compact-indicator">
        <span className="pulse-indicator-dot" />
        <Icon size={13} className="compact-icon" />
      </div>
      <span className="compact-label">{current.label}</span>
    </div>
  );
};
