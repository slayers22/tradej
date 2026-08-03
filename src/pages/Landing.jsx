import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-nav">
          <span className="landing-brand">TradeJournal</span>
          <Link to="/login" className="btn-primary">Get Started</Link>
        </div>
      </header>

      <main className="landing-main">
        <section className="hero">
          <div className="hero-content">
            <h1>Your Trading Edge, <span className="highlight">Journalized</span></h1>
            <p className="hero-subtitle">
              Track every trade. Analyze your patterns. Build consistency.
              The journal that turns data into your unfair advantage.
            </p>
            <div className="hero-actions">
              <Link to="/login" className="btn-primary btn-lg">Start Free Journal</Link>
              <Link to="/login" className="btn-ghost btn-lg">View Demo</Link>
            </div>
          </div>
          <div className="hero-visual">
            <div className="dashboard-preview">
              <div className="preview-header">Dashboard</div>
              <div className="preview-stats">
                <div className="preview-stat">
                  <span className="preview-label">Total PnL</span>
                  <span className="preview-value pos">+$12,847.50</span>
                </div>
                <div className="preview-stat">
                  <span className="preview-label">Win Rate</span>
                  <span className="preview-value">67.3%</span>
                </div>
                <div className="preview-stat">
                  <span className="preview-label">Avg Win</span>
                  <span className="preview-value pos">+$342.10</span>
                </div>
                <div className="preview-stat">
                  <span className="preview-label">Avg Loss</span>
                  <span className="preview-value neg">-$156.80</span>
                </div>
              </div>
              <div className="preview-chart"></div>
            </div>
          </div>
        </section>

        <section className="features">
          <div className="section-header">
            <h2>Built for Serious Traders</h2>
            <p>Every feature designed to help you find and fix your edge</p>
          </div>
          <div className="features-grid">
            <article className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Smart Trade Logging</h3>
              <p>Log trades in seconds with autocomplete symbols, auto-calculated PnL, position sizing helper, and risk/reward visualization.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon">📈</div>
              <h3>Deep Analytics</h3>
              <p>Equity curves, win/loss distribution, symbol performance, expectancy analysis, and calendar heatmaps — all automatic.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon">🧠</div>
              <h3>Pre/Post Trade Review</h3>
              <p>Execution checklist, thesis tracking, lessons learned, and 5-star rating system to build discipline and pattern recognition.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon">📁</div>
              <h3>CSV Import & MT5 Sync</h3>
              <p>Bulk import from any broker. Connect MetaTrader 4/5 via FTP for automatic statement synchronization.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Private & Secure</h3>
              <p>Your data stays yours. Supabase Auth + Row Level Security means only you see your trades. Deploy free on Vercel.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Works Everywhere</h3>
              <p>Responsive design works on desktop, tablet, and mobile. Add to home screen for app-like experience.</p>
            </article>
          </div>
        </section>

        <section className="cta">
          <h2>Ready to Trade with Clarity?</h2>
          <p>Join traders who've turned chaotic logs into consistent edge.</p>
          <Link to="/login" className="btn-primary btn-lg">Create Free Account</Link>
        </section>
      </main>

      <footer className="landing-footer">
        <p>TradeJournal — Open source trading journal. Not affiliated with Journalit.</p>
      </footer>
    </div>
  );
}