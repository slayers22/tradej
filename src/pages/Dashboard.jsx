import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#4ade80', '#f87171'];

export default function Dashboard() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

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
    const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
    const avgWin = wins.length ? wins.reduce((s, t) => s + Number(t.profit), 0) / wins.length : 0;
    const avgLoss = losses.length ? losses.reduce((s, t) => s + Number(t.profit), 0) / losses.length : 0;
    let equity = 0;
    const equityCurve = closed.map((t) => {
      equity += Number(t.profit);
      return { date: t.entry_date, equity: Number(equity.toFixed(2)) };
    });
    const bySymbol = {};
    closed.forEach((t) => {
      bySymbol[t.symbol] = (bySymbol[t.symbol] || 0) + Number(t.profit);
    });
    const symbolData = Object.entries(bySymbol).map(([symbol, pnl]) => ({ symbol, pnl: Number(pnl.toFixed(2)) }));
    return {
      totalPnl, winRate, avgWin, avgLoss, equityCurve, symbolData,
      pieData: [{ name: 'Wins', value: wins.length }, { name: 'Losses', value: losses.length }],
      count: closed.length,
    };
  }, [trades]);

  if (loading) return <div className="center">Loading...</div>;

  return (
    <div className="stack">
      <h1>Dashboard</h1>
      <div className="stat-grid">
        <div className="card stat">
          <div className="stat-label">Total PnL</div>
          <div className={stats.totalPnl >= 0 ? 'stat-value pnl-pos' : 'stat-value pnl-neg'}>
            {stats.totalPnl.toFixed(2)}
          </div>
        </div>
        <div className="card stat">
          <div className="stat-label">Win rate</div>
          <div className="stat-value">{stats.winRate.toFixed(1)}%</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Avg win</div>
          <div className="stat-value pnl-pos">{stats.avgWin.toFixed(2)}</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Avg loss</div>
          <div className="stat-value pnl-neg">{stats.avgLoss.toFixed(2)}</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Closed trades</div>
          <div className="stat-value">{stats.count}</div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="card">
          <h3>Equity curve</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={stats.equityCurve}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2f36" />
              <XAxis dataKey="date" hide />
              <YAxis stroke="#8a919b" />
              <Tooltip />
              <Line type="monotone" dataKey="equity" stroke="#60a5fa" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3>Win / Loss</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={stats.pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                {stats.pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card wide">
          <h3>PnL by symbol</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.symbolData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2f36" />
              <XAxis dataKey="symbol" stroke="#8a919b" />
              <YAxis stroke="#8a919b" />
              <Tooltip />
              <Bar dataKey="pnl">
                {stats.symbolData.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? '#4ade80' : '#f87171'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
