import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

const EMOTION_OPTIONS = ['FOMO', 'Greed', 'Fear', 'Patient', 'Confident', 'Anxious', 'Revenge'];

export default function Journal() {
  const { user } = useAuth();
  const [trades, setTrades] = useState([]);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [preTrade, setPreTrade] = useState('');
  const [postTrade, setPostTrade] = useState('');
  const [lessons, setLessons] = useState('');
  const [risk, setRisk] = useState('');
  const [reward, setReward] = useState('');
  const [emotions, setEmotions] = useState([]);
  const [screenshots, setScreenshots] = useState([]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .order('entry_date', { ascending: false });
    if (!error) setTrades(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Sync form state when selected trade changes
  useEffect(() => {
    if (selectedTrade) {
      setPreTrade(selectedTrade.pre_trade_analysis || '');
      setPostTrade(selectedTrade.post_trade_review || '');
      setLessons(selectedTrade.lessons_learned || '');
      
      const rr = selectedTrade.risk_reward ? selectedTrade.risk_reward.split(':') : [];
      setRisk(rr[0] || '');
      setReward(rr[1] || '');
      
      setEmotions(selectedTrade.emotions || []);
      setScreenshots(selectedTrade.screenshot_urls || []);
    }
  }, [selectedTrade]);

  async function handleSave() {
    if (!selectedTrade) return;
    setSaving(true);
    const riskReward = (risk && reward) ? `${risk}:${reward}` : null;
    
    const payload = {
      pre_trade_analysis: preTrade,
      post_trade_review: postTrade,
      lessons_learned: lessons,
      risk_reward: riskReward,
      emotions: emotions
    };

    const { error } = await supabase
      .from('trades')
      .update(payload)
      .eq('id', selectedTrade.id);
      
    if (!error) {
      // Update local state
      const updated = { ...selectedTrade, ...payload };
      setTrades(trades.map(t => t.id === updated.id ? updated : t));
      setSelectedTrade(updated);
      alert('Journal saved successfully!');
    } else {
      alert('Failed to save journal: ' + error.message);
    }
    setSaving(false);
  }

  function toggleEmotion(emo) {
    if (emotions.includes(emo)) {
      setEmotions(emotions.filter(e => e !== emo));
    } else {
      setEmotions([...emotions, emo]);
    }
  }

  const isJournaled = (t) => !!(t.pre_trade_analysis || t.post_trade_review || t.lessons_learned);

  const filteredTrades = trades.filter(t => {
    if (filter === 'Journaled') return isJournaled(t);
    if (filter === 'Pending') return !isJournaled(t);
    return true;
  });

  const countAll = trades.length;
  const countJournaled = trades.filter(isJournaled).length;
  const countPending = countAll - countJournaled;

  return (
    <div className="journal-page">
      {/* Sidebar */}
      <div className={`journal-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="journal-sidebar-header">
          <h3>Trade Journal</h3>
          <button className="btn-ghost small" onClick={() => setSidebarOpen(false)}>«</button>
        </div>

        <div className="journal-filters">
          <button className={`filter-btn ${filter === 'All' ? 'active' : ''}`} onClick={() => setFilter('All')}>
            All <span className="count">{countAll}</span>
          </button>
          <button className={`filter-btn ${filter === 'Journaled' ? 'active' : ''}`} onClick={() => setFilter('Journaled')}>
            Journaled <span className="count">{countJournaled}</span>
          </button>
          <button className={`filter-btn ${filter === 'Pending' ? 'active' : ''}`} onClick={() => setFilter('Pending')}>
            Pending <span className="count">{countPending}</span>
          </button>
        </div>

        <div className="journal-list">
          {loading && <div className="center" style={{padding: 20}}>Loading...</div>}
          {!loading && filteredTrades.length === 0 && <div className="muted" style={{padding: 20, textAlign: 'center'}}>No trades found.</div>}
          {filteredTrades.map(t => {
            const won = t.profit !== null && Number(t.profit) >= 0;
            const closed = t.profit !== null;
            return (
              <div 
                key={t.id} 
                className={`journal-card ${selectedTrade?.id === t.id ? 'active' : ''}`}
                onClick={() => setSelectedTrade(t)}
              >
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 8}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                    <span className="symbol-chip">{t.symbol}</span>
                    {!isJournaled(t) && <span className="badge badge-short" style={{fontSize: 10}}>NEW</span>}
                  </div>
                  {isJournaled(t) && <span className="badge badge-long" style={{fontSize: 10, background: 'var(--accent)', color: 'white'}}>JOURNALED</span>}
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'}}>
                  <div>
                    <span className={t.trade_type === 'long' ? 'text-pos' : 'text-neg'} style={{fontWeight: 600, fontSize: 13, marginRight: 8}}>
                      {t.trade_type.charAt(0).toUpperCase() + t.trade_type.slice(1)}
                    </span>
                    <span className="muted" style={{fontSize: 13}}>${t.open_price}</span>
                  </div>
                  {closed ? (
                    <span className={won ? 'text-pos' : 'text-neg'} style={{fontWeight: 700}}>
                      {won ? '+' : ''}${Number(t.profit).toFixed(2)}
                    </span>
                  ) : (
                    <span className="muted" style={{fontSize: 13}}>Open</span>
                  )}
                </div>
                <div className="muted" style={{fontSize: 12, marginTop: 8}}>
                  {new Date(t.entry_date).toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="journal-content">
        {!sidebarOpen && (
          <button className="btn-ghost sidebar-toggle" onClick={() => setSidebarOpen(true)}>
            ☰ Show Trades
          </button>
        )}

        {!selectedTrade ? (
          <div className="journal-empty">
            <h2>Select a trade to journal</h2>
            <p className="muted">Click on a trade from the sidebar to view and edit its journal entry.</p>
          </div>
        ) : (
          <div className="journal-editor">
            {/* Header */}
            <div className="editor-header">
              <div className="editor-title">
                <span className="symbol-large">{selectedTrade.symbol}</span>
                {selectedTrade.profit !== null && (
                  <span className={`badge ${Number(selectedTrade.profit) >= 0 ? 'badge-long' : 'badge-short'}`} style={{fontSize: 14}}>
                    {Number(selectedTrade.profit) >= 0 ? 'WINNER' : 'LOSER'}
                  </span>
                )}
              </div>
              <div className="editor-actions">
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Journal'}
                </button>
              </div>
            </div>

            <div className="editor-meta muted">
              <span className={selectedTrade.trade_type === 'long' ? 'text-pos' : 'text-neg'}>
                {selectedTrade.trade_type.charAt(0).toUpperCase() + selectedTrade.trade_type.slice(1)}
              </span>
              <span> • Entry {selectedTrade.open_price}</span>
              <span> • Size {selectedTrade.volume}</span>
              <span> • {new Date(selectedTrade.entry_date).toLocaleString()}</span>
            </div>

            {/* Form Fields */}
            <div className="editor-body stack" style={{gap: '24px', marginTop: '32px'}}>
              <div className="journal-field">
                <label>
                  <span className="icon">📝</span> PRE-TRADE ANALYSIS
                </label>
                <textarea 
                  value={preTrade} 
                  onChange={e => setPreTrade(e.target.value)} 
                  placeholder="What did you see? Plan, thesis, levels, risk..." 
                  rows={4}
                />
              </div>

              <div className="journal-field">
                <label>
                  <span className="icon">✓</span> POST-TRADE REVIEW
                </label>
                <textarea 
                  value={postTrade} 
                  onChange={e => setPostTrade(e.target.value)} 
                  placeholder="What happened? Execution, slippage, improvements..." 
                  rows={4}
                />
              </div>

              <div className="journal-field risk-reward">
                <label>
                  <span className="icon">⚖️</span> RISK : REWARD
                </label>
                <div className="rr-inputs">
                  <input type="number" value={risk} onChange={e => setRisk(e.target.value)} placeholder="1" />
                  <span>:</span>
                  <input type="number" value={reward} onChange={e => setReward(e.target.value)} placeholder="2" />
                </div>
              </div>

              <div className="journal-field">
                <label>
                  <span className="icon">🧠</span> EMOTIONS
                </label>
                <div className="emotion-tags">
                  {EMOTION_OPTIONS.map(emo => (
                    <button 
                      key={emo}
                      className={`emotion-btn ${emotions.includes(emo) ? 'active' : ''}`}
                      onClick={() => toggleEmotion(emo)}
                    >
                      {emo}
                    </button>
                  ))}
                </div>
              </div>

              <div className="journal-field">
                <label>
                  <span className="icon">💡</span> LESSONS LEARNED
                </label>
                <textarea 
                  value={lessons} 
                  onChange={e => setLessons(e.target.value)} 
                  placeholder="Key takeaways for the next trade..." 
                  rows={3}
                />
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
