import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

// Helpers
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export default function Dashboard() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('ALL');

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
    const unrealized = 0; // Not tracking open positions yet
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

    // Mini Calendar (Current Month)
    const now = new Date();
    const currYear = now.getFullYear();
    const currMonth = now.getMonth();
    const daysInMonth = getDaysInMonth(currYear, currMonth);
    const firstDay = new Date(currYear, currMonth, 1).getDay(); // 0 = Sun, 1 = Mon
    // Adjust to Monday-start (0 = Mon, 6 = Sun)
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    const calDays = [];
    // padding before 1st
    for(let i=0; i<startOffset; i++) calDays.push(null);
    
    // actual days
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

  return (
    <div className="dashboard-layout">
      
      {/* Left Column (Main) */}
      <div className="dash-main">
        {/* Top 4 Stats */}
        <div className="dash-top-stats">
          <div className="dash-stat-card blue-bg">
            <div className="dash-stat-header">
              <div className="dash-stat-icon blue">💰</div>
              <span className="badge" style={{background: '#dbeafe', color: '#3b82f6'}}>TOTAL</span>
            </div>
            <div>
              <div className="dash-stat-title">Total P&L</div>
              <div className={`dash-stat-value ${stats.totalPnl >= 0 ? 'pnl-pos' : 'pnl-neg'}`}>
                {stats.totalPnl >= 0 ? '+' : ''}${stats.totalPnl.toFixed(2)}
              </div>
              <div className="dash-stat-sub">→ {stats.closedCount} trades</div>
            </div>
          </div>

          <div className="dash-stat-card">
            <div className="dash-stat-header">
              <div className="dash-stat-icon orange">⏳</div>
            </div>
            <div>
              <div className="dash-stat-title">Unrealized</div>
              <div className="dash-stat-value">${stats.unrealized.toFixed(2)}</div>
              <div className="dash-stat-sub">0 open positions</div>
            </div>
          </div>

          <div className="dash-stat-card">
            <div className="dash-stat-header">
              <div className="dash-stat-icon green">✅</div>
            </div>
            <div>
              <div className="dash-stat-title">Realized</div>
              <div className={`dash-stat-value ${stats.realized >= 0 ? 'pnl-pos' : 'pnl-neg'}`}>
                {stats.realized >= 0 ? '+' : ''}${stats.realized.toFixed(2)}
              </div>
              <div className="dash-stat-sub">{stats.closedCount} closed trades</div>
            </div>
          </div>

          <div className="dash-stat-card">
            <div className="dash-stat-header">
              <div className="dash-stat-icon purple">🎯</div>
            </div>
            <div>
              <div className="dash-stat-title">Win Rate</div>
              <div className="dash-stat-value">{stats.winRate.toFixed(1)}%</div>
              <div style={{height: 6, background: '#f3f4f6', borderRadius: 3, marginTop: 8}}>
                <div style={{width: `${stats.winRate}%`, height: '100%', background: '#3b82f6', borderRadius: 3}}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Chart */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <span className="muted" style={{fontSize: 11, fontWeight: 700, letterSpacing: '0.05em'}}>PERFORMANCE</span>
              <div style={{display:'flex', alignItems:'center', gap: 12, marginTop: 4}}>
                <div className={`dash-stat-value ${stats.totalPnl >= 0 ? 'pnl-pos' : 'pnl-neg'}`}>
                  {stats.totalPnl >= 0 ? '+' : ''}${stats.totalPnl.toFixed(2)}
                </div>
                {stats.totalPnl > 0 && <span className="badge" style={{background: '#dcfce7', color: '#22c55e'}}>↗ All time</span>}
              </div>
            </div>
            <div className="actions" style={{background: '#f3f4f6', padding: 4, borderRadius: 8}}>
              {['1D','1W','1M','3M','ALL'].map(f => (
                <button key={f} 
                  style={{padding: '4px 12px', fontSize: 12, background: timeFilter === f ? '#fff' : 'transparent', border: 'none', borderRadius: 6, fontWeight: timeFilter===f?600:500, boxShadow: timeFilter===f?'0 1px 2px rgba(0,0,0,0.05)':'none'}}
                  onClick={() => setTimeFilter(f)}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={stats.equityCurve} margin={{top:10, right:0, left:-20, bottom:0}}>
              <defs>
                <linearGradient id="colorEq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" hide />
              <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} tick={{fontSize: 11}} />
              <Tooltip contentStyle={{borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
              <Area type="step" dataKey="equity" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorEq)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Open Positions */}
        <div className="dash-card">
          <h3 className="dash-card-title">Open Positions</h3>
          <div className="empty-state" style={{padding: '30px !important'}}>
            <div className="empty-icon" style={{fontSize: 32}}>📄</div>
            <p style={{fontSize: 14}}>No open positions</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3 className="dash-card-title">Recent Activity</h3>
            <span className="muted" style={{fontSize: 12}}>{stats.recentActivity.length} trades</span>
          </div>
          <div className="dash-list">
            {stats.recentActivity.map(t => (
              <div className="dash-list-item" key={t.id}>
                <div className="dash-list-left">
                  <div className="dash-list-icon">💸</div>
                  <div className="dash-list-text">
                    <div className="dash-list-title">
                      {t.symbol} 
                      <span className={t.trade_type === 'long' ? 'badge badge-long' : 'badge badge-short'} style={{fontSize:9, padding:'2px 6px'}}>{t.trade_type}</span>
                    </div>
                    <div className="dash-list-sub">{t.entry_date}</div>
                  </div>
                </div>
                <div className="dash-list-right">
                  <div className={`dash-list-title ${Number(t.profit) >= 0 ? 'pnl-pos' : 'pnl-neg'}`}>
                    {Number(t.profit) >= 0 ? '+' : ''}${Number(t.profit).toFixed(2)}
                  </div>
                  <div className="dash-list-sub">{t.volume} lots</div>
                </div>
              </div>
            ))}
            {stats.recentActivity.length === 0 && <div className="muted center">No recent activity</div>}
          </div>
        </div>
      </div>

      {/* Right Column (Sidebar-like) */}
      <div className="dash-aside">
        
        {/* Monthly P&L Calendar */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3 className="dash-card-title">Monthly P&L</h3>
            <span className="muted" style={{fontSize: 12}}>Aug 2026</span>
          </div>
          <div className="mini-cal-grid">
            {['M','T','W','T','F','S','S'].map((d,i) => <div key={i} className="mini-cal-dow">{d}</div>)}
            {stats.calDays.map((d, i) => {
              if (!d) return <div key={i}></div>;
              let cls = 'mini-cal-day';
              if (d.hasTrades) cls += d.pnl >= 0 ? ' pos' : ' neg';
              return (
                <div key={i} className={cls} title={d.hasTrades ? `PnL: $${d.pnl.toFixed(2)}` : 'No trades'}>
                  {d.date}
                </div>
              );
            })}
          </div>
          <div style={{display:'flex', gap: 12, justifyContent:'center', marginTop: 16, fontSize: 11, color:'var(--muted)'}}>
            <div style={{display:'flex', alignItems:'center', gap:4}}><span style={{width:6,height:6,borderRadius:'50%',background:'var(--pos)'}}></span> Profit</div>
            <div style={{display:'flex', alignItems:'center', gap:4}}><span style={{width:6,height:6,borderRadius:'50%',background:'var(--neg)'}}></span> Loss</div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="dash-card">
          <h3 className="dash-card-title" style={{marginBottom: 16}}>Top Performers</h3>
          <div className="dash-list">
            {stats.topPerformers.map((p, i) => (
              <div className="dash-list-item" key={p.symbol} style={{padding: '8px 12px'}}>
                <div className="dash-list-left">
                  <div className="dash-list-icon" style={{width:24, height:24, fontSize:11, fontWeight:700, background:'#e2e8f0', color:'#64748b'}}>#{i+1}</div>
                  <div className="dash-list-text">
                    <div className="dash-list-title" style={{fontSize: 13}}>{p.symbol}</div>
                    <div className="dash-list-sub" style={{fontSize: 11}}>{p.count} trades</div>
                  </div>
                </div>
                <div className={`dash-list-right ${p.pnl >= 0 ? 'pnl-pos' : 'pnl-neg'}`} style={{fontWeight: 700, fontSize: 13}}>
                  {p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(2)}
                </div>
              </div>
            ))}
            {stats.topPerformers.length === 0 && <div className="muted center">Not enough data</div>}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="dash-card">
          <h3 className="dash-card-title" style={{marginBottom: 16}}>Quick Stats</h3>
          <div className="quick-stats-grid">
            <div className="quick-stat-box">
              <div className="quick-stat-label">Avg Win</div>
              <div className="quick-stat-val pnl-pos">+${stats.avgWin.toFixed(2)}</div>
            </div>
            <div className="quick-stat-box">
              <div className="quick-stat-label">Avg Loss</div>
              <div className="quick-stat-val pnl-neg">-${Math.abs(stats.avgLoss).toFixed(2)}</div>
            </div>
            <div className="quick-stat-box">
              <div className="quick-stat-label">Best Trade</div>
              <div className="quick-stat-val pnl-pos">+${stats.bestTrade.toFixed(2)}</div>
            </div>
            <div className="quick-stat-box">
              <div className="quick-stat-label">Worst Trade</div>
              <div className="quick-stat-val pnl-neg">-${Math.abs(stats.worstTrade).toFixed(2)}</div>
            </div>
            <div className="quick-stat-box" style={{gridColumn: '1 / -1'}}>
              <div className="quick-stat-label">Profit Factor</div>
              <div className="quick-stat-val" style={{color: '#3b82f6'}}>{stats.profitFactor}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
