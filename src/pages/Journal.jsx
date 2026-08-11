import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PenLine, 
  CheckCircle2, 
  BrainCircuit, 
  Lightbulb, 
  Scale, 
  ChevronLeft, 
  Menu,
  Save
} from 'lucide-react';

const EMOTION_OPTIONS = ['FOMO', 'Greed', 'Fear', 'Patient', 'Confident', 'Anxious', 'Revenge'];

export default function Journal() {
  const { user } = useAuth();
  const [trades, setTrades] = useState([]);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [preTrade, setPreTrade] = useState('');
  const [postTrade, setPostTrade] = useState('');
  const [lessons, setLessons] = useState('');
  const [risk, setRisk] = useState('');
  const [reward, setReward] = useState('');
  const [emotions, setEmotions] = useState([]);

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

  useEffect(() => {
    if (selectedTrade) {
      setPreTrade(selectedTrade.pre_trade_analysis || '');
      setPostTrade(selectedTrade.post_trade_review || '');
      setLessons(selectedTrade.lessons_learned || '');
      
      const rr = selectedTrade.risk_reward ? selectedTrade.risk_reward.split(':') : [];
      setRisk(rr[0] || '');
      setReward(rr[1] || '');
      
      setEmotions(selectedTrade.emotions || []);
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
      <div className={`journal-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Trade Journal</h3>
          <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => setSidebarOpen(false)}>
            <ChevronLeft size={18} />
          </button>
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
          <AnimatePresence>
            {filteredTrades.map(t => {
              const won = t.profit !== null && Number(t.profit) >= 0;
              const closed = t.profit !== null;
              const isActive = selectedTrade?.id === t.id;
              
              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={t.id} 
                  className={`journal-card ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedTrade(t)}
                  style={{ padding: '16px' }}
                >
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 12}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                      <span className="symbol-chip">{t.symbol}</span>
                      {!isJournaled(t) && <span className="badge badge-short" style={{fontSize: 10}}>NEW</span>}
                    </div>
                    {isJournaled(t) && <span className="badge badge-long" style={{fontSize: 10}}>JOURNALED</span>}
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={t.trade_type === 'long' ? 'text-pos' : 'text-neg'} style={{fontWeight: 600, fontSize: 13}}>
                        {t.trade_type.charAt(0).toUpperCase() + t.trade_type.slice(1)}
                      </span>
                      <span className="muted" style={{fontSize: 13}}>{t.open_price}</span>
                    </div>
                    {closed ? (
                      <span className={won ? 'text-pos' : 'text-neg'} style={{fontWeight: 700, fontSize: '14px'}}>
                        {won ? '+' : ''}${Number(t.profit).toFixed(2)}
                      </span>
                    ) : (
                      <span className="badge badge-neutral">Open</span>
                    )}
                  </div>
                  <div className="muted" style={{fontSize: 12, marginTop: 12}}>
                    {new Date(t.entry_date).toLocaleDateString()} at {new Date(t.entry_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <div className="journal-content">
        {!sidebarOpen && (
          <button className="btn btn-ghost sidebar-toggle" onClick={() => setSidebarOpen(true)} style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 10, padding: '8px 16px' }}>
            <Menu size={16} /> Show Trades
          </button>
        )}

        {!selectedTrade ? (
          <div className="center" style={{ flexDirection: 'column', height: '100%', color: 'var(--muted)', gap: '16px' }}>
            <div style={{ width: '64px', height: '64px', background: 'var(--bg-hover)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PenLine size={32} />
            </div>
            <h2 style={{ color: 'var(--text)', margin: 0 }}>Select a trade to journal</h2>
            <p style={{ margin: 0 }}>Click on a trade from the sidebar to view and edit its journal entry.</p>
          </div>
        ) : (
          <motion.div 
            className="journal-editor"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={selectedTrade.id}
          >
            <div className="editor-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span className="symbol-large">{selectedTrade.symbol}</span>
                {selectedTrade.profit !== null && (
                  <span className={`badge ${Number(selectedTrade.profit) >= 0 ? 'badge-long' : 'badge-short'}`} style={{fontSize: 13, padding: '4px 12px'}}>
                    {Number(selectedTrade.profit) >= 0 ? 'WINNER' : 'LOSER'}
                  </span>
                )}
              </div>
              <div>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '10px 20px' }}>
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Save Journal'}
                </button>
              </div>
            </div>

            <div className="editor-meta muted" style={{ display: 'flex', gap: '12px', fontSize: '13px', marginBottom: '40px' }}>
              <span className={selectedTrade.trade_type === 'long' ? 'text-pos' : 'text-neg'} style={{ fontWeight: 600 }}>
                {selectedTrade.trade_type.charAt(0).toUpperCase() + selectedTrade.trade_type.slice(1)}
              </span>
              <span>•</span>
              <span>Entry {selectedTrade.open_price}</span>
              <span>•</span>
              <span>Size {selectedTrade.volume}</span>
              <span>•</span>
              <span>{new Date(selectedTrade.entry_date).toLocaleString()}</span>
            </div>

            <div className="stack" style={{ gap: '24px' }}>
              <div className="journal-field card">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                  <PenLine size={16} style={{ color: 'var(--accent)' }} /> PRE-TRADE ANALYSIS
                </label>
                <textarea 
                  value={preTrade} 
                  onChange={e => setPreTrade(e.target.value)} 
                  placeholder="What did you see? Plan, thesis, levels, risk..." 
                  style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text)', fontSize: '15px', lineHeight: 1.6, resize: 'vertical', minHeight: '100px', outline: 'none' }}
                />
              </div>

              <div className="journal-field card">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--pos)' }} /> POST-TRADE REVIEW
                </label>
                <textarea 
                  value={postTrade} 
                  onChange={e => setPostTrade(e.target.value)} 
                  placeholder="What happened? Execution, slippage, improvements..." 
                  style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text)', fontSize: '15px', lineHeight: 1.6, resize: 'vertical', minHeight: '100px', outline: 'none' }}
                />
              </div>

              <div className="journal-field card">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                  <Scale size={16} style={{ color: 'var(--warn)' }} /> RISK : REWARD
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <input type="number" className="form-input" value={risk} onChange={e => setRisk(e.target.value)} placeholder="1" style={{ width: '80px', textAlign: 'center', fontWeight: 600 }} />
                  <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--muted)' }}>:</span>
                  <input type="number" className="form-input" value={reward} onChange={e => setReward(e.target.value)} placeholder="2" style={{ width: '80px', textAlign: 'center', fontWeight: 600 }} />
                </div>
              </div>

              <div className="journal-field card">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                  <BrainCircuit size={16} style={{ color: 'var(--info)' }} /> EMOTIONS
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
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

              <div className="journal-field card">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                  <Lightbulb size={16} style={{ color: '#f59e0b' }} /> LESSONS LEARNED
                </label>
                <textarea 
                  value={lessons} 
                  onChange={e => setLessons(e.target.value)} 
                  placeholder="Key takeaways for the next trade..." 
                  style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text)', fontSize: '15px', lineHeight: 1.6, resize: 'vertical', minHeight: '100px', outline: 'none' }}
                />
              </div>

            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
