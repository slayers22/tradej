import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../AuthContext';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    const action = mode === 'signin' ? signIn : signUp;
    const { error } = await action(email, password);
    if (error) {
      setError(error.message);
      return;
    }
    if (mode === 'signup') {
      setInfo('Account created. Check your email to confirm, then sign in.');
      setMode('signin');
      return;
    }
    navigate('/');
  }

  return (
    <div className="auth-wrap">
      <motion.form 
        className="auth-card" 
        onSubmit={handleSubmit}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="brand-icon" style={{ margin: '0 auto 16px', width: '48px', height: '48px', fontSize: '20px', borderRadius: '12px' }}>TJ</div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>TradeJournal</h1>
          <p className="muted" style={{ margin: 0 }}>
            {mode === 'signin' ? 'Sign in to your journal' : 'Create an account to start tracking'}
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Email address</label>
          <div style={{ position: 'relative' }}>
            <Mail size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--muted)' }} />
            <input 
              type="email" 
              className="form-input" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="you@example.com"
              style={{ paddingLeft: '40px', width: '100%' }}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--muted)' }} />
            <input 
              type="password" 
              className="form-input" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              minLength={6} 
              placeholder="••••••••"
              style={{ paddingLeft: '40px', width: '100%' }}
            />
          </div>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="error" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--neg)', marginTop: '16px', fontSize: '13px', background: 'var(--neg-soft)', padding: '12px', borderRadius: '8px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </motion.div>
        )}
        
        {info && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="info" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--pos)', marginTop: '16px', fontSize: '13px', background: 'var(--pos-soft)', padding: '12px', borderRadius: '8px' }}>
            <CheckCircle2 size={16} />
            <span>{info}</span>
          </motion.div>
        )}

        <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: '24px', padding: '12px' }}>
          {mode === 'signin' ? 'Sign in' : 'Create account'}
          <ArrowRight size={16} />
        </button>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            style={{ fontSize: '13px', border: 'none' }}
          >
            {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
