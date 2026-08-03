import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

const CHECKLIST_ITEMS = [
  { key: 'higher_timeframe', label: 'Checked higher timeframe' },
  { key: 'risk_within_limits', label: 'Risk within limits' },
  { key: 'fits_trading_plan', label: 'Fits my trading plan' },
  { key: 'key_levels_identified', label: 'Key levels identified' },
  { key: 'economic_calendar_checked', label: 'Economic calendar checked' },
];

const emptyChecklist = CHECKLIST_ITEMS.reduce((acc, c) => ({ ...acc, [c.key]: false }), {});

// Standard contract sizes per lot
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
  pre_trade_analysis: '', post_trade_review: '', lessons_learned: '',
  rating: 0, checklist: emptyChecklist,
};

export default function TradeLog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trades, setTrades] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openRow, setOpenRow] = useState(null);
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

  async function uploadScreenshots(tradeId) {
    const urls = [];
    for (const file of files) {
      const path = `${user.id}/${tradeId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('trade-screenshots').upload(path, file);
      if (!error) urls.push(path);
    }
    return urls;
  }

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
      pre_trade_analysis: form.pre_trade_analysis || '',
      post_trade_review: form.post_trade_review || '',
      lessons_learned: form.lessons_learned || '',
      rating: form.rating || 0,
      checklist: form.checklist,
      user_id: user.id,
      profit,
      source: 'manual',
    };

    let tradeId = editingId;
    try {
      if (editingId) {
        const { error } = await supabase.from('trades').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('trades').insert(payload).select().single();
        if (error) throw error;
        tradeId = data.id;
      }

      if (files.length && tradeId) {
        const newUrls = await uploadScreenshots(tradeId);
        const existing = editingId ? (trades.find((t) => t.id === tradeId)?.screenshot_urls || []) : [];
        await supabase.from('trades').update({ screenshot_urls: [...existing, ...newUrls] }).eq('id', tradeId);
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
    setShowChecklist(false);
    setFiles([]);
    setSubmitError('');
    setShowModal(true);
  }

  function openEditModal(t) {
    setForm({
      symbol: t.symbol, trade_type: t.trade_type, open_price: t.open_price, close_price: t.close_price ?? '',
      volume: t.volume, entry_date: t.entry_date, exit_date: t.exit_date ?? '',
      notes: t.notes ?? '', pre_trade_analysis: t.pre_trade_analysis ?? '', post_trade_review: t.post_trade_review ?? '',
      lessons_learned: t.lessons_learned ?? '', rating: t.rating ?? 0, checklist: t.checklist ?? emptyChecklist,
    });
    setEditingId(t.id);
    setShowChecklist(false);
    setFiles([]);
    setSubmitError('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setForm(empty);
    setEditingId(null);
    setFiles([]);
    setSubmitError('');
    setShowChecklist(false);
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

  function toggleChecklist(key) {
    setForm({ ...form, checklist: { ...form.checklist, [key]: !form.checklist[key] } });
  }

  const checklistDone = Object.values(form.checklist).filter(Boolean).length;

  return (
    <div className="stack">
      {/* Page Header */}
      <div className="trades-header">
        <div>
          <h1 style={{ margin: 0 }}>Trades</h1>
        </div>
        <div className="trades-header-actions">
          <button className="btn-accent" onClick={() => navigate('/mt5')}>Connect MT4/MT5</button>
          <button className="btn-outline-danger" onClick={clearAll}>🗑 Clear All</button>
          <button className="btn-primary" onClick={openAddModal}>+ Add Trade</button>
        </div>
      </div>

      {/* Trade History Card */}
      <div className="card">
        <div className="trade-history-header">
          <div>
            <span className="trade-history-title">Trade History</span>
            <span className="trade-count">{trades.length} trades</span>
          </div>
        </div>

        {loading ? <div className="center">Loading...</div> : (
          <div className="table-wrap">
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
                  <th>RATING</th>
                  <th>SOURCE</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => (
                  <React.Fragment key={t.id}>
                    <tr className="clickable" onClick={() => setOpenRow(openRow === t.id ? null : t.id)}>
                      <td className="muted">{t.entry_date}{t.exit_date ? ` → ${t.exit_date}` : ''}</td>
                      <td><span className="symbol-chip">{t.symbol}</span></td>
                      <td><span className={t.trade_type === 'long' ? 'badge badge-long' : 'badge badge-short'}>{t.trade_type}</span></td>
                      <td>{t.open_price}</td>
                      <td>{t.close_price ?? '—'}</td>
                      <td>{t.volume}</td>
                      <td>{t.profit != null ? <span className={`pnl-pill ${Number(t.profit) >= 0 ? 'pos' : 'neg'}`}>{Number(t.profit) >= 0 ? '+' : ''}{Number(t.profit).toFixed(2)}</span> : '—'}</td>
                      <td className="star-cell">{'★'.repeat(t.rating || 0)}</td>
                      <td><span className="source-badge">{t.source || 'manual'}</span></td>
                      <td className="actions" onClick={(e) => e.stopPropagation()}>
                        <button className="btn-ghost small" onClick={() => openEditModal(t)}>Edit</button>
                        <button className="btn-ghost small danger" onClick={() => remove(t.id)}>Delete</button>
                      </td>
                    </tr>
                    {openRow === t.id && (
                      <tr className="detail-row">
                        <td colSpan={10}>
                          {t.pre_trade_analysis && <p><strong>Pre-trade:</strong> {t.pre_trade_analysis}</p>}
                          {t.post_trade_review && <p><strong>Post-trade:</strong> {t.post_trade_review}</p>}
                          {t.lessons_learned && <p><strong>Lessons:</strong> {t.lessons_learned}</p>}
                          {t.notes && <p><strong>Notes:</strong> {t.notes}</p>}
                          {t.checklist && (
                            <p className="muted">
                              Checklist: {CHECKLIST_ITEMS.filter((c) => t.checklist[c.key]).map((c) => c.label).join(', ') || 'none checked'}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {trades.length === 0 && (
                  <tr>
                    <td colSpan={10} className="empty-state">
                      <div className="empty-icon">📋</div>
                      <p>No trades yet</p>
                      <button className="btn-primary" onClick={openAddModal}>+ Add your first trade</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Overlay */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span className="modal-icon">+</span>
                <span>{editingId ? 'Edit Trade' : 'Add Trade'}</span>
              </div>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              {submitError && <div className="error" style={{ marginBottom: 16 }}>{submitError}</div>}

              {/* Long/Short Toggle */}
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

              {/* Form Fields - 2 column grid */}
              <div className="modal-grid">
                <div>
                  <label className="modal-label">SYMBOL</label>
                  <input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} placeholder="E.G. XAUUSD" required />
                </div>
                <div>
                  <label className="modal-label">QUANTITY</label>
                  <input type="number" step="any" value={form.volume} onChange={(e) => setForm({ ...form, volume: e.target.value })} placeholder="Lots" required />
                </div>
              </div>

              <div className="modal-grid">
                <div>
                  <label className="modal-label">ENTRY PRICE</label>
                  <input type="number" step="any" value={form.open_price} onChange={(e) => setForm({ ...form, open_price: e.target.value })} placeholder="0.00" required />
                </div>
                <div>
                  <label className="modal-label">EXIT PRICE</label>
                  <input type="number" step="any" value={form.close_price} onChange={(e) => setForm({ ...form, close_price: e.target.value })} placeholder="Optional" />
                </div>
              </div>

              <div className="modal-grid">
                <div>
                  <label className="modal-label">ENTRY DATE</label>
                  <input type="datetime-local" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} required />
                </div>
                <div>
                  <label className="modal-label">EXIT DATE</label>
                  <input type="datetime-local" value={form.exit_date} onChange={(e) => setForm({ ...form, exit_date: e.target.value })} placeholder="Optional" />
                </div>
              </div>

              {/* Pre-Trade Checklist Collapsible */}
              <div className="checklist-toggle" onClick={() => setShowChecklist(!showChecklist)}>
                <span className="chevron">{showChecklist ? '▾' : '›'}</span>
                <span>Pre-Trade Checklist (Optional)</span>
              </div>

              {showChecklist && (
                <div className="checklist-section">
                  <div className="checklist">
                    {CHECKLIST_ITEMS.map((c) => (
                      <label key={c.key} className="checklist-item">
                        <input type="checkbox" checked={form.checklist[c.key]} onChange={() => toggleChecklist(c.key)} />
                        {c.label}
                      </label>
                    ))}
                  </div>
                  <span className="muted" style={{ fontSize: 12, marginTop: 4 }}>{checklistDone}/{CHECKLIST_ITEMS.length} completed</span>

                  <label className="modal-label" style={{ marginTop: 12 }}>Pre-trade analysis</label>
                  <textarea value={form.pre_trade_analysis} onChange={(e) => setForm({ ...form, pre_trade_analysis: e.target.value })} rows={2} placeholder="Setup, thesis, why taking this trade..." />

                  <label className="modal-label" style={{ marginTop: 8 }}>Post-trade review</label>
                  <textarea value={form.post_trade_review} onChange={(e) => setForm({ ...form, post_trade_review: e.target.value })} rows={2} placeholder="What happened, did the plan play out..." />

                  <label className="modal-label" style={{ marginTop: 8 }}>Lessons learned</label>
                  <textarea value={form.lessons_learned} onChange={(e) => setForm({ ...form, lessons_learned: e.target.value })} rows={2} />

                  <label className="modal-label" style={{ marginTop: 8 }}>Rating</label>
                  <div className="stars">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className={n <= form.rating ? 'star filled' : 'star'} onClick={() => setForm({ ...form, rating: n })}>★</span>
                    ))}
                  </div>

                  <label className="modal-label" style={{ marginTop: 8 }}>Screenshots</label>
                  <input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files))} />
                </div>
              )}

              {/* Notes */}
              <label className="modal-label" style={{ marginTop: 16 }}>NOTES</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Trade rationale, entry/exit notes..." />

              {/* Actions */}
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary">{editingId ? 'Update Trade' : 'Save Trade'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
