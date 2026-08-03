import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

// Simple function to generate a random 16-char hex token
function generateToken() {
  const array = new Uint8Array(8);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export default function Mt5Sync() {
  const { user } = useAuth();
  const [conn, setConn] = useState(null);
  const [label, setLabel] = useState('My MT5 Account');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  // The webhook URL points to the edge function.
  // We deduce the project URL from the supabase client URL.
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const webhookUrl = `${supabaseUrl}/functions/v1/mt5-sync`;

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('mt5_connections_safe').select('*').eq('user_id', user.id).maybeSingle();
    setConn(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    const token = generateToken();
    const { error } = await supabase.from('mt5_connections').insert({ 
      user_id: user.id, 
      label, 
      webhook_token: token 
    });
    if (error) {
      setMsg(`Failed to create connection: ${error.message}`);
    } else {
      setMsg('Connection created!');
      load();
    }
  }

  async function removeConn() {
    if (!conn || !window.confirm('Remove this connection? Your past synced trades will remain.')) return;
    await supabase.from('mt5_connections').delete().eq('id', conn.id);
    setConn(null);
  }

  if (loading) return <div className="center">Loading...</div>;

  return (
    <div className="stack">
      <div className="calendar-page-header">
        <div className="calendar-page-title">
          <h1><span style={{color: 'var(--muted)'}}>🔗</span> MT4/MT5 Webhook Sync</h1>
          <p>Sync your trades instantly and automatically for free</p>
        </div>
      </div>

      <div className="card">
        {conn ? (
          <div className="stack" style={{gap: '24px'}}>
            <div>
              <h3 style={{marginTop: 0}}>{conn.label}</h3>
              <p className="muted" style={{marginTop: 4, marginBottom: 0}}>
                Status: {conn.last_synced_at ? `Last synced ${new Date(conn.last_synced_at).toLocaleString()}` : 'Waiting for first sync...'}
              </p>
            </div>

            <div style={{background: 'var(--bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)'}}>
              <label style={{fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8, display: 'block'}}>
                Webhook URL
              </label>
              <div style={{display: 'flex', gap: 8, marginBottom: 16}}>
                <input type="text" readOnly value={webhookUrl} style={{flex: 1, fontFamily: 'monospace', fontSize: 13}} />
                <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(webhookUrl)}>Copy</button>
              </div>

              <label style={{fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8, display: 'block'}}>
                Your Sync Token (Secret)
              </label>
              <div style={{display: 'flex', gap: 8}}>
                <input type="text" readOnly value={conn.webhook_token} style={{flex: 1, fontFamily: 'monospace', fontSize: 13, color: 'var(--accent)'}} />
                <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(conn.webhook_token)}>Copy</button>
              </div>
            </div>

            <div className="stack" style={{gap: '12px'}}>
              <h4>How to set up MT5</h4>
              <ol style={{paddingLeft: 20, color: 'var(--muted)', margin: 0, display: 'flex', flexDirection: 'column', gap: 8}}>
                <li>Open MetaTrader 5 on your PC.</li>
                <li>Go to <strong>Tools &gt; Options &gt; Expert Advisors</strong>.</li>
                <li>Check <strong>"Allow WebRequest for listed URL:"</strong></li>
                <li>Add this exact URL to the list: <code style={{color: 'var(--text)'}}>{supabaseUrl}</code></li>
                <li>Open MetaEditor (Press <strong>F4</strong>).</li>
                <li>Create a new Expert Advisor and paste the MQL5 script provided to you.</li>
                <li>Paste your <strong>Webhook URL</strong> and <strong>Sync Token</strong> into the script's input settings.</li>
                <li>Compile and attach the EA to any open chart!</li>
              </ol>
            </div>

            <div style={{marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 20}}>
              <button className="btn-ghost" style={{color: 'var(--neg)'}} onClick={removeConn}>Remove Connection</button>
            </div>
          </div>
        ) : (
          <form className="stack" onSubmit={save} style={{maxWidth: 400}}>
            <p className="muted" style={{marginTop: 0, marginBottom: 20}}>
              Create a webhook connection to get a unique token. You will paste this token into your MT5 Expert Advisor to link it to your account.
            </p>
            <div className="stack" style={{gap: 8}}>
              <label style={{fontSize: 13, fontWeight: 600}}>Connection Label</label>
              <input 
                value={label} 
                onChange={(e) => setLabel(e.target.value)} 
                required 
                placeholder="e.g., Funded Account 1"
              />
            </div>
            <button className="btn-primary" type="submit" style={{marginTop: 12}}>Generate Webhook Token</button>
            {msg && <div className="info" style={{marginTop: 12}}>{msg}</div>}
          </form>
        )}
      </div>
    </div>
  );
}
