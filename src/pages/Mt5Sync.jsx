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
  const [conns, setConns] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('My MT5 Account');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  // The webhook URL points to the edge function.
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const webhookUrl = `${supabaseUrl}/functions/v1/mt5-sync`;

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('mt5_connections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    setConns(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    setMsg('');
    const token = generateToken();
    const { error } = await supabase.from('mt5_connections').insert({ 
      user_id: user.id, 
      label, 
      webhook_token: token 
    });
    if (error) {
      setMsg(`Failed to create connection: ${error.message}`);
    } else {
      setShowForm(false);
      setLabel('My MT5 Account');
      load();
    }
  }

  async function removeConn(id) {
    if (!window.confirm('Remove this connection? Your past synced trades will remain.')) return;
    await supabase.from('mt5_connections').delete().eq('id', id);
    load();
  }

  if (loading) return <div className="center">Loading...</div>;

  return (
    <div className="stack" style={{maxWidth: 800}}>
      <div className="calendar-page-header">
        <div className="calendar-page-title">
          <h1><span style={{color: 'var(--muted)'}}>🔗</span> MT4/MT5 Webhook Sync</h1>
          <p>Sync your trades instantly and automatically for free</p>
        </div>
      </div>

      {conns.length > 0 && (
        <div className="stack" style={{gap: '24px'}}>
          {conns.map(conn => (
            <div key={conn.id} className="card stack" style={{gap: '24px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: 8}}>
                    <div style={{width: 8, height: 8, borderRadius: '50%', background: conn.last_sync_status?.includes('Success') ? 'var(--pos)' : 'var(--muted)'}}></div>
                    {conn.label}
                  </h3>
                  <p className="muted" style={{marginTop: 4, marginBottom: 0}}>
                    Status: {conn.last_synced_at ? `Last synced ${new Date(conn.last_synced_at).toLocaleString()}` : 'Waiting for first sync...'}
                  </p>
                </div>
                <button className="btn-ghost" style={{color: 'var(--neg)', fontSize: 13, padding: '4px 8px'}} onClick={() => removeConn(conn.id)}>
                  Disconnect
                </button>
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
            </div>
          ))}

          {!showForm && (
            <button className="btn-ghost" style={{alignSelf: 'flex-start'}} onClick={() => setShowForm(true)}>
              + Link Another Account
            </button>
          )}
        </div>
      )}

      {(showForm || conns.length === 0) && (
        <div className="card">
          <form className="stack" onSubmit={save}>
            <h3 style={{marginTop: 0}}>Link MT5 Account</h3>
            <p className="muted" style={{marginTop: 0, marginBottom: 20}}>
              Create a webhook connection to get a unique token. You will paste this token into your MT5 Expert Advisor to link it to your account.
            </p>
            <div className="stack" style={{gap: 8, maxWidth: 400}}>
              <label style={{fontSize: 13, fontWeight: 600}}>Connection Label</label>
              <input 
                value={label} 
                onChange={(e) => setLabel(e.target.value)} 
                required 
                placeholder="e.g., Funded Account 1"
              />
            </div>
            <div style={{display: 'flex', gap: 12, marginTop: 12}}>
              <button className="btn-primary" type="submit">Generate Webhook Token</button>
              {conns.length > 0 && (
                <button className="btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancel</button>
              )}
            </div>
            {msg && <div className="info" style={{marginTop: 12}}>{msg}</div>}
          </form>
        </div>
      )}

      <div className="card stack" style={{gap: '12px', marginTop: 24}}>
        <h4 style={{marginTop: 0}}>How to set up MT5</h4>
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
    </div>
  );
}
