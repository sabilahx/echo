// src/components/RehearsalFeedback.tsx
import React, { useState } from 'react';
import { 
  CheckCircle2, 
  TrendingUp, 
  Copy, 
  Check, 
  RotateCcw, 
  ArrowRight, 
  Sparkles, 
  HeartHandshake, 
  Compass, 
  ShieldCheck, 
  MessageSquareCheck,
  AlertCircle
} from 'lucide-react';
import type { RehearsalFeedbackReport } from '../services/types.ts';
import './RehearsalFeedback.css';

interface RehearsalFeedbackProps {
  report: RehearsalFeedbackReport;
  onRetryScenario: () => void;
  onSelectAnotherScenario: () => void;
}

export const RehearsalFeedback: React.FC<RehearsalFeedbackProps> = ({
  report,
  onRetryScenario,
  onSelectAnotherScenario
}) => {
  const [copiedSentence, setCopiedSentence] = useState(false);

  const handleCopySentence = () => {
    navigator.clipboard.writeText(report.keyMoment.suggestedAlternativeSentence);
    setCopiedSentence(true);
    setTimeout(() => setCopiedSentence(false), 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'score-emerald';
    if (score >= 65) return 'score-violet';
    return 'score-amber';
  };

  const getTierBadge = (score: number) => {
    if (score >= 85) return 'Masterful & Composed';
    if (score >= 70) return 'Effective Communication';
    if (score >= 55) return 'Developing Assertiveness';
    return 'Needs Foundational Practice';
  };

  return (
    <div className="rehearsal-feedback-container">
      {/* 1. Header Summary Card */}
      <div className="feedback-hero-card glass-panel">
        <div className="feedback-eyebrow">
          <Sparkles size={14} />
          <span>Practice Evaluation Report</span>
        </div>

        <div className="hero-split-content">
          <div>
            <h1 className="feedback-title">{report.scenarioTitle}</h1>
            <p className="feedback-meta-line">
              Completed at {report.completedAt} • Analyzed across {report.totalTurns} conversational turn{report.totalTurns > 1 ? 's' : ''}
            </p>
            <div className="performance-tier-badge">
              {getTierBadge(report.overallScore)}
            </div>
          </div>

          <div className="overall-score-circle">
            <span className="score-num">{report.overallScore}</span>
            <span className="score-label">/ 100</span>
            <span className="score-caption">Overall Communication Score</span>
          </div>
        </div>

        <div className="feedback-disclaimer-pill">
          <AlertCircle size={13} />
          <span>{report.disclaimer}</span>
        </div>
      </div>

      {/* 2. The 5 Core Communication Dimension Scorecards */}
      <section className="feedback-section">
        <div className="section-eyebrow">Five-Pillar Assessment</div>
        <h2 className="section-header-title">Communication Competencies Breakdown</h2>

        <div className="dimensions-score-grid">
          {/* Empathy */}
          <div className="dimension-card glass-panel">
            <div className="dim-header">
              <div className="dim-name-group">
                <HeartHandshake size={18} className="dim-icon emerald" />
                <span className="dim-title">Empathy & Attunement</span>
              </div>
              <span className={`dim-score-badge ${getScoreColor(report.dimensions.empathy.score)}`}>
                {report.dimensions.empathy.score}/100
              </span>
            </div>
            <div className="dim-progress-track">
              <div 
                className={`dim-progress-fill ${getScoreColor(report.dimensions.empathy.score)}`} 
                style={{ width: `${report.dimensions.empathy.score}%` }} 
              />
            </div>
            <p className="dim-rationale">{report.dimensions.empathy.rationale}</p>
            <div className="dim-tip-box">
              <strong>Coaching Tip:</strong> {report.dimensions.empathy.actionableTip}
            </div>
          </div>

          {/* Clarity */}
          <div className="dimension-card glass-panel">
            <div className="dim-header">
              <div className="dim-name-group">
                <Compass size={18} className="dim-icon violet" />
                <span className="dim-title">Clarity & Directness</span>
              </div>
              <span className={`dim-score-badge ${getScoreColor(report.dimensions.clarity.score)}`}>
                {report.dimensions.clarity.score}/100
              </span>
            </div>
            <div className="dim-progress-track">
              <div 
                className={`dim-progress-fill ${getScoreColor(report.dimensions.clarity.score)}`} 
                style={{ width: `${report.dimensions.clarity.score}%` }} 
              />
            </div>
            <p className="dim-rationale">{report.dimensions.clarity.rationale}</p>
            <div className="dim-tip-box">
              <strong>Coaching Tip:</strong> {report.dimensions.clarity.actionableTip}
            </div>
          </div>

          {/* Emotional Control */}
          <div className="dimension-card glass-panel">
            <div className="dim-header">
              <div className="dim-name-group">
                <ShieldCheck size={18} className="dim-icon amber" />
                <span className="dim-title">Emotional Control</span>
              </div>
              <span className={`dim-score-badge ${getScoreColor(report.dimensions.emotionalControl.score)}`}>
                {report.dimensions.emotionalControl.score}/100
              </span>
            </div>
            <div className="dim-progress-track">
              <div 
                className={`dim-progress-fill ${getScoreColor(report.dimensions.emotionalControl.score)}`} 
                style={{ width: `${report.dimensions.emotionalControl.score}%` }} 
              />
            </div>
            <p className="dim-rationale">{report.dimensions.emotionalControl.rationale}</p>
            <div className="dim-tip-box">
              <strong>Coaching Tip:</strong> {report.dimensions.emotionalControl.actionableTip}
            </div>
          </div>

          {/* Assertiveness */}
          <div className="dimension-card glass-panel">
            <div className="dim-header">
              <div className="dim-name-group">
                <TrendingUp size={18} className="dim-icon sky" />
                <span className="dim-title">Assertiveness & Boundaries</span>
              </div>
              <span className={`dim-score-badge ${getScoreColor(report.dimensions.assertiveness.score)}`}>
                {report.dimensions.assertiveness.score}/100
              </span>
            </div>
            <div className="dim-progress-track">
              <div 
                className={`dim-progress-fill ${getScoreColor(report.dimensions.assertiveness.score)}`} 
                style={{ width: `${report.dimensions.assertiveness.score}%` }} 
              />
            </div>
            <p className="dim-rationale">{report.dimensions.assertiveness.rationale}</p>
            <div className="dim-tip-box">
              <strong>Coaching Tip:</strong> {report.dimensions.assertiveness.actionableTip}
            </div>
          </div>

          {/* Respectful Communication */}
          <div className="dimension-card glass-panel" style={{ gridColumn: '1 / -1' }}>
            <div className="dim-header">
              <div className="dim-name-group">
                <MessageSquareCheck size={18} className="dim-icon emerald" />
                <span className="dim-title">Respectful Communication & Professional Dignity</span>
              </div>
              <span className={`dim-score-badge ${getScoreColor(report.dimensions.respectfulCommunication.score)}`}>
                {report.dimensions.respectfulCommunication.score}/100
              </span>
            </div>
            <div className="dim-progress-track">
              <div 
                className={`dim-progress-fill ${getScoreColor(report.dimensions.respectfulCommunication.score)}`} 
                style={{ width: `${report.dimensions.respectfulCommunication.score}%` }} 
              />
            </div>
            <p className="dim-rationale">{report.dimensions.respectfulCommunication.rationale}</p>
            <div className="dim-tip-box">
              <strong>Coaching Tip:</strong> {report.dimensions.respectfulCommunication.actionableTip}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Key Moment: Before vs. After Response Comparison */}
      <section className="feedback-section">
        <div className="section-eyebrow">Key Moment Analysis</div>
        <h2 className="section-header-title">Response Comparison & Revision</h2>

        <div className="comparison-cards-grid">
          <div className="comparison-card original glass-panel">
            <div className="card-tag original-tag">What You Said</div>
            <blockquote className="quote-text">
              "{report.keyMoment.originalResponse}"
            </blockquote>
          </div>

          <div className="comparison-card improved glass-panel">
            <div className="card-tag improved-tag">Coach Refinement</div>
            <blockquote className="quote-text">
              "{report.keyMoment.improvedResponse}"
            </blockquote>
            <p className="comparison-explanation">{report.keyMoment.explanation}</p>
          </div>
        </div>

        {/* Suggested Alternative Sentence Box */}
        <div className="suggested-sentence-box glass-panel">
          <div className="sentence-box-header">
            <span className="sentence-badge">Suggested Alternative Sentence to Practise</span>
            <button type="button" className="btn-copy-sentence" onClick={handleCopySentence}>
              {copiedSentence ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedSentence ? 'Copied to Clipboard' : 'Copy Sentence'}</span>
            </button>
          </div>
          <p className="standout-sentence">
            "{report.keyMoment.suggestedAlternativeSentence}"
          </p>
        </div>
      </section>

      {/* 4. Qualitative Strengths & Growth Areas */}
      <section className="feedback-section">
        <div className="qualitative-grid">
          <div className="qual-column glass-panel strengths">
            <h3 className="qual-title">
              <CheckCircle2 size={16} className="qual-icon-green" />
              <span>What You Handled Well</span>
            </h3>
            <ul className="qual-list">
              {report.whatUserDidWell.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="qual-column glass-panel improvements">
            <h3 className="qual-title">
              <TrendingUp size={16} className="qual-icon-amber" />
              <span>Concrete Areas for Improvement</span>
            </h3>
            <ul className="qual-list">
              {report.whatCouldBeImproved.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Practical Takeaway & Skills Highlights */}
        {(report.strongestSkill || report.weakestSkill || report.practicalTakeaway) && (
          <div className="takeaway-box glass-panel" style={{ marginTop: '1.25rem', padding: '1.2rem', borderRadius: '12px', background: 'rgba(167, 139, 250, 0.08)', border: '1px solid rgba(167, 139, 250, 0.2)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={16} color="#a78bfa" />
              <span>Executive Coaching Takeaways</span>
            </h3>
            {report.strongestSkill && (
              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                <strong style={{ color: '#34d399' }}>Strongest Competency:</strong> {report.strongestSkill}
              </p>
            )}
            {report.weakestSkill && (
              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                <strong style={{ color: '#fbbf24' }}>Key Growth Area:</strong> {report.weakestSkill}
              </p>
            )}
            {report.practicalTakeaway && (
              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '0.5rem', fontStyle: 'italic' }}>
                💡 <strong>Practical Action:</strong> {report.practicalTakeaway}
              </p>
            )}
          </div>
        )}
      </section>

      {/* 5. Navigation Actions */}
      <div className="feedback-footer-actions">
        <button type="button" className="btn-retry" onClick={onRetryScenario}>
          <RotateCcw size={15} />
          <span>Re-try This Scenario</span>
        </button>

        <button type="button" className="btn-next-scenario" onClick={onSelectAnotherScenario}>
          <span>Choose Another Rehearsal Scenario</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
};
