import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BrainCircuit, Sparkles, ShieldAlert, Activity, Send, Zap, Clock, Trash2, Bot, User, X, ChevronUp, Database } from 'lucide-react';
import { API } from '../utils/formatters';

export default function IntelligencePage({ setNotice }) {
  const [forecast, setForecast] = useState(null);
  const [expiryRisk, setExpiryRisk] = useState(null);
  const [health, setHealth] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [asking, setAsking] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIntelligenceData();
  }, []);

  async function fetchIntelligenceData() {
    setLoading(true);
    try {
      const [forecastRes, expiryRes, healthRes] = await Promise.all([
        axios.get(`${API}/api/forecast/demand`).catch(() => null),
        axios.get(`${API}/api/forecast/expiry`).catch(() => null),
        axios.get(`${API}/api/intelligence/health`).catch(() => null),
      ]);

      if (forecastRes) setForecast(forecastRes.data);
      if (expiryRes) setExpiryRisk(expiryRes.data);
      if (healthRes) setHealth(healthRes.data);
      if (!forecastRes || !expiryRes || !healthRes) {
        setNotice('Some intelligence data could not be loaded. Check API and ML service health, then refresh.');
      }
    } catch {
      setNotice('Unable to load intelligence services.');
    } finally {
      setLoading(false);
    }
  }

  async function askAssistant(questionText) {
    const text = (questionText ?? '').trim();
    if (!text || asking) return;

    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', text }]);
    setPrompt('');
    setAsking(true);
    try {
      const { data } = await axios.post(`${API}/api/assistant`, { prompt: text });
      setMessages((prev) => [
        ...prev,
        {
          id: data?.message?.id || Date.now() + 1,
          role: 'assistant',
          text: data.answer,
          source: data.source,
          model: data.model,
          toolsUsed: data.toolsUsed || []
        }
      ]);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Assistant service unavailable. Please try again.';
      setNotice(errorMessage);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', text: errorMessage }
      ]);
    } finally {
      setAsking(false);
    }
  }

  function handleClearConversation() {
    setMessages([]);
    setLoadingHistory(false);
  }

  async function handleAskAssistant(e) {
    if (e) e.preventDefault();
    await askAssistant(prompt);
  }

  function handleQuickQuestion(questionText) {
    askAssistant(questionText);
  }

  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, asking]);

  return (
    <div className="intelligence-page">
      <div className="intelligence-header-row">
        <div className="service-status">
          <Activity size={16} />
          <span>ML Engine: <b>{health?.ml || 'Fallback Mode'}</b></span>
          {health?.demandModel && (
            <>
              <span className="dot-divider">•</span>
              <span>Demand model: <b>{health.demandModel}</b></span>
            </>
          )}
          <span className="dot-divider">•</span>
          <span>Gemini AI: <b>{health?.gemini || 'Configured/Fallback'}</b></span>
        </div>
      </div>

      <div className="intelligence-grid">
        <div className="main-intel-column">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2><BrainCircuit size={18} /> AI Demand Forecast</h2>
                <p className="muted">
                  {forecast?.horizon || 'Next 30 days horizon'} · Model: {forecast?.model || 'Local Planning'}
                </p>
              </div>
              <span className="pill">{forecast ? 'Forecast Ready' : 'Loading'}</span>
            </div>
            {forecast?.dataSource === 'synthetic-demo' && (
              <p className="notice">
                Model trained on synthetic data. Forecasts are not validated against
                pharmacy sales history and should not be used as purchasing guidance.
              </p>
            )}

            <div className="forecast-list">
              {(forecast?.items || []).map((item) => (
                <div className="forecast-row" key={item.medicine}>
                  <div>
                    <b>{item.medicine}</b>
                    <small>
                      Predicted demand: {item.predictedDemand ?? 0} units
                      {item.confidence == null ? ' (confidence not validated)' : ` (${item.confidence}% confidence)`}
                    </small>
                  </div>
                  <div className="forecast-stats">
                    <span>Current: {item.currentStock}</span>
                    <strong>Suggested Reorder: {item.suggestedOrder}</strong>
                  </div>
                </div>
              ))}
              {(!forecast?.items || !forecast.items.length) && (
                <p className="empty">No demand forecasting items available.</p>
              )}
            </div>
          </section>

          <section className="panel margin-top">
            <div className="panel-head">
              <div>
                <h2><ShieldAlert size={18} /> Expiry Risk Assessment</h2>
                <p className="muted">
                  Batch expiration tracking and FEFO (First-Expired, First-Out) recommendations.
                </p>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Batch #</th>
                    <th>Stock</th>
                    <th>Days to Expiry</th>
                    <th>Risk level</th>
                  </tr>
                </thead>
                <tbody>
                  {(expiryRisk?.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td><b>{item.medicine}</b></td>
                      <td><code>{item.batch}</code></td>
                      <td>{item.stock} units</td>
                      <td>{item.daysUntilExpiry} days ({item.expiryDate})</td>
                      <td>
                        <span className={`pill ${item.risk === 'Critical' ? 'critical' : item.risk === 'Watch' ? 'low-stock' : ''}`}>
                          {item.risk} Risk
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!expiryRisk?.items || !expiryRisk.items.length) && (
                <p className="empty">No active expiry risk warnings.</p>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className={assistantOpen ? 'ai-widget open' : 'ai-widget'}>
        <div
          className="ai-window"
          role="dialog"
          aria-label="Operations Assistant"
          aria-hidden={!assistantOpen}
          onClick={() => { if (!assistantOpen) setAssistantOpen(true); }}
        >
          <div className="ai-window-head">
            <span className="assistant-badge"><Sparkles size={16} /></span>
            <div className="ai-window-title">
              <b>Operations Assistant</b>
              <span className={asking ? 'assistant-status busy' : 'assistant-status'}>
                <i /> {asking ? 'Thinking' : 'Ready'}
              </span>
            </div>
            <div className="assistant-head-actions">
              {messages.length > 0 && (
                <button type="button" className="assistant-clear" onClick={handleClearConversation} aria-label="Clear conversation" title="Clear conversation">
                  <Trash2 size={14} />
                </button>
              )}
              <button type="button" className="assistant-clear" onClick={() => setAssistantOpen(false)} aria-label="Close assistant" title="Close">
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="ai-teaser">
            <div className="ai-teaser-top">
              <span className="ai-teaser-badge"><Sparkles size={15} /></span>
              <div>
                <b>AI Assistant</b>
                <small>Instant answers from your live pharmacy data</small>
              </div>
              <ChevronUp size={16} className="ai-teaser-chevron" />
            </div>
            <h3>Ask MIMS anything about your stock.</h3>
            <p>Reorder priorities, expiry exposure and supplier timing — on demand, without leaving this page.</p>
            <div className="ai-teaser-row">
              <span><Zap size={12} /> Reorder priorities</span>
              <span><Clock size={12} /> Expiry risks</span>
              <span><ShieldAlert size={12} /> Batch health</span>
            </div>
          </div>

          <div className="ai-body">
          <div className="assistant-thread" ref={scrollRef}>
            {loadingHistory && (
              <div className="assistant-loading"><span className="assistant-spinner dark" /> Loading conversation…</div>
            )}

            {!loadingHistory && messages.length === 0 && !asking && (
              <div className="assistant-empty">
                <span className="assistant-empty-icon"><Bot size={20} /></span>
                <b>Ask about your pharmacy</b>
                <p>Get instant guidance on reordering, expiry exposure, and daily workflow.</p>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={`bubble ${m.role === 'user' ? 'user' : 'ai'}`}>
                <span className="bubble-avatar">{m.role === 'user' ? <User size={13} /> : <Sparkles size={13} />}</span>
                <div className="bubble-body">
                  <span className="bubble-name">
                    {m.role === 'user' ? 'You' : 'Assistant'}
                    {m.toolsUsed?.length > 0 && (
                      <em className="bubble-tools" title={`Queried: ${m.toolsUsed.join(', ')}`}>
                        <Database size={10} /> {m.toolsUsed.length} tool{m.toolsUsed.length > 1 ? 's' : ''}
                      </em>
                    )}
                  </span>
                  <p>{m.text}</p>
                  {m.source && (
                    <span className={`bubble-source ${m.source}`}>
                      {m.source === 'gemini'
                        ? `Gemini · ${m.model || 'live data'}`
                        : 'Database fallback'}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {asking && (
              <div className="bubble ai">
                <span className="bubble-avatar"><Sparkles size={13} /></span>
                <div className="bubble-body">
                  <span className="bubble-name">Assistant</span>
                  <span className="typing" aria-label="Assistant is typing"><i /><i /><i /></span>
                </div>
              </div>
            )}
          </div>

          <div className="assistant-suggestions">
            <p className="suggestion-label">Suggested queries</p>
            <div className="assistant-chip-row">
              <button type="button" className="chip" onClick={() => handleQuickQuestion("Which medicines need reordering immediately?")} disabled={asking}>
                <Zap size={13} /> Reorder priorities
              </button>
              <button type="button" className="chip" onClick={() => handleQuickQuestion("What are the upcoming stock expiry risks?")} disabled={asking}>
                <Clock size={13} /> Expiry risks
              </button>
              <button type="button" className="chip" onClick={() => handleQuickQuestion("What are today's total sales?")} disabled={asking}>
                <Activity size={13} /> Today's sales
              </button>
              <button type="button" className="chip" onClick={() => handleQuickQuestion("Which medicines are low on stock?")} disabled={asking}>
                <Database size={13} /> Low stock
              </button>
            </div>
          </div>

          <form onSubmit={handleAskAssistant} className="assistant-form">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask about inventory, expiry, or purchasing..."
              aria-label="Ask the Operations Assistant"
              disabled={asking}
            />
            <button className="primary assistant-send" type="submit" disabled={asking || !prompt.trim()} aria-label="Send message">
              {asking ? <span className="assistant-spinner" /> : <Send size={15} />}
            </button>
          </form>
          </div>
        </div>

        <button
          type="button"
          className="ai-fab-circle"
          onClick={() => setAssistantOpen(true)}
          aria-label="Open Operations Assistant"
        >
          <span className="ai-fab-ring" />
          <Sparkles size={22} />
        </button>
      </div>
    </div>
  );
}
