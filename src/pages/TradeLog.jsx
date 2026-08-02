import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

const empty = {
  symbol: '', side: 'long', entry_price: '', exit_price: '', size: '',
  entry_date: '', exit_date: '', fees: '', notes: '',
};

export default function TradeLog() {
  const { user } = useAuth();
  const [trades, setTrades] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

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

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      entry_price: parseFloat(form.entry_price) || null,
      exit_price: form.exit_price ? parseFloat(form.exit_price) : null,
      size: parseFloat(form.size) || null,
      fees: form.fees ? parseFloat(form.fees) : 0,
      user_id: user.id,
      pnl: calcPnl(form),
    };
    if (editingId) {
      await supabase.from('trades').update(payload).eq('id', editingId);
    } else {
      await supabase.from('trades').insert(payload);
    }
    setForm(empty);
    setEditingId(null);
    load();
  }

  function startEdit(t) {
    setForm({
      symbol: t.symbol, side: t.side, entry_price: t.entry_price, exit_price: t.exit_price ?? '',
      size: t.size, entry_date: t.entry_date, exit_date: t.exit_date ?? '', fees: t.fees ?? '', notes: t.notes ?? '',
    });
    setEditingId(t.id);
  }

  async function remove(id) {
    if (!confirm('Delete this trade?')) return;
    await supabase.from('trades').delete().eq('id', id);
    load();
  }

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
        <label>Notes</label>
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
        <div className="row">
          <button className="btn-primary" type="submit">{editingId ? 'Update trade' : 'Add trade'}</button>
          {editingId && <button type="button" className="btn-ghost" onClick={() => { setForm(empty); setEditingId(null); }}>Cancel</button>}
        </div>
      </form>

      {loading ? <div className="center">Loading...</div> : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Symbol</th><th>Side</th><th>Entry</th><th>Exit</th><th>Size</th><th>PnL</th><th>Date</th><th></th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr key={t.id}>
                  <td>{t.symbol}</td>
                  <td className={t.side === 'long' ? 'long' : 'short'}>{t.side}</td>
                  <td>{t.entry_price}</td>
                  <td>{t.exit_price ?? '-'}</td>
                  <td>{t.size}</td>
                  <td className={t.pnl >= 0 ? 'pnl-pos' : 'pnl-neg'}>{t.pnl != null ? t.pnl.toFixed(2) : '-'}</td>
                  <td>{t.entry_date}</td>
                  <td className="actions">
                    <button className="btn-ghost small" onClick={() => startEdit(t)}>Edit</button>
                    <button className="btn-ghost small danger" onClick={() => remove(t.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {trades.length === 0 && <tr><td colSpan={8} className="muted center">No trades yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
