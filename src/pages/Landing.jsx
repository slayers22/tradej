import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  BarChart3, 
  LineChart, 
  Brain, 
  Database, 
  ShieldCheck, 
  Smartphone,
  TrendingUp,
  Target
} from 'lucide-react';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export default function Landing() {
  return (
    <div className="landing">
      <motion.header 
        className="landing-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="brand-icon">TJ</div>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '20px', letterSpacing: '-0.02em' }}>TradeJournal</span>
        </div>
        <Link to="/login" className="btn btn-primary" style={{ padding: '8px 16px' }}>Get Started</Link>
      </motion.header>

      <main className="landing-main">
        <motion.section 
          className="hero"
          initial="hidden"
          animate="visible"
          variants={stagger}
          style={{ paddingTop: '60px', paddingBottom: '60px' }}
        >
          <motion.div variants={fadeIn} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--bg-hover)', borderRadius: '999px', border: '1px solid var(--border)', fontSize: '13px', fontWeight: 500, color: 'var(--muted)', marginBottom: '16px' }}>
            <TrendingUp size={14} className="text-pos" />
            <span>Elevate your trading edge</span>
          </motion.div>
          <motion.h1 variants={fadeIn}>
            Your Trading Edge,<br />
            <span style={{ color: 'var(--muted)' }}>Journalized</span>
          </motion.h1>
          <motion.p variants={fadeIn} className="hero-subtitle">
            Track every trade. Analyze your patterns. Build unbreakable consistency.
            The professional journal that turns raw data into your unfair advantage.
          </motion.p>
          <motion.div variants={fadeIn} className="hero-actions" style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
            <Link to="/login" className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '15px' }}>
              Start Free Journal
              <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn btn-ghost" style={{ padding: '14px 28px', fontSize: '15px' }}>
              View Demo
            </Link>
          </motion.div>
        </motion.section>

        <motion.section 
          className="features"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeIn} className="section-header" style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '36px', marginBottom: '16px' }}>Built for Serious Traders</h2>
            <p className="muted" style={{ fontSize: '18px' }}>Every feature meticulously designed to help you find and fix your edge.</p>
          </motion.div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {[
              { icon: BarChart3, title: 'Smart Trade Logging', desc: 'Log trades in seconds with autocomplete symbols, auto-calculated PnL, position sizing helper, and risk/reward visualization.' },
              { icon: LineChart, title: 'Deep Analytics', desc: 'Equity curves, win/loss distribution, symbol performance, expectancy analysis, and calendar heatmaps — all automatic.' },
              { icon: Brain, title: 'Pre/Post Trade Review', desc: 'Execution checklist, thesis tracking, lessons learned, and 5-star rating system to build discipline and pattern recognition.' },
              { icon: Database, title: 'CSV & MT5 Sync', desc: 'Bulk import from any broker. Connect MetaTrader 4/5 via secure webhooks for automatic statement synchronization.' },
              { icon: ShieldCheck, title: 'Private & Secure', desc: 'Your data stays yours. Built on Supabase Auth + Row Level Security means only you see your trades.' },
              { icon: Smartphone, title: 'Works Everywhere', desc: 'Responsive design works flawlessly on desktop, tablet, and mobile. Dark mode ready for long trading sessions.' }
            ].map((feature, i) => (
              <motion.article 
                key={i} 
                variants={fadeIn} 
                className="card" 
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }}
              >
                <div style={{ width: '48px', height: '48px', background: 'var(--bg-hover)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>
                  <feature.icon size={24} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{feature.title}</h3>
                <p className="muted" style={{ fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{feature.desc}</p>
              </motion.article>
            ))}
          </div>
        </motion.section>

        <motion.section 
          className="cta"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '24px', padding: '60px 40px', textAlign: 'center', marginTop: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}
        >
          <div style={{ width: '64px', height: '64px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={32} />
          </div>
          <h2 style={{ fontSize: '32px' }}>Ready to Trade with Clarity?</h2>
          <p className="muted" style={{ fontSize: '18px', maxWidth: '500px', margin: 0 }}>Join traders who have turned chaotic spreadsheets into a consistent edge.</p>
          <Link to="/login" className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '16px', marginTop: '8px' }}>
            Create Free Account
          </Link>
        </motion.section>
      </main>

      <footer className="landing-footer" style={{ textAlign: 'center', padding: '40px 0', marginTop: '60px', borderTop: '1px solid var(--border)', color: 'var(--muted)', fontSize: '14px' }}>
        <p>TradeJournal — Open source trading journal.</p>
      </footer>
    </div>
  );
}