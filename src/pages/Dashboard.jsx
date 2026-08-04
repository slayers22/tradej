import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { useTheme } from '../ThemeContext';
import { 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  Target, 
  TrendingUp, 
  FileText,
  Activity,
  CalendarDays,
  Award
} from 'lucide-react';

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
};

export default function Dashboard() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('ALL');
  const { theme } = useTheme();

  useEffect(() => {
    supabase.from('trades').select('*').order('entry_date', { ascending: true }).then(({ data, error }) => {
      if (!error) setTrades(data);
      setLoading(false);
    });
  }, []);

  const stats = useMemo(() => {
    const closed = trades.filter((t) => t.profit != null);
    const wins = closed.filter((t) => t.profit > 0);
    const losses = closed.filter((t) => t.profit <= 0);

    const totalPnl = closed.reduce((s, t) => s + Number(t.profit), 0);
    const realized = totalPnl;
    const unrealized = 0; 
    const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;

    const avgWin = wins.length ? wins.reduce((s, t) => s + Number(t.profit), 0) / wins.length : 0;
    const avgLoss = losses.length ? losses.reduce((s, t) => s + Number(t.profit), 0) / losses.length : 0;
    
    const bestTrade = closed.length ? Math.max(...closed.map((t) => Number(t.profit))) : 0;
    const worstTrade = closed.length ? Math.min(...closed.map((t) => Number(t.profit))) : 0;
    const profitFactor = Math.abs(losses.reduce((s, t) => s + Number(t.profit), 0)) === 0 
      ? (wins.length ? '∞' : '0.00') 
      : (wins.reduce((s, t) => s + Number(t.profit), 0) / Math.abs(losses.reduce((s, t) => s + Number(t.profit), 0))).toFixed(2);

    let equity = 0;
    const equityCurve = closed.map((t) => {
      equity += Number(t.profit);
      return { date: t.entry_date, equity: Number(equity.toFixed(2)) };
    });

    const bySymbol = {};
    closed.forEach((t) => {
      if (!bySymbol[t.symbol]) bySymbol[t.symbol] = { pnl: 0, count: 0 };
      bySymbol[t.symbol].pnl += Number(t.profit);
      bySymbol[t.symbol].count += 1;
    });
    
    const topPerformers = Object.entries(bySymbol)
      .map(([symbol, data]) => ({ symbol, pnl: data.pnl, count: data.count }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 5);

    const recentActivity = [...closed].sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date)).slice(0, 5);

    const now = new Date();
    const currYear = now.getFullYear();
    const currMonth = now.getMonth();
    const daysInMonth = getDaysInMonth(currYear, currMonth);
    const firstDay = new Date(currYear, currMonth, 1).getDay(); 
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    const calDays = [];
    for(let i=0; i<startOffset; i++) calDays.push(null);
    for(let i=1; i<=daysInMonth; i++) {
      const dStr = `${currYear}-${String(currMonth+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
      const dayTrades = closed.filter(t => t.entry_date === dStr);
      const dayPnl = dayTrades.reduce((s,t) => s + Number(t.profit), 0);
      calDays.push({ date: i, pnl: dayPnl, hasTrades: dayTrades.length > 0 });
    }

    return {
      totalPnl, realized, unrealized, winRate, 
      avgWin, avgLoss, bestTrade, worstTrade, profitFactor,
      equityCurve, topPerformers, recentActivity,
      calDays, closedCount: closed.length
    };
  }, [trades]);

  if (loading) return <div className="center">Loading...</div>;

  const chartColor = theme === 'dark' ? '#ffffff' : '#000000';
  const gridColor = theme === 'dark' ? '#222222' : '#eaeaea';
  const tooltipBg = theme === 'dark' ? '#111111' : '#ffffff';

  return (
    <motion.div 
      className="dashboard-layout"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="dash-main">
        {/* Top 4 Stats */}
        <div className="dash-top-stats">
          <motion.div variants={itemVariants} className="dash-stat-card card">
            <div className="dash-stat-header">
              <div className="dash-stat-icon" style={{ color: 'var(--info)', background: 'rgba(59, 130, 246, 0.1)' }}>
                <DollarSign size={20} />
              </div>
              <span className="badge badge-neutral">TOTAL</span>
            </div>
            <div>
              <div className="dash-stat-title">Total P&L</div>
              <div className={`dash-stat-value ${stats.totalPnl >= 0 ? 'text-pos' : 'text-neg'}`}>
                {stats.totalPnl >= 0 ? '+' : ''}${stats.totalPnl.toFixed(2)}
              </div>
              <div className="dash-stat-sub">→ {stats.closedCount} trades</div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="dash-stat-card card">
            <div className="dash-stat-header">
              <div className="dash-stat-icon" style={{ color: 'var(--warn)', background: 'rgba(245, 158, 11, 0.1)' }}>
                <Clock size={20} />
              </div>
            </div>
            <div>
              <div className="dash-stat-title">Unrealized</div>
              <div className="dash-stat-value">${stats.unrealized.toFixed(2)}</div>
              <div className="dash-stat-sub">0 open positions</div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="dash-stat-card card">
            <div className="dash-stat-header">
              <div className="dash-stat-icon" style={{ color: 'var(--pos)', background: 'var(--pos-soft)' }}>
                <CheckCircle2 size={20} />
              </div>
            </div>
            <div>
              <div className="dash-stat-title">Realized</div>
              <div className={`dash-stat-value ${stats.realized >= 0 ? 'text-pos' : 'text-neg'}`}>
                {stats.realized >= 0 ? '+' : ''}${stats.realized.toFixed(2)}
              </div>
              <div className="dash-stat-sub">{stats.closedCount} closed trades</div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="dash-stat-card card">
            <div className="dash-stat-header">
              <div className="dash-stat-icon" style={{ color: 'var(--accent)', background: 'var(--bg-hover)' }}>
                <Target size={20} />
              </div>
            </div>
            <div>
              <div className="dash-stat-title">Win Rate</div>
              <div className="dash-stat-value">{stats.winRate.toFixed(1)}%</div>
              <div style={{height: 6, background: 'var(--bg-hover)', borderRadius: 3, marginTop: 8}}>
                <div style={{width: `${stats.winRate}%`, height: '100%', background: 'var(--accent)', borderRadius: 3}}></div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Performance Chart */}
        <motion.div variants={itemVariants} className="dash-card card">
          <div className="dash-card-header">
            <div>
              <span className="muted" style={{fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase'}}>Performance</span>
              <div style={{display:'flex', alignItems:'center', gap: 12, marginTop: 4}}>
                <div className={`dash-stat-value ${stats.totalPnl >= 0 ? 'text-pos' : 'text-neg'}`}>
                  {stats.totalPnl >= 0 ? '+' : ''}${stats.totalPnl.toFixed(2)}
                </div>
                {stats.totalPnl > 0 && <span className="badge badge-long">↗ All time</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-hover)', padding: '4px', borderRadius: 'var(--radius-sm)' }}>
              {['1D','1W','1M','3M','ALL'].map(f => (
                <button key={f} 
                  style={{
                    padding: '4px 12px', fontSize: 12, border: 'none', borderRadius: '4px', 
                    background: timeFilter === f ? 'var(--card)' : 'transparent',
                    color: timeFilter === f ? 'var(--text)' : 'var(--muted)',
                    fontWeight: timeFilter === f ? 600 : 500, 
                    boxShadow: timeFilter === f ? 'var(--shadow-sm)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setTimeFilter(f)}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: '24px' }}>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={stats.equityCurve} margin={{top:10, right:0, left:-20, bottom:0}}>
                <defs>
                  <linearGradient id="colorEq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.1}/>
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="date" hide />
                <YAxis stroke="var(--muted)" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <Tooltip 
                  contentStyle={{
                    borderRadius: '12px', 
                    border: '1px solid var(--border)', 
                    backgroundColor: tooltipBg,
                    boxShadow: 'var(--shadow-lg)'
                  }} 
                  itemStyle={{ color: 'var(--text)' }}
                />
                <Area type="monotone" dataKey="equity" stroke={chartColor} strokeWidth={2} fillOpacity={1} fill="url(#colorEq)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={itemVariants} className="dash-card card">
          <div className="dash-card-header" style={{ marginBottom: '16px' }}>
            <h3 className="dash-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} />
              Recent Activity
            </h3>
            <span className="muted" style={{fontSize: 12}}>{stats.recentActivity.length} trades</span>
          </div>
          <div className="dash-list">
            {stats.recentActivity.map(t => (
              <div className="dash-list-item" key={t.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
                <div className="dash-list-left">
                  <div className="dash-list-icon" style={{ background: 'var(--bg-hover)', color: 'var(--text)' }}>
                    <TrendingUp size={16} />
                  </div>
                  <div className="dash-list-text">
                    <div className="dash-list-title">
                      {t.symbol} 
                      <span className={t.trade_type === 'long' ? 'badge badge-long' : 'badge badge-short'} style={{fontSize:9, padding:'2px 6px'}}>{t.trade_type}</span>
                    </div>
                    <div className="dash-list-sub">{t.entry_date}</div>
                  </div>
                </div>
                <div className="dash-list-right">
                  <div className={`dash-list-title ${Number(t.profit) >= 0 ? 'text-pos' : 'text-neg'}`} style={{ fontSize: '15px' }}>
                    {Number(t.profit) >= 0 ? '+' : ''}${Number(t.profit).toFixed(2)}
                  </div>
                  <div className="dash-list-sub">{t.volume} lots</div>
                </div>
              </div>
            ))}
            {stats.recentActivity.length === 0 && <div className="muted center">No recent activity</div>}
          </div>
        </motion.div>
      </div>

      <div className="dash-aside">
        
        {/* Monthly P&L Calendar */}
        <motion.div variants={itemVariants} className="dash-card card">
          <div className="dash-card-header" style={{ marginBottom: '16px' }}>
            <h3 className="dash-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarDays size={18} />
              Monthly P&L
            </h3>
            <span className="muted" style={{fontSize: 12}}>{new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
          </div>
          <div className="mini-cal-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
            {['M','T','W','T','F','S','S'].map((d,i) => <div key={i} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>{d}</div>)}
            {stats.calDays.map((d, i) => {
              if (!d) return <div key={i}></div>;
              let bg = 'var(--bg)';
              let color = 'var(--text)';
              if (d.hasTrades) {
                bg = d.pnl >= 0 ? 'var(--pos-soft)' : 'var(--neg-soft)';
                color = d.pnl >= 0 ? 'var(--pos)' : 'var(--neg)';
              }
              return (
                <div key={i} title={d.hasTrades ? `PnL: $${d.pnl.toFixed(2)}` : 'No trades'} style={{
                  aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: d.hasTrades ? 600 : 400, borderRadius: 'var(--radius-sm)',
                  background: bg, color: color
                }}>
                  {d.date}
                </div>
              );
            })}
          </div>
          <div style={{display:'flex', gap: 12, justifyContent:'center', marginTop: 16, fontSize: 11, color:'var(--muted)'}}>
            <div style={{display:'flex', alignItems:'center', gap:4}}><span style={{width:6,height:6,borderRadius:'50%',background:'var(--pos)'}}></span> Profit</div>
            <div style={{display:'flex', alignItems:'center', gap:4}}><span style={{width:6,height:6,borderRadius:'50%',background:'var(--neg)'}}></span> Loss</div>
          </div>
        </motion.div>

        {/* Top Performers */}
        <motion.div variants={itemVariants} className="dash-card card">
          <h3 className="dash-card-title" style={{marginBottom: 16, display: 'flex', alignItems: 'center', gap: '8px'}}>
            <Award size={18} />
            Top Performers
          </h3>
          <div className="dash-list">
            {stats.topPerformers.map((p, i) => (
              <div className="dash-list-item" key={p.symbol} style={{padding: '8px 12px', background: 'transparent'}}>
                <div className="dash-list-left">
                  <div className="dash-list-icon" style={{width:24, height:24, fontSize:11, fontWeight:600, background:'var(--bg-hover)', color:'var(--muted)'}}>
                    {i+1}
                  </div>
                  <div className="dash-list-text">
                    <div className="dash-list-title" style={{fontSize: 13}}>{p.symbol}</div>
                    <div className="dash-list-sub" style={{fontSize: 11}}>{p.count} trades</div>
                  </div>
                </div>
                <div className={p.pnl >= 0 ? 'text-pos' : 'text-neg'} style={{fontWeight: 600, fontSize: 13}}>
                  {p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(2)}
                </div>
              </div>
            ))}
            {stats.topPerformers.length === 0 && <div className="muted center">Not enough data</div>}
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div variants={itemVariants} className="dash-card card">
          <h3 className="dash-card-title" style={{marginBottom: 16, display: 'flex', alignItems: 'center', gap: '8px'}}>
            <FileText size={18} />
            Quick Stats
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'var(--bg)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Avg Win</div>
              <div className="text-pos" style={{ fontSize: '18px', fontWeight: 700 }}>+${stats.avgWin.toFixed(2)}</div>
            </div>
            <div style={{ background: 'var(--bg)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Avg Loss</div>
              <div className="text-neg" style={{ fontSize: '18px', fontWeight: 700 }}>-${Math.abs(stats.avgLoss).toFixed(2)}</div>
            </div>
            <div style={{ background: 'var(--bg)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Best Trade</div>
              <div className="text-pos" style={{ fontSize: '18px', fontWeight: 700 }}>+${stats.bestTrade.toFixed(2)}</div>
            </div>
            <div style={{ background: 'var(--bg)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Worst Trade</div>
              <div className="text-neg" style={{ fontSize: '18px', fontWeight: 700 }}>-${Math.abs(stats.worstTrade).toFixed(2)}</div>
            </div>
            <div style={{ gridColumn: '1 / -1', background: 'var(--bg)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Profit Factor</div>
              <div style={{ color: 'var(--accent)', fontSize: '20px', fontWeight: 700 }}>{stats.profitFactor}</div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
