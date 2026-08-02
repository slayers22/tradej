import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('signin');
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
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>TradeJournal</h1>
        <p className="muted">{mode === 'signin' ? 'Sign in to your journal' : 'Create an account'}</p>
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        {error && <div className="error">{error}</div>}
        {info && <div className="info">{info}</div>}
        <button className="btn-primary" type="submit">{mode === 'signin' ? 'Sign in' : 'Sign up'}</button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? "Need an account? Sign up" : 'Have an account? Sign in'}
        </button>
      </form>
    </div>
  );
}
