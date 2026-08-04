import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Link as LinkIcon, 
  Trash2, 
  Copy, 
  Plus, 
  Server, 
  CheckCircle2, 
  Activity,
  AlertCircle
} from 'lucide-react';

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
    <motion.div 
      className="stack" 
      style={{maxWidth: '800px'}}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="calendar-page-header">
        <div className="calendar-page-title">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
            <LinkIcon size={28} style={{ color: 'var(--info)' }} />
            MT4/MT5 Sync
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '14px' }}>Sync your trades instantly and automatically for free</p>
        </div>
      </div>

      <AnimatePresence>
        {conns.length > 0 && (
          <motion.div className="stack" style={{gap: '24px'}} layout>
            {conns.map(conn => (
              <motion.div 
                key={conn.id} 
                className="card stack" 
                style={{gap: '24px', position: 'relative', overflow: 'hidden'}}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
              >
                <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: conn.last_sync_status?.includes('Success') ? 'var(--pos)' : 'var(--muted)' }} />
                
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '8px'}}>
                  <div>
                    <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px'}}>
                      <Server size={18} style={{ color: 'var(--muted)' }} />
                      {conn.label}
                    </h3>
                    <p className="muted" style={{marginTop: 4, marginBottom: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px'}}>
                      {conn.last_synced_at ? (
                        <>
                          <CheckCircle2 size={14} style={{ color: 'var(--pos)' }} />
                          Last synced {new Date(conn.last_synced_at).toLocaleString()}
                        </>
                      ) : (
                        <>
                          <Activity size={14} />
                          Waiting for first sync...
                        </>
                      )}
                    </p>
                  </div>
                  <button className="btn btn-ghost" style={{color: 'var(--neg)', fontSize: 13, padding: '8px 12px'}} onClick={() => removeConn(conn.id)}>
                    <Trash2 size={16} /> Disconnect
                  </button>
                </div>

                <div style={{background: 'var(--bg)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginLeft: '8px'}}>
                  <label className="form-label">WEBHOOK URL</label>
                  <div style={{display: 'flex', gap: 8, marginBottom: 20}}>
                    <input className="form-input" type="text" readOnly value={webhookUrl} style={{flex: 1, fontFamily: 'var(--font-mono)', fontSize: 13}} />
                    <button className="btn btn-ghost" onClick={() => navigator.clipboard.writeText(webhookUrl)} title="Copy URL">
                      <Copy size={16} />
                    </button>
                  </div>

                  <label className="form-label">SYNC TOKEN (SECRET)</label>
                  <div style={{display: 'flex', gap: 8}}>
                    <input className="form-input" type="text" readOnly value={conn.webhook_token} style={{flex: 1, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', fontWeight: 600}} />
                    <button className="btn btn-ghost" onClick={() => navigator.clipboard.writeText(conn.webhook_token)} title="Copy Token">
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}

            {!showForm && (
              <motion.button 
                layout
                className="btn btn-ghost" 
                style={{alignSelf: 'flex-start', padding: '12px 20px'}} 
                onClick={() => setShowForm(true)}
              >
                <Plus size={16} /> Link Another Account
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(showForm || conns.length === 0) && (
          <motion.div 
            className="card"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            layout
          >
            <form className="stack" onSubmit={save}>
              <h3 style={{marginTop: 0, fontSize: '20px'}}>Link MT5 Account</h3>
              <p className="muted" style={{marginTop: 0, marginBottom: '24px', lineHeight: 1.5}}>
                Create a webhook connection to get a unique token. Paste this token into your MT5 Expert Advisor to link it securely to your journal.
              </p>
              
              <div className="form-group" style={{maxWidth: '400px'}}>
                <label className="form-label">CONNECTION LABEL</label>
                <input 
                  className="form-input"
                  value={label} 
                  onChange={(e) => setLabel(e.target.value)} 
                  required 
                  placeholder="e.g., Funded Account 1"
                />
              </div>
              
              <div style={{display: 'flex', gap: 12, marginTop: 16}}>
                <button className="btn btn-primary" type="submit">
                  Generate Token
                </button>
                {conns.length > 0 && (
                  <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>
                    Cancel
                  </button>
                )}
              </div>
              {msg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', color: 'var(--neg)', fontSize: '14px', background: 'var(--neg-soft)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <AlertCircle size={16} /> {msg}
                </div>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div className="card stack" style={{gap: '16px', marginTop: '32px'}} layout>
        <h4 style={{marginTop: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
          <Activity size={18} style={{ color: 'var(--muted)' }} />
          How to set up MT5
        </h4>
        <ol style={{paddingLeft: 24, color: 'var(--muted)', margin: 0, display: 'flex', flexDirection: 'column', gap: 12, lineHeight: 1.5}}>
          <li>Open MetaTrader 5 on your PC.</li>
          <li>Go to <strong>Tools &gt; Options &gt; Expert Advisors</strong>.</li>
          <li>Check <strong>"Allow WebRequest for listed URL:"</strong></li>
          <li>Add this exact URL to the list: <code style={{background: 'var(--bg-hover)', padding: '4px 8px', borderRadius: '4px', color: 'var(--text)'}}>{supabaseUrl}</code></li>
          <li>Open MetaEditor (Press <strong>F4</strong>).</li>
          <li>Create a new Expert Advisor and paste the MQL5 script provided to you.</li>
          <li>Paste your <strong>Webhook URL</strong> and <strong>Sync Token</strong> into the script's input settings.</li>
          <li>Compile and attach the EA to any open chart!</li>
        </ol>
      </motion.div>
    </motion.div>
  );
}
