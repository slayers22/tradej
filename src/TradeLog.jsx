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

const empty = {
  symbol: '', side: 'long', entry_price: '', exit_price: '', size: '',
  entry_date: '', exit_date: '', fees: '', notes: '',
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
  const [saveError, setSaveError] = useState('');

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

  function calcPnl(t) {
    const entry = parseFloat(t.entry_price);
    const exit = parseFloat(t.exit_price);
    const size = parseFloat(t.size);
    const fees = parseFloat(t.fees) || 0;
    if (isNaN(entry) || isNaN(exit) || isNaN(size)) return null;
    const raw = t.side === 'long' ? (exit - entry) * size : (entry - exit) * size;
    return raw - fees;
  }

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
    setSaveError('');
    const payload = {
      ...form,
      entry_price: parseFloat(form.entry_price) || null,
      exit_price: form.exit_price ? parseFloat(form.exit_price) : null,
      size: parseFloat(form.size) || null,
      fees: form.fees ? parseFloat(form.fees) : 0,
      rating: form.rating || 0,
      user_id: user.id,
      pnl: calcPnl(form),
    };

    let tradeId = editingId;
    if (editingId) {
      const { error } = await supabase.from('trades').update(payload).eq('id', editingId);
      if (error) { setSaveError(error.message); return; }
    } else {
      const { data, error } = await supabase.from('trades').insert(payload).select().single();
      if (error) { setSaveError(error.message); return; }
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
  }

  function startEdit(t) {
    setForm({
      symbol: t.symbol, side: t.side, entry_price: t.entry_price, exit_price: t.exit_price ?? '',
      size: t.size, entry_date: t.entry_date, exit_date: t.exit_date ?? '', fees: t.fees ?? '',
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
        <div className="grid">
          <div>
            <label>Symbol</label>
            <input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} required />
          </div>
          <div>
            <label>Side</label>
            <select value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value })}>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </div>
          <div>
            <label>Entry price</label>
            <input type="number" step="any" value={form.entry_price} onChange={(e) => setForm({ ...form, entry_price: e.target.value })} required />
          </div>
          <div>
            <label>Exit price</label>
            <input type="number" step="any" value={form.exit_price} onChange={(e) => setForm({ ...form, exit_price: e.target.value })} />
          </div>
          <div>
            <label>Size</label>
            <input type="number" step="any" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} required />
          </div>
          <div>
            <label>Fees</label>
            <input type="number" step="any" value={form.fees} onChange={(e) => setForm({ ...form, fees: e.target.value })} />
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

        <label>Notes</label>
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />

        {saveError && <div className="error">Save failed: {saveError}</div>}
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
                <th>Symbol</th><th>Side</th><th>Entry</th><th>Exit</th><th>Size</th><th>PnL</th><th>Rating</th><th>Date</th><th></th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <React.Fragment key={t.id}>
                  <tr className="clickable" onClick={() => setOpenRow(openRow === t.id ? null : t.id)}>
                    <td><span className="symbol-chip">{t.symbol}</span></td>
                    <td><span className={t.side === 'long' ? 'badge badge-long' : 'badge badge-short'}>{t.side}</span></td>
                    <td>{t.entry_price}</td>
                    <td>{t.exit_price ?? '-'}</td>
                    <td>{t.size}</td>
                    <td>{t.pnl != null ? <span className={`pnl-pill ${t.pnl >= 0 ? 'pos' : 'neg'}`}>{t.pnl >= 0 ? '+' : ''}{t.pnl.toFixed(2)}</span> : '-'}</td>
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
