import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

const CHECKLIST_ITEMS = [
  { key: 'higher_timeframe', label: 'Checked higher timeframe' },
  { key: 'risk_within_limits', label: 'Risk within limits' },
  { key: 'fits_trading_plan', label: 'Fits my trading plan' },
  { key: 'key_levels_identified', label: 'Key levels identified' },
  { key: 'economic_calendar_checked', label: 'Economic calendar checked' },
];

const emptyChecklist = CHECKLIST_ITEMS.reduce((acc, c) => ({ ...acc, [c.key]: false }), {});

// Standard contract sizes per lot (most common broker defaults)
const CONTRACT_SIZES = {
  // Precious metals
  XAUUSD: 100,    // 100 oz per lot
  XAGUSD: 5000,   // 5000 oz per lot
  XAUEUR: 100,
  XAUGBP: 100,

  // Energies
  USOIL: 1000,    // 1000 barrels per lot
  UKOIL: 1000,
  WTI: 1000,
  BRENT: 1000,
  CRUDEOIL: 1000,
  NGAS: 10000,    // 10000 MMBtu per lot
  NATGAS: 10000,

  // Indices (CFDs — typically 1 contract = 1 unit of index)
  US30: 1,
  US500: 1,
  SPX500: 1,
  NAS100: 1,
  USTEC: 1,
  US100: 1,
  UK100: 1,
  GER40: 1,
  GER30: 1,
  FRA40: 1,
  JPN225: 1,
  AUS200: 1,
  DJ30: 1,

  // Crypto (typically 1 unit per lot)
  BTCUSD: 1,
  ETHUSD: 1,
  LTCUSD: 1,
  XRPUSD: 1,
  BNBUSD: 1,
  SOLUSD: 1,
  ADAUSD: 1,
  DOTUSD: 1,
};

// Detect contract size from symbol
function getContractSize(symbol) {
  const s = (symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Exact match first
  if (CONTRACT_SIZES[s] != null) return CONTRACT_SIZES[s];

  // Check if symbol starts with or contains a known key
  for (const [key, size] of Object.entries(CONTRACT_SIZES)) {
    if (s.startsWith(key) || s.endsWith(key)) return size;
  }

  // Forex pairs: 6-char symbols like EURUSD, GBPJPY, etc.
  // Standard lot = 100,000 units of base currency
  const forexPattern = /^[A-Z]{6}$/;
  const commonCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'NZD', 'CAD', 'SGD', 'HKD', 'NOK', 'SEK', 'ZAR', 'TRY', 'MXN', 'PLN', 'CZK', 'HUF', 'INR'];
  if (forexPattern.test(s)) {
    const base = s.slice(0, 3);
    const quote = s.slice(3, 6);
    if (commonCurrencies.includes(base) && commonCurrencies.includes(quote)) {
      return 100000;
    }
  }

  // Default: 1 (raw units — user should set contract size manually)
  return 1;
}

// Get display hint for the contract size
function getContractHint(symbol) {
  const size = getContractSize(symbol);
  if (size === 100000) return 'Forex (100K per lot)';
  if (size === 100) return 'Gold (100 oz per lot)';
  if (size === 5000) return 'Silver (5000 oz per lot)';
  if (size === 1000) return 'Oil (1000 bbl per lot)';
  if (size === 10000) return 'NatGas (10K MMBtu per lot)';
  if (size === 1) return 'Index/Crypto (1 unit per lot)';
  return `${size} units per lot`;
}

const empty = {
  symbol: '', trade_type: 'long', open_price: '', close_price: '', volume: '',
  entry_date: '', exit_date: '', notes: '', contract_size: '',
  pre_trade_analysis: '', post_trade_review: '', lessons_learned: '',
  rating: 0, checklist: emptyChecklist,
};

export default function TradeLog() {
  const { user } = useAuth();
  const [trades, setTrades] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openRow, setOpenRow] = useState(null);
  const [submitError, setSubmitError] = useState('');

  // Auto-detected contract size (from symbol), can be overridden by form.contract_size
  const autoContractSize = getContractSize(form.symbol);
  const effectiveContractSize = form.contract_size ? parseFloat(form.contract_size) : autoContractSize;

  // Live PnL preview
  const livePnl = (() => {
    const open = parseFloat(form.open_price);
    const close = parseFloat(form.close_price);
    const vol = parseFloat(form.volume);
    if (isNaN(open) || isNaN(close) || isNaN(vol)) return null;
    const raw = form.trade_type === 'long' ? (close - open) * vol * effectiveContractSize : (open - close) * vol * effectiveContractSize;
    return raw;
  })();

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

    // Validate required fields
    const required = { symbol: form.symbol, trade_type: form.trade_type, open_price: form.open_price, volume: form.volume, entry_date: form.entry_date };
    const missing = Object.entries(required).filter(([, v]) => !v || (typeof v === 'string' && v.trim() === ''));
    if (missing.length) {
      setSubmitError(`Missing required fields: ${missing.map(([k]) => k).join(', ')}`);
      return;
    }

    const openPrice = parseFloat(form.open_price);
    const volume = parseFloat(form.volume);
    const closePrice = form.close_price ? parseFloat(form.close_price) : null;

    if (isNaN(openPrice) || isNaN(volume) || (closePrice !== null && isNaN(closePrice))) {
      setSubmitError('Open price, volume, and close price must be valid numbers');
      return;
    }

    const profit = closePrice !== null
      ? (form.trade_type === 'long'
          ? (closePrice - openPrice) * volume * effectiveContractSize
          : (openPrice - closePrice) * volume * effectiveContractSize)
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

      setForm(empty);
      setFiles([]);
      setEditingId(null);
      setExpanded(false);
      load();
    } catch (err) {
      setSubmitError(err.message || 'Failed to save trade');
    }
  }

  function startEdit(t) {
    setForm({
      symbol: t.symbol, trade_type: t.trade_type, open_price: t.open_price, close_price: t.close_price ?? '',
      volume: t.volume, entry_date: t.entry_date, exit_date: t.exit_date ?? '', contract_size: '',
      notes: t.notes ?? '', pre_trade_analysis: t.pre_trade_analysis ?? '', post_trade_review: t.post_trade_review ?? '',
      lessons_learned: t.lessons_learned ?? '', rating: t.rating ?? 0, checklist: t.checklist ?? emptyChecklist,
    });
    setEditingId(t.id);
    setExpanded(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function remove(id) {
    if (!confirm('Delete this trade?')) return;
    await supabase.from('trades').delete().eq('id', id);
    load();
  }

  function toggleChecklist(key) {
    setForm({ ...form, checklist: { ...form.checklist, [key]: !form.checklist[key] } });
  }

  const checklistDone = Object.values(form.checklist).filter(Boolean).length;

  return (
    <div className="stack">
      <h1>Trade Log</h1>

      <form className="card trade-form" onSubmit={handleSubmit}>
        {submitError && <div className="error" style={{marginBottom: 12}}>{submitError}</div>}
        <div className="grid">
          <div>
            <label>Symbol</label>
            <input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} required />
          </div>
          <div>
            <label>Side</label>
            <select value={form.trade_type} onChange={(e) => setForm({ ...form, trade_type: e.target.value })}>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </div>
          <div>
            <label>Entry price</label>
            <input type="number" step="any" value={form.open_price} onChange={(e) => setForm({ ...form, open_price: e.target.value })} required />
          </div>
          <div>
            <label>Exit price</label>
            <input type="number" step="any" value={form.close_price} onChange={(e) => setForm({ ...form, close_price: e.target.value })} />
          </div>
          <div>
            <label>Volume (lots)</label>
            <input type="number" step="any" value={form.volume} onChange={(e) => setForm({ ...form, volume: e.target.value })} required />
          </div>
          <div>
            <label>Contract size</label>
            <input type="number" step="any" value={form.contract_size} onChange={(e) => setForm({ ...form, contract_size: e.target.value })} placeholder={`${autoContractSize} (auto)`} />
            {form.symbol && <span className="muted" style={{ fontSize: 11 }}>{getContractHint(form.symbol)}</span>}
          </div>
          <div>
            <label>Entry date</label>
            <input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} required />
          </div>
          <div>
            <label>Exit date</label>
            <input type="date" value={form.exit_date} onChange={(e) => setForm({ ...form, exit_date: e.target.value })} />
          </div>
        </div>

        {livePnl !== null && (
          <div style={{ marginTop: 10, fontSize: 15, fontWeight: 700 }}>
            Est. PnL:{' '}
            <span className={livePnl >= 0 ? 'pnl-pos' : 'pnl-neg'}>
              {livePnl >= 0 ? '+' : ''}{livePnl.toFixed(2)}
            </span>
            <span className="muted" style={{ fontWeight: 400, marginLeft: 8, fontSize: 12 }}>
              ({form.trade_type === 'long' ? 'exit − entry' : 'entry − exit'} × {form.volume || '0'} lots × {effectiveContractSize} contract)
            </span>
          </div>
        )}

        <button type="button" className="btn-ghost small" style={{ marginTop: 12 }} onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Hide review section' : 'Add pre/post-trade review'}
        </button>

        {expanded && (
          <div className="review-section">
            <label>Pre-trade analysis</label>
            <textarea value={form.pre_trade_analysis} onChange={(e) => setForm({ ...form, pre_trade_analysis: e.target.value })} rows={2} placeholder="Setup, thesis, why taking this trade..." />

            <label>Execution checklist ({checklistDone}/{CHECKLIST_ITEMS.length})</label>
            <div className="checklist">
              {CHECKLIST_ITEMS.map((c) => (
                <label key={c.key} className="checklist-item">
                  <input type="checkbox" checked={form.checklist[c.key]} onChange={() => toggleChecklist(c.key)} />
                  {c.label}
                </label>
              ))}
            </div>

            <label>Post-trade review</label>
            <textarea value={form.post_trade_review} onChange={(e) => setForm({ ...form, post_trade_review: e.target.value })} rows={2} placeholder="What happened, did the plan play out..." />

            <label>Lessons learned</label>
            <textarea value={form.lessons_learned} onChange={(e) => setForm({ ...form, lessons_learned: e.target.value })} rows={2} />

            <label>Rating</label>
            <div className="stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={n <= form.rating ? 'star filled' : 'star'} onClick={() => setForm({ ...form, rating: n })}>★</span>
              ))}
            </div>

            <label>Screenshots</label>
            <input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files))} />
          </div>
        )}

        <label>Notes</label>
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />

        <div className="row">
          <button className="btn-primary" type="submit">{editingId ? 'Update trade' : 'Add trade'}</button>
          {editingId && <button type="button" className="btn-ghost" onClick={() => { setForm(empty); setEditingId(null); setExpanded(false); }}>Cancel</button>}
        </div>
      </form>

      {loading ? <div className="center">Loading...</div> : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Symbol</th><th>Side</th><th>Entry</th><th>Exit</th><th>Volume</th><th>PnL</th><th>Rating</th><th>Date</th><th></th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <React.Fragment key={t.id}>
                  <tr className="clickable" onClick={() => setOpenRow(openRow === t.id ? null : t.id)}>
                    <td><span className="symbol-chip">{t.symbol}</span></td>
                    <td><span className={t.trade_type === 'long' ? 'badge badge-long' : 'badge badge-short'}>{t.trade_type}</span></td>
                    <td>{t.open_price}</td>
                    <td>{t.close_price ?? '-'}</td>
                    <td>{t.volume}</td>
                    <td>{t.profit != null ? <span className={`pnl-pill ${Number(t.profit) >= 0 ? 'pos' : 'neg'}`}>{Number(t.profit) >= 0 ? '+' : ''}{Number(t.profit).toFixed(2)}</span> : '-'}</td>
                    <td className="star-cell">{'★'.repeat(t.rating || 0)}</td>
                    <td>{t.entry_date}</td>
                    <td className="actions" onClick={(e) => e.stopPropagation()}>
                      <button className="btn-ghost small" onClick={() => startEdit(t)}>Edit</button>
                      <button className="btn-ghost small danger" onClick={() => remove(t.id)}>Delete</button>
                    </td>
                  </tr>
                  {openRow === t.id && (
                    <tr className="detail-row">
                      <td colSpan={9}>
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
              {trades.length === 0 && <tr><td colSpan={9} className="muted center">No trades yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
