import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function toKey(d) {
  return d.toISOString().slice(0, 10);
}

export default function CalendarPage() {
  const [trades, setTrades] = useState([]);
  const [cursor, setCursor] = useState(new Date());

  useEffect(() => {
    supabase.from('trades').select('symbol, pnl, entry_date').then(({ data, error }) => {
      if (!error) setTrades(data);
    });
  }, []);

  const dailyPnl = useMemo(() => {
    const map = {};
    trades.forEach((t) => {
      if (t.profit == null || !t.entry_date) return;
      map[t.entry_date] = (map[t.entry_date] || 0) + Number(t.profit);
    });
    return map;
  }, [trades]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthTotal = Object.entries(dailyPnl)
    .filter(([date]) => date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
    .reduce((s, [, v]) => s + v, 0);

  return (
    <div className="stack">
      <h1>Calendar</h1>
      <div className="card">
        <div className="cal-header">
          <button className="btn-ghost small" onClick={() => setCursor(new Date(year, month - 1, 1))}>&lsaquo;</button>
          <div>
            <strong>{cursor.toLocaleString('default', { month: 'long', year: 'numeric' })}</strong>
            <span className={monthTotal >= 0 ? 'pnl-pos' : 'pnl-neg'}> {monthTotal >= 0 ? '+' : ''}{monthTotal.toFixed(2)}</span>
          </div>
          <button className="btn-ghost small" onClick={() => setCursor(new Date(year, month + 1, 1))}>&rsaquo;</button>
        </div>

        <div className="cal-grid cal-dow">
          {DAYS.map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div className="cal-grid">
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="cal-cell empty" />;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const pnl = dailyPnl[dateStr];
            const cls = pnl == null ? '' : pnl >= 0 ? 'cal-profit' : 'cal-loss';
            return (
              <div key={i} className={`cal-cell ${cls}`}>
                <div className="cal-date">{d}</div>
                {pnl != null && <div className="cal-pnl">{pnl >= 0 ? '+' : ''}{pnl.toFixed(0)}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
