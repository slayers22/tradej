import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ClipboardList, TrendingUp, TrendingDown } from 'lucide-react';

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
  const startOffset = (firstDay.getDay() + 6) % 7; 
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const tradesByDate = useMemo(() => {
    const map = {};
    trades.forEach((t) => {
      if (!t.entry_date) return;
      const dateOnly = t.entry_date.split('T')[0];
      if (!map[dateOnly]) map[dateOnly] = { trades: [], pnl: 0 };
      map[dateOnly].trades.push(t);
      if (t.profit != null) {
        map[dateOnly].pnl += Number(t.profit);
      }
    });
    return map;
  }, [trades]);

  const weeks = [];
  let currentWeek = [];
  
  for (let i = 0; i < startOffset; i++) currentWeek.push(null);
  
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    currentWeek.push({ day: d, dateStr });
    
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  return (
    <motion.div 
      className="stack"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="calendar-page-header">
        <div className="calendar-page-title">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
            <CalendarIcon size={28} style={{ color: 'var(--muted)' }} /> 
            Trading Calendar
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '14px' }}>Daily P&L heatmap - Click on days to see trades</p>
        </div>
        <div className="calendar-nav" style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', padding: '6px' }}>
          <button className="btn btn-ghost" style={{ padding: '6px', borderRadius: 'var(--radius-full)' }} onClick={() => setCursor(new Date(year, month - 1, 1))}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontWeight: 600, fontSize: '14px', minWidth: '120px', textAlign: 'center' }}>
            {cursor.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button className="btn btn-ghost" style={{ padding: '6px', borderRadius: 'var(--radius-full)' }} onClick={() => setCursor(new Date(year, month + 1, 1))}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="calendar-layout">
        <div className="calendar-grid-wrapper">
          <div className="calendar-grid-header">
            {DAYS.map((d) => <div key={d}>{d}</div>)}
            <div style={{color: 'var(--muted)'}}>WEEKLY</div>
          </div>
          
          <div className="calendar-grid-body">
            {weeks.map((week, wIdx) => {
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
                      <motion.div 
                        key={cIdx} 
                        className={cls} 
                        onClick={() => setSelectedDate(cell.dateStr)}
                        whileHover={{ scale: pnl != null || selectedDate === cell.dateStr ? 1.02 : 1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className="cal-day-num">{cell.day}</div>
                        {pnl != null && (
                          <div className="cal-day-pnl">
                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                  
                  <div className="cal-weekly-cell" style={{ background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="cal-weekly-title" style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.05em' }}>WEEKLY</div>
                    <div className={weeklyPnl >= 0 ? 'text-pos' : 'text-neg'} style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px' }}>
                      {weeklyPnl >= 0 ? '+' : ''}${weeklyPnl.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>Traded Days {tradedDays}</div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          <div className="calendar-legend" style={{ display: 'flex', justifyContent: 'center', gap: '24px', padding: '24px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--pos)' }}></span> Profitable Day
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--neg)' }}></span> Losing Day
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--border)' }}></span> No Trades
            </div>
          </div>
        </div>

        <div className="calendar-sidebar card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="cal-sidebar-header" style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            <ClipboardList size={18} style={{ color: 'var(--info)' }} /> Day Trades
          </div>
          <div className="cal-sidebar-body" style={{ padding: '20px' }}>
            <AnimatePresence mode="wait">
              {!selectedDate ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="cal-sidebar-empty" 
                  style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
                >
                  <div style={{ width: '64px', height: '64px', background: 'var(--bg)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CalendarIcon size={24} />
                  </div>
                  <div>Click on a day with trades<br/>to view details</div>
                </motion.div>
              ) : (
                <motion.div
                  key="content"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                >
                  <h3 style={{marginTop: 0, marginBottom: 20, fontSize: 16}}>
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h3>
                  
                  {(!tradesByDate[selectedDate] || tradesByDate[selectedDate].trades.length === 0) ? (
                    <p className="muted">No trades taken on this day.</p>
                  ) : (
                    <div className="stack" style={{gap: 12}}>
                      {tradesByDate[selectedDate].trades.map((t) => (
                        <div key={t.id} style={{background: 'var(--bg)', border: '1px solid var(--border)', padding: '16px', borderRadius: 'var(--radius-md)'}}>
                          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 12}}>
                            <strong style={{display: 'flex', alignItems: 'center', gap: 8}}>
                              {t.symbol}
                              <span className={t.trade_type === 'long' ? 'badge badge-long' : 'badge badge-short'} style={{display: 'inline-flex', alignItems: 'center', gap: '4px'}}>
                                {t.trade_type === 'long' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                {t.trade_type}
                              </span>
                            </strong>
                            <strong className={Number(t.profit) >= 0 ? 'text-pos' : 'text-neg'}>
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
