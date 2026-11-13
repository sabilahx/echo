// src/components/RehearsalRoom.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Square, 
  Send, 
  Volume2, 
  ArrowLeft, 
  Award, 
  AlertCircle,
  Check, 
  X,
  Target,
  Sparkles,
  RotateCcw,
  Lightbulb,
  ThumbsUp,
  AlertTriangle,
  ArrowRight,
  Copy
} from 'lucide-react';
import type { 
  RehearsalScenario, 
  RehearsalMessage, 
  RehearsalFeedbackReport, 
  CoachingFeedback, 
  ScenarioStage, 
  RetryState,
  ConversationStateTracker
} from '../services/types.ts';
import { REHEARSAL_SCENARIOS } from '../services/rehearsalEngine.ts';
import { aiPipeline } from '../services/aiPipeline.ts';
import { speechService } from '../services/speechService.ts';
import './RehearsalRoom.css';

interface RehearsalRoomProps {
  activeScenario: RehearsalScenario | null;
  onSelectScenario: (scenario: RehearsalScenario) => void;
  onBackToSelector: () => void;
  onCompleteRehearsal: (report: RehearsalFeedbackReport) => void;
}

export const RehearsalRoom: React.FC<RehearsalRoomProps> = ({
  activeScenario,
  onSelectScenario,
  onBackToSelector,
  onCompleteRehearsal
}) => {
  const [messages, setMessages] = useState<RehearsalMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [pendingTranscript, setPendingTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Rehearsal 2.0 State
  const [scenarioStage, setScenarioStage] = useState<ScenarioStage>('opening');
  const [activeCoaching, setActiveCoaching] = useState<CoachingFeedback | null>(null);
  const [retryState, setRetryState] = useState<RetryState | null>(null);
  const [showBetterResponse, setShowBetterResponse] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<{
    original: string;
    revised: string;
    whatImproved: string;
  } | null>(null);

  // Situation-Aware Conversation State Machine & Closure
  const [conversationState, setConversationState] = useState<ConversationStateTracker | null>(null);
  const [showClosureBanner, setShowClosureBanner] = useState(false);
  const [hasContinuedPractising, setHasContinuedPractising] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Initialize conversation when scenario changes
  useEffect(() => {
    if (activeScenario) {
      setMessages([
        {
          id: 'init-partner-turn',
          role: 'partner',
          content: activeScenario.initialStatement,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setPendingTranscript('');
      setInterimText('');
      setErrorMessage('');
      setScenarioStage('opening');
      setActiveCoaching(null);
      setRetryState(null);
      setShowBetterResponse(false);
      setComparisonResult(null);
      setConversationState(null);
      setShowClosureBanner(false);
      setHasContinuedPractising(false);
    }
  }, [activeScenario]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing, isEvaluating]);

  // Clean up recording on unmount
  useEffect(() => {
    return () => {
      speechService.stopSpeaking();
    };
  }, []);

  // Submit User Turn and Trigger Partner Response + Coach Evaluation
  const handleSendUserMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !activeScenario || isProcessing || isEvaluating) return;

    // Check if this was a retry
    const isRetrying = Boolean(retryState?.isRetrying);
    const originalText = retryState?.originalMessage;

    if (isRetrying && originalText) {
      const comparison = aiPipeline.compareRehearsalResponses(originalText, trimmed, activeScenario);
      setComparisonResult(comparison);
    } else {
      setComparisonResult(null);
    }

    const userMsg: RehearsalMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRetry: isRetrying
    };

    const updated = [...messages, userMsg];
    setMessages(updated);
    setInputText('');
    setPendingTranscript('');
    setInterimText('');
    setErrorMessage(null);
    setRetryState(null);
    setShowBetterResponse(false);

    // Run Roleplay Character Reaction + Independent Coach Evaluation
    try {
      setIsProcessing(true);
      const turnResult = await aiPipeline.generateRehearsalTurnResult(
        activeScenario,
        updated,
        trimmed
      );

      // Attach coaching to user message
      userMsg.coaching = turnResult.coaching;
      setActiveCoaching(turnResult.coaching);
      setScenarioStage(turnResult.scenarioStage);

      // Situation-Aware Progress State & Closure Recognition
      if (turnResult.conversationState) {
        setConversationState(turnResult.conversationState);
        if (
          (turnResult.conversationState.isComplete ||
            turnResult.conversationState.progressState === 'RESOLVED' ||
            turnResult.conversationState.progressState === 'PARTIALLY_RESOLVED') &&
          !hasContinuedPractising
        ) {
          setShowClosureBanner(true);
        }
      }

      const partnerMsg: RehearsalMessage = {
        id: (Date.now() + 1).toString(),
        role: 'partner',
        content: turnResult.characterResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev.slice(0, -1), userMsg, partnerMsg]);

      if (voiceEnabled) {
        speechService.speak(turnResult.characterResponse, {
          tempo: '1.0x',
          tone: 'Natural',
          speechRate: 0.98,
          speechPitch: 1.0
        });
      }
    } catch (err: any) {
      console.error('Partner simulation error:', err);
      setErrorMessage('Could not generate partner response. You can continue typing.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Start Real Audio Recording
  const handleStartRecording = async () => {
    setErrorMessage(null);
    setInterimText('');
    setPendingTranscript('');

    try {
      await speechService.startRecording(
        (interim) => setInterimText(interim),
        () => handleStopRecording()
      );
      setIsRecording(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not access microphone.');
      setIsRecording(false);
    }
  };

  // Stop Recording & Offer Transcript Review
  const handleStopRecording = async () => {
    if (!isRecording) return;
    setIsRecording(false);

    try {
      setIsProcessing(true);
      const { audioBlob, emptyAudio } = await speechService.stopRecording();

      if (emptyAudio && !interimText.trim()) {
        setErrorMessage('No audible speech detected. Please speak closer to your microphone.');
        setIsProcessing(false);
        return;
      }

      const res = await aiPipeline.transcribeSpokenAudio(audioBlob, interimText);
      const text = res.transcript.trim();

      if (!text) {
        setErrorMessage('Could not clearly transcribe audio. Please try again or type.');
        setIsProcessing(false);
        return;
      }

      setPendingTranscript(text);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Speech recognition failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Trigger Retry Loop for Previous Message
  const handleStartRetry = (msg: RehearsalMessage, index: number) => {
    setRetryState({
      turnIndex: index,
      originalMessage: msg.content,
      isRetrying: true
    });
    setInputText(msg.content);
    setShowBetterResponse(false);
  };

  // Cancel Retry
  const handleCancelRetry = () => {
    setRetryState(null);
    setInputText('');
  };

  // Use Coach's Better Response
  const handleApplyBetterResponse = (betterText: string) => {
    setInputText(betterText);
  };

  const handleCopyBetterResponse = (betterText: string) => {
    navigator.clipboard.writeText(betterText);
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  // Finish Rehearsal and Generate 5-Pillar Feedback Report
  const handleFinishAndEvaluate = async () => {
    if (!activeScenario) return;

    try {
      setIsEvaluating(true);
      speechService.stopSpeaking();
      const report = await aiPipeline.generateRehearsalFeedback(activeScenario, messages);
      onCompleteRehearsal(report);
    } catch (err: any) {
      console.error('Evaluation error:', err);
      setErrorMessage('Error generating feedback report. Please try again.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Helper for style badges
  const getStyleBadgeClass = (style?: string) => {
    switch (style) {
      case 'assertive': return 'badge-assertive';
      case 'empathetic': return 'badge-empathetic';
      case 'aggressive': return 'badge-aggressive';
      case 'passive': return 'badge-passive';
      case 'avoidant': return 'badge-avoidant';
      default: return 'badge-neutral';
    }
  };

  // --- VIEW 1: SCENARIO SELECTOR (When no scenario active) ---
  if (!activeScenario) {
    return (
      <div className="rehearsal-selector-view">
        <div className="selector-hero glass-panel">
          <div className="hero-eyebrow">Interactive Roleplay Lab</div>
          <h1 className="selector-title">Conversation Rehearsal Mode</h1>
          <p className="selector-subtitle">
            Practise high-stakes real-world dialogues with realistic AI conversation partners. 
            Receive a detailed 5-pillar communication assessment when you finish.
          </p>
        </div>

        <div className="scenarios-catalog-grid">
          {REHEARSAL_SCENARIOS.map((scenario) => (
            <div 
              key={scenario.id}
              className="scenario-catalog-card glass-panel"
              onClick={() => onSelectScenario(scenario)}
            >
              <div className="catalog-card-header">
                <span className="category-tag">{scenario.category}</span>
                <span className="partner-tag">Partner: {scenario.partnerName} ({scenario.partnerRole})</span>
              </div>

              <h3 className="catalog-card-title">{scenario.title}</h3>
              <p className="catalog-card-tagline">{scenario.tagline}</p>

              <div className="catalog-situation-box">
                <strong>Situation:</strong> {scenario.situation}
              </div>

              <div className="catalog-goal-box">
                <Target size={14} className="goal-icon" />
                <span><strong>Target Goal:</strong> {scenario.learningGoal}</span>
              </div>

              <button type="button" className="btn-select-scenario">
                <span>Start Rehearsal</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- VIEW 2: ACTIVE REHEARSAL ROOM (3-Area Layout: Context Bar, Chat + Coach, Input) ---
  const userTurnsCount = messages.filter(m => m.role === 'user').length;
  const stages: ScenarioStage[] = ['opening', 'developing', 'climax', 'resolution'];

  return (
    <div className="rehearsal-room-container">
      {/* 1. TOP CONTEXT BAR & STAGE PROGRESS TRACKER */}
      <div className="room-header-bar glass-panel">
        <div className="header-left">
          <button type="button" className="btn-back" onClick={onBackToSelector}>
            <ArrowLeft size={16} />
            <span>All Scenarios</span>
          </button>
          <div>
            <h2 className="scenario-room-title">{activeScenario.title}</h2>
            <div className="partner-briefing-line">
              <span className="partner-pill">Playing: {activeScenario.partnerName} ({activeScenario.partnerRole})</span>
              <span className="partner-attitude-pill">Attitude: {activeScenario.partnerAttitude}</span>
            </div>
          </div>
        </div>

        {/* Stage Progress Indicator */}
        <div className="stage-tracker-pill">
          <span className="stage-label">Stage:</span>
          {stages.map((st, i) => (
            <span 
              key={st} 
              className={`stage-dot ${scenarioStage === st ? 'active' : ''} ${stages.indexOf(scenarioStage) >= i ? 'reached' : ''}`}
              title={`Stage ${i+1}: ${st.toUpperCase()}`}
            >
              {st}
            </span>
          ))}
        </div>

        <div className="header-right">
          <button 
            type="button" 
            className="btn-finish-rehearsal"
            onClick={handleFinishAndEvaluate}
            disabled={userTurnsCount === 0 || isEvaluating}
            title={userTurnsCount === 0 ? "Complete at least one turn to get feedback" : "Finish and generate communication score"}
          >
            <Award size={15} />
            <span>{isEvaluating ? 'Analyzing Communication...' : 'Finish & Get Feedback'}</span>
          </button>
        </div>
      </div>

      {/* Target Goal Banner */}
      <div className="learning-goal-banner">
        <Target size={14} className="goal-icon-accent" />
        <span><strong>Coaching Objective:</strong> {activeScenario.learningGoal}</span>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="error-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={15} />
            <span>{errorMessage}</span>
          </div>
          <button type="button" onClick={() => setErrorMessage(null)}>Dismiss</button>
        </div>
      )}

      {/* 2. MAIN 2-COLUMN EXPERIENCE: ROLEPLAY DIALOGUE + COACH INSIGHT PANEL */}
      <div className="rehearsal-main-stage">
        {/* LEFT COLUMN: Roleplay Conversation Dialogue */}
        <div className="rehearsal-chat-area glass-panel">
          <div className="chat-messages-flow">
            {messages.map((msg, index) => (
              <div key={msg.id} className={`rehearsal-bubble-wrapper ${msg.role}`}>
                <div className="rehearsal-avatar">
                  {msg.role === 'partner' ? activeScenario.partnerName.slice(0, 2).toUpperCase() : 'YOU'}
                </div>
                <div className="rehearsal-bubble-content">
                  <div className="bubble-header-label">
                    <span className="speaker-name">
                      {msg.role === 'partner' ? `${activeScenario.partnerName} (${activeScenario.partnerRole})` : 'You'}
                    </span>
                    {msg.coaching && (
                      <span className={`msg-style-tag ${getStyleBadgeClass(msg.coaching.communicationStyle)}`}>
                        {msg.coaching.communicationStyle.toUpperCase()}
                      </span>
                    )}
                    {msg.isRetry && (
                      <span className="retry-indicator-tag">Refined Attempt</span>
                    )}
                    <span className="bubble-timestamp">{msg.timestamp}</span>
                  </div>

                  <div className="rehearsal-speech-bubble">
                    {msg.content}
                  </div>

                  {/* Inline quick retry trigger for user turn */}
                  {msg.role === 'user' && (
                    <div className="bubble-action-bar">
                      <button 
                        type="button" 
                        className="btn-turn-retry"
                        onClick={() => handleStartRetry(msg, index)}
                        title="Re-attempt this turn with a different communication approach"
                      >
                        <RotateCcw size={12} />
                        <span>Try again</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="rehearsal-bubble-wrapper partner">
                <div className="rehearsal-avatar">
                  {activeScenario.partnerName.slice(0, 2).toUpperCase()}
                </div>
                <div className="rehearsal-bubble-content">
                  <div className="rehearsal-speech-bubble thinking-bubble">
                    <span>{activeScenario.partnerName} is reacting...</span>
                    <span className="dot-pulse" />
                  </div>
                </div>
              </div>
            )}

            {/* Situation-Aware Intelligent Coach Conversation Closure Card */}
            {showClosureBanner && conversationState && (
              <div className={`rehearsal-closure-card glass-panel ${conversationState.progressState === 'RESOLVED' ? 'resolved' : 'partially-resolved'}`}>
                <div className="closure-badge-row">
                  <span className="closure-status-pill">
                    {conversationState.progressState === 'RESOLVED' ? 'CONVERSATION RESOLUTION REACHED' : 'PARTIAL RESOLUTION REACHED'}
                  </span>
                  <span className="closure-partner-indicator">{activeScenario.partnerName} ({activeScenario.partnerRole})</span>
                </div>

                <h4 className="closure-title">
                  {conversationState.progressState === 'RESOLVED' 
                    ? 'Agreement Achieved — Dialogue Concluded' 
                    : 'Constructive Progress Milestone'}
                </h4>

                <p className="closure-guidance-text">
                  {conversationState.closureGuidance || "This conversation has reached a natural agreement checkpoint."}
                </p>

                {conversationState.acceptedProposals.length > 0 && (
                  <div className="closure-proposals-box">
                    <span className="closure-box-label">Agreed Action Steps:</span>
                    <ul className="closure-list">
                      {conversationState.acceptedProposals.map((item, idx) => (
                        <li key={idx}><Check size={13} className="closure-check-icon" /> {item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {conversationState.unresolvedIssues.length > 0 && (
                  <div className="closure-unresolved-box">
                    <span className="closure-box-label">Pending Follow-up:</span>
                    <ul className="closure-list">
                      {conversationState.unresolvedIssues.map((item, idx) => (
                        <li key={idx}><ArrowRight size={13} className="closure-arrow-icon" /> {item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="closure-actions-row">
                  <button 
                    type="button" 
                    className="btn-closure-primary"
                    onClick={handleFinishAndEvaluate}
                    disabled={isEvaluating}
                  >
                    <Award size={15} />
                    <span>End Conversation & Get Feedback</span>
                  </button>
                  <button 
                    type="button" 
                    className="btn-closure-secondary"
                    onClick={() => {
                      setShowClosureBanner(false);
                      setHasContinuedPractising(true);
                    }}
                  >
                    <span>Continue Practising</span>
                  </button>
                  <button 
                    type="button" 
                    className="btn-closure-review"
                    onClick={() => {
                      const chatEl = document.querySelector('.chat-messages-flow');
                      if (chatEl) chatEl.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <span>Review My Responses</span>
                  </button>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>
        </div>

        {/* RIGHT COLUMN: ECHO COMMUNICATION COACH INSIGHT PANEL */}
        <aside className="coach-insight-panel glass-panel">
          <div className="coach-panel-header">
            <div className="coach-badge-title">
              <Sparkles size={16} className="coach-icon-sparkle" />
              <span>ECHO Communication Coach</span>
            </div>
            <span className="coach-role-tag">Observing Turn</span>
          </div>

          {/* Comparison View if a retry just occurred */}
          {comparisonResult && (
            <div className="comparison-banner glass-panel">
              <div className="comparison-title">
                <RotateCcw size={14} />
                <span>Retry Improvement Analysis</span>
              </div>
              <p className="comparison-text">{comparisonResult.whatImproved}</p>
            </div>
          )}

          {activeCoaching ? (
            <div className="coach-feedback-body">
              {/* Communication Style & Skill Badge */}
              <div className="feedback-skill-header">
                <span className={`coach-style-badge ${getStyleBadgeClass(activeCoaching.communicationStyle)}`}>
                  {activeCoaching.communicationStyle.toUpperCase()} STYLE
                </span>
                <span className="coach-skill-label">{activeCoaching.skill}</span>
              </div>

              {/* Observation Card */}
              <div className="coach-card observation-card">
                <div className="card-mini-title">
                  <Lightbulb size={14} className="icon-gold" />
                  <span>Coach Observation</span>
                </div>
                <p className="card-narrative">{activeCoaching.observation}</p>
              </div>

              {/* What Went Well */}
              {activeCoaching.whatWentWell && (
                <div className="coach-card success-card">
                  <div className="card-mini-title">
                    <ThumbsUp size={14} className="icon-emerald" />
                    <span>What Worked</span>
                  </div>
                  <p className="card-narrative">{activeCoaching.whatWentWell}</p>
                </div>
              )}

              {/* Area to Improve */}
              {activeCoaching.improvement && (
                <div className="coach-card improvement-card">
                  <div className="card-mini-title">
                    <AlertTriangle size={14} className="icon-amber" />
                    <span>How to Strengthen</span>
                  </div>
                  <p className="card-narrative">{activeCoaching.improvement}</p>
                </div>
              )}

              {/* Model Better Response Box */}
              {activeCoaching.betterResponse && (
                <div className="better-response-card">
                  <div className="better-response-header">
                    <span className="better-title">Model Response Example:</span>
                    <button 
                      type="button" 
                      className="btn-copy-model"
                      onClick={() => handleCopyBetterResponse(activeCoaching.betterResponse!)}
                      title="Copy to clipboard"
                    >
                      {copiedResponse ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>

                  {showBetterResponse ? (
                    <blockquote className="model-quote">
                      "{activeCoaching.betterResponse}"
                    </blockquote>
                  ) : (
                    <button 
                      type="button" 
                      className="btn-reveal-model"
                      onClick={() => setShowBetterResponse(true)}
                    >
                      <Sparkles size={13} />
                      <span>Show me a better response</span>
                    </button>
                  )}

                  {showBetterResponse && (
                    <button 
                      type="button" 
                      className="btn-use-model"
                      onClick={() => handleApplyBetterResponse(activeCoaching.betterResponse!)}
                    >
                      <span>Insert into input box</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="coach-actions-cluster">
                {activeCoaching.shouldRetry && (
                  <button 
                    type="button" 
                    className="btn-coach-retry"
                    onClick={() => {
                      const lastUser = [...messages].reverse().find(m => m.role === 'user');
                      if (lastUser) {
                        handleStartRetry(lastUser, messages.indexOf(lastUser));
                      }
                    }}
                  >
                    <RotateCcw size={13} />
                    <span>Try Again with Revised Phrasing</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="coach-waiting-state">
              <div className="waiting-pulse-orb" />
              <p className="waiting-heading">Coach is listening</p>
              <p className="waiting-subtext">
                Respond to {activeScenario.partnerName}. The coach will analyze your assertiveness, empathy, and emotional regulation after each turn.
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* 3. TRANSCRIPT REVIEW STAGE (When voice was used) */}
      {pendingTranscript && (
        <div className="rehearsal-transcript-edit-box glass-panel">
          <div className="edit-header">
            <span>Review or edit your spoken response before sending to {activeScenario.partnerName}:</span>
          </div>
          <input 
            type="text" 
            className="transcript-edit-input"
            value={pendingTranscript}
            onChange={(e) => setPendingTranscript(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendUserMessage(pendingTranscript);
            }}
            autoFocus
          />
          <div className="transcript-edit-actions">
            <button 
              type="button" 
              className="btn-discard"
              onClick={() => setPendingTranscript('')}
            >
              <X size={13} /> Discard
            </button>
            <button 
              type="button" 
              className="btn-confirm-send"
              onClick={() => handleSendUserMessage(pendingTranscript)}
            >
              <Check size={13} /> Send Response
            </button>
          </div>
        </div>
      )}

      {/* 4. INPUT CONTROLLER (Voice Mic + Typed Fallback + Retry Banner) */}
      <div className="rehearsal-input-bar glass-panel">
        {retryState?.isRetrying && (
          <div className="retry-status-badge">
            <span>Refining previous turn:</span>
            <button type="button" className="btn-cancel-retry" onClick={handleCancelRetry}>
              <X size={12} /> Cancel
            </button>
          </div>
        )}

        <form 
          className="rehearsal-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (inputText.trim()) handleSendUserMessage(inputText);
          }}
        >
          <input 
            type="text" 
            className="rehearsal-text-input"
            value={isRecording ? (interimText || "Listening... speak now") : inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isRecording || isProcessing || isEvaluating || Boolean(pendingTranscript)}
            placeholder={
              isRecording 
                ? `Speaking as yourself in response to ${activeScenario.partnerName}...`
                : retryState?.isRetrying
                  ? `Revise your statement to ${activeScenario.partnerName}...`
                  : `Respond to ${activeScenario.partnerName} via voice or text...`
            }
          />
          <button 
            type="submit" 
            className="btn-send-rehearsal"
            disabled={!inputText.trim() || isProcessing || isEvaluating || Boolean(pendingTranscript)}
          >
            <Send size={15} />
          </button>
        </form>

        <div className="rehearsal-mic-controls">
          <button 
            type="button"
            className={`btn-rehearsal-mic ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            disabled={isProcessing || isEvaluating || Boolean(pendingTranscript)}
            title={isRecording ? "Stop recording" : "Speak your response"}
          >
            {isRecording ? <Square size={18} /> : <Mic size={20} />}
          </button>

          <button 
            type="button"
            className={`btn-voice-toggle ${voiceEnabled ? 'active' : ''}`}
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            title={voiceEnabled ? "Partner voice enabled" : "Partner voice muted"}
          >
            <Volume2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
