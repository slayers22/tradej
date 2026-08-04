import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  List, 
  Plus, 
  Trash2, 
  Edit2, 
  Link as LinkIcon, 
  X, 
  TrendingUp, 
  TrendingDown, 
  CalendarDays,
  FileText
} from 'lucide-react';

const CONTRACT_SIZES = {
  XAUUSD: 100, XAGUSD: 5000, XAUEUR: 100, XAUGBP: 100,
  USOIL: 1000, UKOIL: 1000, WTI: 1000, BRENT: 1000, CRUDEOIL: 1000,
  NGAS: 10000, NATGAS: 10000,
  US30: 1, US500: 1, SPX500: 1, NAS100: 1, USTEC: 1, US100: 1,
  UK100: 1, GER40: 1, GER30: 1, FRA40: 1, JPN225: 1, AUS200: 1, DJ30: 1,
  BTCUSD: 1, ETHUSD: 1, LTCUSD: 1, XRPUSD: 1, BNBUSD: 1, SOLUSD: 1,
};

function getContractSize(symbol) {
  const s = (symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (CONTRACT_SIZES[s] != null) return CONTRACT_SIZES[s];
  for (const [key, size] of Object.entries(CONTRACT_SIZES)) {
    if (s.startsWith(key) || s.endsWith(key)) return size;
  }
  const forexPattern = /^[A-Z]{6}$/;
  const currencies = ['USD','EUR','GBP','JPY','CHF','AUD','NZD','CAD','SGD','HKD','NOK','SEK','ZAR','TRY','MXN','PLN','CZK','HUF','INR'];
  if (forexPattern.test(s)) {
    const base = s.slice(0, 3), quote = s.slice(3, 6);
    if (currencies.includes(base) && currencies.includes(quote)) return 100000;
  }
  return 1;
}

const empty = {
  symbol: '', trade_type: 'long', open_price: '', close_price: '', volume: '',
  entry_date: '', exit_date: '', notes: '',
};

export default function TradeLog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trades, setTrades] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState('');

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .order('entry_date', { ascending: false });
    if (!error) setTrades(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError('');

    const required = { symbol: form.symbol, trade_type: form.trade_type, open_price: form.open_price, volume: form.volume, entry_date: form.entry_date };
    const missing = Object.entries(required).filter(([, v]) => !v || (typeof v === 'string' && v.trim() === ''));
    if (missing.length) {
      setSubmitError(`Missing required fields: ${missing.map(([k]) => k).join(', ')}`);
      return;
    }

    const openPrice = parseFloat(form.open_price);
    const volume = parseFloat(form.volume);
    const closePrice = form.close_price ? parseFloat(form.close_price) : null;
    const contractSize = getContractSize(form.symbol);

    if (isNaN(openPrice) || isNaN(volume) || (closePrice !== null && isNaN(closePrice))) {
      setSubmitError('Prices and volume must be valid numbers');
      return;
    }

    const profit = closePrice !== null
      ? (form.trade_type === 'long'
          ? (closePrice - openPrice) * volume * contractSize
          : (openPrice - closePrice) * volume * contractSize)
      : null;

    const payload = {
      symbol: form.symbol.trim().toUpperCase(),
      trade_type: form.trade_type,
      open_price: openPrice,
      close_price: closePrice,
      volume,
      entry_date: form.entry_date,
      exit_date: form.exit_date || null,
      notes: form.notes || '',
      user_id: user.id,
      profit,
      source: 'manual',
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('trades').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('trades').insert(payload);
        if (error) throw error;
      }

      closeModal();
      load();
    } catch (err) {
      setSubmitError(err.message || 'Failed to save trade');
    }
  }

  function openAddModal() {
    setForm(empty);
    setEditingId(null);
    setSubmitError('');
    setShowModal(true);
  }

  function openEditModal(t) {
    setForm({
      symbol: t.symbol, trade_type: t.trade_type, open_price: t.open_price, close_price: t.close_price ?? '',
      volume: t.volume, entry_date: t.entry_date, exit_date: t.exit_date ?? '',
      notes: t.notes ?? '',
    });
    setEditingId(t.id);
    setSubmitError('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setForm(empty);
    setEditingId(null);
    setSubmitError('');
  }

  async function remove(id) {
    if (!confirm('Delete this trade?')) return;
    await supabase.from('trades').delete().eq('id', id);
    load();
  }

  async function clearAll() {
    if (!confirm('Delete ALL trades? This cannot be undone.')) return;
    await supabase.from('trades').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    load();
  }

  return (
    <motion.div 
      className="stack"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="trades-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <List size={28} style={{ color: 'var(--muted)' }} />
            Trades
          </h1>
        </div>
        <div className="trades-header-actions" style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/mt5')}>
            <LinkIcon size={16} /> Connect MT4/MT5
          </button>
          <button className="btn btn-danger" onClick={clearAll}>
            <Trash2 size={16} /> Clear All
          </button>
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={16} /> Add Trade
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="trade-history-header" style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--border)', margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '16px', fontWeight: 600 }}>Execution Log</span>
            <span className="badge badge-neutral">{trades.length} trades</span>
          </div>
        </div>

        {loading ? (
          <div className="center" style={{ padding: '40px' }}>Loading...</div>
        ) : (
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>SYMBOL</th>
                  <th>TYPE</th>
                  <th>ENTRY</th>
                  <th>EXIT</th>
                  <th>SIZE</th>
                  <th>P&L</th>
                  <th>SOURCE</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {trades.map((t) => (
                    <motion.tr 
                      key={t.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                      layout
                    >
                      <td className="muted">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CalendarDays size={14} />
                          {t.entry_date.split('T')[0]}
                        </div>
                      </td>
                      <td><span className="symbol-chip">{t.symbol}</span></td>
                      <td>
                        <span className={t.trade_type === 'long' ? 'badge badge-long' : 'badge badge-short'} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {t.trade_type === 'long' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {t.trade_type}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-heading)' }}>{t.open_price}</td>
                      <td style={{ fontFamily: 'var(--font-heading)', color: t.close_price ? 'inherit' : 'var(--muted)' }}>{t.close_price ?? '—'}</td>
                      <td>{t.volume}</td>
                      <td>
                        {t.profit != null ? (
                          <span className={Number(t.profit) >= 0 ? 'text-pos' : 'text-neg'} style={{ fontWeight: 600 }}>
                            {Number(t.profit) >= 0 ? '+' : ''}{Number(t.profit).toFixed(2)}
                          </span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td><span className="badge badge-neutral" style={{ fontSize: '10px' }}>{t.source || 'manual'}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => openEditModal(t)}>
                            <Edit2 size={14} />
                          </button>
                          <button className="btn btn-ghost" style={{ padding: '6px', color: 'var(--neg)' }} onClick={() => remove(t.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {trades.length === 0 && (
                  <tr>
                    <td colSpan={9}>
                      <div className="center" style={{ flexDirection: 'column', gap: '16px', padding: '60px 20px', color: 'var(--muted)' }}>
                        <div style={{ width: '48px', height: '48px', background: 'var(--bg-hover)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FileText size={24} />
                        </div>
                        <p style={{ margin: 0 }}>No trades found in your log.</p>
                        <button className="btn btn-primary" onClick={openAddModal}><Plus size={16} /> Add your first trade</button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="modal-overlay" onClick={closeModal}>
            <motion.div 
              className="modal" 
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="modal-header">
                <div className="modal-title">
                  {editingId ? <Edit2 size={20} className="muted" /> : <Plus size={20} className="muted" />}
                  <span>{editingId ? 'Edit Trade' : 'Add Trade'}</span>
                </div>
                <button className="modal-close" onClick={closeModal}><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="modal-body">
                {submitError && <div className="error" style={{ marginBottom: 16 }}>{submitError}</div>}

                <div className="side-toggle">
                  <button
                    type="button"
                    className={`toggle-btn ${form.trade_type === 'long' ? 'active-long' : ''}`}
                    onClick={() => setForm({ ...form, trade_type: 'long' })}
                  >
                    ↗ Long
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${form.trade_type === 'short' ? 'active-short' : ''}`}
                    onClick={() => setForm({ ...form, trade_type: 'short' })}
                  >
                    ↘ Short
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">SYMBOL</label>
                    <input className="form-input" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} placeholder="E.G. XAUUSD" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">QUANTITY (LOTS)</label>
                    <input className="form-input" type="number" step="any" value={form.volume} onChange={(e) => setForm({ ...form, volume: e.target.value })} placeholder="1.0" required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">ENTRY PRICE</label>
                    <input className="form-input" type="number" step="any" value={form.open_price} onChange={(e) => setForm({ ...form, open_price: e.target.value })} placeholder="0.00" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">EXIT PRICE</label>
                    <input className="form-input" type="number" step="any" value={form.close_price} onChange={(e) => setForm({ ...form, close_price: e.target.value })} placeholder="Optional" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">ENTRY DATE</label>
                    <input className="form-input" type="datetime-local" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">EXIT DATE</label>
                    <input className="form-input" type="datetime-local" value={form.exit_date} onChange={(e) => setForm({ ...form, exit_date: e.target.value })} placeholder="Optional" />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label className="form-label">NOTES</label>
                  <textarea 
                    className="form-input"
                    value={form.notes} 
                    onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                    rows={3} 
                    placeholder="Trade rationale, entry/exit notes..." 
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editingId ? 'Update Trade' : 'Save Trade'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
