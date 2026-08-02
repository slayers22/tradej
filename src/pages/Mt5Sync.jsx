import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function Mt5Sync() {
  const { user } = useAuth();
  const [conn, setConn] = useState(null);
  const [form, setForm] = useState({ label: 'MT5 account', ftp_host: '', ftp_port: 21, ftp_user: '', ftp_password: '', report_path: '/statement.csv' });
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    const { data } = await supabase.from('mt5_connections_safe').select('*').eq('user_id', user.id).maybeSingle();
    setConn(data);
  }

  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    const { error } = await supabase.from('mt5_connections').insert({ ...form, user_id: user.id });
    if (error) setMsg(`Save failed: ${error.message}`);
    else { setMsg('Connection saved.'); load(); }
  }

  async function removeConn() {
    if (!conn || !confirm('Remove this connection?')) return;
    await supabase.from('mt5_connections').delete().eq('id', conn.id);
    setConn(null);
  }

  async function syncNow() {
    setSyncing(true);
    setMsg('Syncing...');
    const { data, error } = await supabase.functions.invoke('mt5-sync', {
      body: { connection_id: conn.id },
    });
    setSyncing(false);
    if (error) setMsg(`Sync failed: ${error.message}`);
    else setMsg(`Sync done: ${JSON.stringify(data.results?.[0]?.status ?? data)}`);
    load();
  }

  return (
    <div className="stack">
      <h1>MT4/5 Sync</h1>
      <div className="card">
        <p className="muted">
          Connects to your broker's FTP export and pulls closed trades automatically
          every 15 minutes (via scheduled sync), plus a manual "Sync now" button.
          Report must be a CSV with columns: ticket, symbol, type, open_time,
          close_time, open_price, close_price, volume, profit, commission, swap.
          Ask your broker/prop firm how to enable scheduled FTP statement export —
          column names vary, the sync function may need adjusting to match.
        </p>

        {conn ? (
          <div className="stack">
            <p><strong>{conn.label}</strong> — {conn.ftp_host}:{conn.ftp_port}</p>
            <p className="muted">
              Last synced: {conn.last_synced_at ? new Date(conn.last_synced_at).toLocaleString() : 'never'}
              {conn.last_sync_status ? ` — ${conn.last_sync_status}` : ''}
            </p>
            <div className="row">
              <button className="btn-primary" onClick={syncNow} disabled={syncing}>{syncing ? 'Syncing...' : 'Sync now'}</button>
              <button className="btn-ghost danger" onClick={removeConn}>Remove connection</button>
            </div>
          </div>
        ) : (
          <form className="stack" onSubmit={save}>
            <label>Label</label>
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            <label>FTP host</label>
            <input value={form.ftp_host} onChange={(e) => setForm({ ...form, ftp_host: e.target.value })} required />
            <label>FTP port</label>
            <input type="number" value={form.ftp_port} onChange={(e) => setForm({ ...form, ftp_port: parseInt(e.target.value) || 21 })} />
            <label>FTP username</label>
            <input value={form.ftp_user} onChange={(e) => setForm({ ...form, ftp_user: e.target.value })} required />
            <label>FTP password</label>
            <input type="password" value={form.ftp_password} onChange={(e) => setForm({ ...form, ftp_password: e.target.value })} required />
            <label>Report file path</label>
            <input value={form.report_path} onChange={(e) => setForm({ ...form, report_path: e.target.value })} />
            <button className="btn-primary" type="submit">Save connection</button>
          </form>
        )}
        {msg && <div className="info">{msg}</div>}
      </div>
    </div>
  );
}
