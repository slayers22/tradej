import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function CalendarPage() {
  const [trades, setTrades] = useState([]);
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    supabase.from('trades').select('*').then(({ data, error }) => {
      if (!error) setTrades(data);
    });
  }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  // Get 0-indexed day, Monday = 0
  const startOffset = (firstDay.getDay() + 6) % 7; 
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Group trades by date string YYYY-MM-DD
  const tradesByDate = useMemo(() => {
    const map = {};
    trades.forEach((t) => {
      if (!t.entry_date) return;
      if (!map[t.entry_date]) map[t.entry_date] = { trades: [], pnl: 0 };
      map[t.entry_date].trades.push(t);
      if (t.profit != null) {
        map[t.entry_date].pnl += Number(t.profit);
      }
    });
    return map;
  }, [trades]);

  // Build the grid cells, including weekly summaries
  const weeks = [];
  let currentWeek = [];
  
  // Padding for start of month
  for (let i = 0; i < startOffset; i++) currentWeek.push(null);
  
  // Actual days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    currentWeek.push({ day: d, dateStr });
    
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  
  // Padding for end of month
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  return (
    <div className="stack">
      
      <div className="calendar-page-header">
        <div className="calendar-page-title">
          <h1><span style={{color: 'var(--muted)'}}>📅</span> Trading Calendar</h1>
          <p>Daily P&L heatmap - Click on days to see trades</p>
        </div>
        <div className="calendar-nav">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))}>&lsaquo;</button>
          <span>{cursor.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))}>&rsaquo;</button>
        </div>
      </div>

      <div className="calendar-layout">
        
        {/* Left Column - Main Grid */}
        <div className="calendar-grid-wrapper">
          <div className="calendar-grid-header">
            {DAYS.map((d) => <div key={d}>{d}</div>)}
            <div style={{color: 'var(--muted)'}}>WEEKLY</div>
          </div>
          
          <div className="calendar-grid-body">
            {weeks.map((week, wIdx) => {
              // Calculate weekly totals
              let weeklyPnl = 0;
              let tradedDays = 0;
              
              week.forEach(cell => {
                if (cell && tradesByDate[cell.dateStr]) {
                  weeklyPnl += tradesByDate[cell.dateStr].pnl;
                  tradedDays += 1;
                }
              });

              return (
                <React.Fragment key={wIdx}>
                  {week.map((cell, cIdx) => {
                    if (!cell) return <div key={cIdx} className="cal-day-cell empty" />;
                    
                    const data = tradesByDate[cell.dateStr];
                    const pnl = data ? data.pnl : null;
                    
                    let cls = 'cal-day-cell';
                    if (selectedDate === cell.dateStr) cls += ' active';
                    if (pnl != null) {
                      cls += pnl >= 0 ? ' profit' : ' loss';
                    }

                    return (
                      <div key={cIdx} className={cls} onClick={() => setSelectedDate(cell.dateStr)}>
                        <div className="cal-day-num">{cell.day}</div>
                        {pnl != null && (
                          <div className="cal-day-pnl">
                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Weekly Summary Cell */}
                  <div className="cal-weekly-cell">
                    <div className="cal-weekly-title">WEEKLY</div>
                    <div className={`cal-weekly-pnl ${weeklyPnl >= 0 ? 'pnl-pos' : 'pnl-neg'}`}>
                      {weeklyPnl >= 0 ? '+' : ''}${weeklyPnl.toFixed(2)}
                    </div>
                    <div className="cal-weekly-sub">Traded Days {tradedDays}</div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          <div className="calendar-legend">
            <div className="legend-item">
              <span className="legend-dot" style={{background: 'var(--pos)'}}></span> Profitable Day
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{background: 'var(--neg)'}}></span> Losing Day
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{background: '#cbd5e1'}}></span> No Trades
            </div>
          </div>
        </div>

        {/* Right Column - Day Trades panel */}
        <div className="calendar-sidebar">
          <div className="cal-sidebar-header">
            <span style={{color: 'var(--accent)'}}>📋</span> Day Trades
          </div>
          <div className="cal-sidebar-body">
            {!selectedDate ? (
              <div className="cal-sidebar-empty">
                <div className="cal-sidebar-empty-icon">📅</div>
                <div>Click on a day with trades<br/>to view details</div>
              </div>
            ) : (
              <div>
                <h3 style={{marginTop: 0, marginBottom: 16, fontSize: 16}}>
                  {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </h3>
                
                {(!tradesByDate[selectedDate] || tradesByDate[selectedDate].trades.length === 0) ? (
                  <p className="muted">No trades taken on this day.</p>
                ) : (
                  <div className="stack" style={{gap: 12}}>
                    {tradesByDate[selectedDate].trades.map((t) => (
                      <div key={t.id} style={{background: 'var(--bg)', padding: 12, borderRadius: 12}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 8}}>
                          <strong style={{display: 'flex', alignItems: 'center', gap: 6}}>
                            {t.symbol}
                            <span className={t.trade_type === 'long' ? 'badge badge-long' : 'badge badge-short'} style={{fontSize: 9, padding: '2px 6px'}}>
                              {t.trade_type}
                            </span>
                          </strong>
                          <strong className={Number(t.profit) >= 0 ? 'pnl-pos' : 'pnl-neg'}>
                            {Number(t.profit) >= 0 ? '+' : ''}${Number(t.profit).toFixed(2)}
                          </strong>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)'}}>
                          <span>{t.volume} lots</span>
                          <span>Entry: {t.open_price} {t.close_price ? ` → Exit: ${t.close_price}` : ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
