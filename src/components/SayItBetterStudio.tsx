// src/components/SayItBetterStudio.tsx
import React, { useState } from 'react';
import { Wand2, Copy, Check, Sparkles } from 'lucide-react';
import type { SayItBetterResult } from '../services/types.ts';
import { aiPipeline } from '../services/aiPipeline.ts';
import './SayItBetterStudio.css';

const EXAMPLE_PHRASES = [
  "You never do your work and I'm tired of dealing with you.",
  "I don't have time for this, just leave me alone.",
  "Your decision was completely unfair and makes zero sense.",
  "Why is this taking so long? Hurry up and finish it."
];

export const SayItBetterStudio: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<SayItBetterResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleTransform = async (textToTransform: string) => {
    const text = textToTransform.trim();
    if (!text) return;

    try {
      setIsProcessing(true);
      const res = await aiPipeline.sayItBetter(text);
      setResult(res);
    } catch (err) {
      console.error('Say It Better error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="say-it-better-studio">
      <div className="studio-hero glass-panel">
        <div className="hero-eyebrow">
          <Sparkles size={14} />
          <span>Communication Reframing Studio</span>
        </div>
        <h1 className="studio-title">Say It Better</h1>
        <p className="studio-subtitle">
          Transform raw frustration, reactive blame, or anxious hesitation into clear, constructive, and dignified communication.
        </p>
      </div>

      <div className="studio-main-card glass-panel">
        <form 
          className="studio-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleTransform(inputText);
          }}
        >
          <label className="input-label">Enter raw or difficult sentence to reframe:</label>
          <textarea 
            className="studio-textarea"
            rows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your unedited thought here (e.g. 'You never do your share of the work and I'm tired of it...')"
          />

          <div className="form-bottom-row">
            <div className="example-chips-group">
              <span className="example-label">Try an example:</span>
              {EXAMPLE_PHRASES.map((phrase, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="example-chip"
                  onClick={() => {
                    setInputText(phrase);
                    handleTransform(phrase);
                  }}
                >
                  "{phrase.slice(0, 28)}..."
                </button>
              ))}
            </div>

            <button 
              type="submit" 
              className="btn-transform-main"
              disabled={!inputText.trim() || isProcessing}
            >
              <Wand2 size={16} />
              <span>{isProcessing ? 'Reframing...' : 'Reframe in 3 Styles'}</span>
            </button>
          </div>
        </form>

        {result && (
          <div className="studio-results-area">
            <div className="intent-banner">
              <span><strong>Underlying Core Intent:</strong> {result.coreIntent}</span>
            </div>

            <div className="styles-comparison-grid">
              {/* Professional */}
              <div className="style-column glass-panel">
                <div className="style-header">
                  <div>
                    <span className="style-badge professional">Professional</span>
                    <p className="style-desc">Diplomatic, objective, and solution-focused for workplace settings.</p>
                  </div>
                  <button 
                    type="button" 
                    className="btn-copy-card"
                    onClick={() => handleCopy(result.professional, 'prof')}
                  >
                    {copiedKey === 'prof' ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedKey === 'prof' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="style-content-box">
                  "{result.professional}"
                </div>
              </div>

              {/* Friendly */}
              <div className="style-column glass-panel">
                <div className="style-header">
                  <div>
                    <span className="style-badge friendly">Friendly & Warm</span>
                    <p className="style-desc">Approachable, collaborative, and gentle for personal relationships.</p>
                  </div>
                  <button 
                    type="button" 
                    className="btn-copy-card"
                    onClick={() => handleCopy(result.friendly, 'friend')}
                  >
                    {copiedKey === 'friend' ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedKey === 'friend' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="style-content-box">
                  "{result.friendly}"
                </div>
              </div>

              {/* Assertive */}
              <div className="style-column glass-panel">
                <div className="style-header">
                  <div>
                    <span className="style-badge assertive">Assertive & Clear</span>
                    <p className="style-desc">Direct, boundary-holding, and firm without aggressive blame.</p>
                  </div>
                  <button 
                    type="button" 
                    className="btn-copy-card"
                    onClick={() => handleCopy(result.assertive, 'assert')}
                  >
                    {copiedKey === 'assert' ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedKey === 'assert' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="style-content-box">
                  "{result.assertive}"
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
