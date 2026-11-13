// src/components/InputController.tsx
import React, { useState, useEffect } from 'react';
import { Mic, Square, Send, Sparkles, Check, X } from 'lucide-react';
import type { PipelineState, PresetScenario } from '../services/types.ts';
import { PRESET_EMOTION_SCENARIOS } from '../services/aiPipeline.ts';
import './InputController.css';

interface InputControllerProps {
  state: PipelineState;
  onStartListening: () => void;
  onStopListening: () => void;
  onSubmitText: (text: string) => void;
  interimTranscript?: string;
  pendingTranscript?: string;
  onConfirmTranscript?: (text: string) => void;
  onCancelTranscript?: () => void;
  onSelectScenario?: (scenario: PresetScenario) => void;
}

export const InputController: React.FC<InputControllerProps> = ({
  state,
  onStartListening,
  onStopListening,
  onSubmitText,
  interimTranscript = '',
  pendingTranscript = '',
  onConfirmTranscript,
  onCancelTranscript,
  onSelectScenario
}) => {
  const [customText, setCustomText] = useState('');
  const [editableTranscript, setEditableTranscript] = useState('');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('happiness_project');
  const [showPresets, setShowPresets] = useState<boolean>(false);

  const isListening = state === 'listening';
  const isProcessing = ['transcribing', 'understanding', 'analyzing_emotion', 'thinking', 'speaking'].includes(state);

  // Sync editable transcript when pendingTranscript changes
  useEffect(() => {
    if (pendingTranscript) {
      setEditableTranscript(pendingTranscript);
    }
  }, [pendingTranscript]);

  const handleMicClick = () => {
    if (state === 'idle') {
      onStartListening();
    } else if (isListening) {
      onStopListening();
    }
  };

  const handleSelectScenario = (scenario: PresetScenario) => {
    setSelectedScenarioId(scenario.id);
    if (onSelectScenario) {
      onSelectScenario(scenario);
    } else if (state === 'idle') {
      onSubmitText(scenario.preview);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim() || state !== 'idle') return;
    onSubmitText(customText.trim());
    setCustomText('');
  };

  const handleConfirmEdit = () => {
    if (editableTranscript.trim() && onConfirmTranscript) {
      onConfirmTranscript(editableTranscript.trim());
    }
  };

  return (
    <div className="input-controller-wrapper">
      {/* 1. Editable Transcript Review Box (allowing user to edit before analysis) */}
      {pendingTranscript && (
        <div className="transcript-review-box glass-panel">
          <div className="review-header">
            <span>Review or edit heard speech before emotion analysis:</span>
          </div>
          <input
            type="text"
            className="review-input"
            value={editableTranscript}
            onChange={(e) => setEditableTranscript(e.target.value)}
            placeholder="Edit transcript if words were misheard..."
            autoFocus
          />
          <div className="review-actions">
            <button 
              type="button" 
              className="review-btn-cancel"
              onClick={onCancelTranscript}
            >
              <X size={13} style={{ marginRight: '4px' }} />
              Discard
            </button>
            <button 
              type="button" 
              className="review-btn-confirm"
              onClick={handleConfirmEdit}
            >
              <Check size={13} style={{ marginRight: '4px' }} />
              Confirm & Analyze
            </button>
          </div>
        </div>
      )}

      {/* 2. Quick Emotional Scenarios for testing or exploration */}
      <div className="scenarios-bar">
        <div className="scenarios-header">
          <span className="scenarios-title">
            <Sparkles size={13} className="sparkle-icon" />
            Explore Emotional Scenarios:
          </span>
          <button 
            type="button" 
            className="toggle-presets-btn"
            onClick={() => setShowPresets(!showPresets)}
          >
            {showPresets ? 'Hide Scenarios' : 'Show Scenarios'}
          </button>
        </div>

        {showPresets && (
          <div className="scenario-chips-container">
            {PRESET_EMOTION_SCENARIOS.map((scenario: PresetScenario) => {
              const isSelected = selectedScenarioId === scenario.id;
              return (
                <button
                  key={scenario.id}
                  type="button"
                  disabled={state !== 'idle' || Boolean(pendingTranscript)}
                  className={`scenario-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectScenario(scenario)}
                  title={scenario.preview}
                >
                  <span className="chip-emotion">{scenario.emotionPreview}</span>
                  <span className="chip-label">{scenario.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Main Controls: Mic + Text input fallback */}
      <div className="input-controller glass-panel">
        <form className="text-input-form" onSubmit={handleFormSubmit}>
          <input
            type="text"
            className="text-input"
            value={isListening ? (interimTranscript || "Listening... speak now") : customText}
            onChange={(e) => setCustomText(e.target.value)}
            disabled={isListening || isProcessing || Boolean(pendingTranscript)}
            placeholder={
              isListening
                ? "Listening... speak in English (India) or your natural tone"
                : isProcessing
                ? "ECHO is analyzing and attuning with empathy..."
                : "Type your thoughts or tap microphone to speak..."
            }
          />
          <button 
            type="submit" 
            className="send-button"
            disabled={!customText.trim() || state !== 'idle' || Boolean(pendingTranscript)}
            title="Send text message"
          >
            <Send size={15} />
          </button>
        </form>

        <div className="mic-section">
          <span className="status-label">
            {isListening
              ? "Tap to stop"
              : state === 'transcribing'
              ? "Transcribing..."
              : state === 'understanding'
              ? "Understanding..."
              : state === 'analyzing_emotion'
              ? "Analyzing EQ..."
              : state === 'thinking'
              ? "Reasoning..."
              : state === 'speaking'
              ? "Speaking..."
              : "Voice mode"}
          </span>

          <button
            type="button"
            className={`mic-button ${isListening ? 'listening' : ''} ${isProcessing ? 'processing' : ''}`}
            onClick={handleMicClick}
            disabled={isProcessing || Boolean(pendingTranscript)}
            title={isListening ? "Stop listening & transcribe" : "Start speaking"}
          >
            {isListening ? <Square size={20} /> : <Mic size={22} />}
          </button>
        </div>
      </div>
    </div>
  );
};
