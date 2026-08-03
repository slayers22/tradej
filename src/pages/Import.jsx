import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

// Expected CSV headers: symbol,trade_type,open_price,close_price,volume,entry_date,exit_date,notes
export default function Import() {
  const { user } = useAuth();
  const [preview, setPreview] = useState([]);
  const [status, setStatus] = useState('');

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setPreview(results.data);
        setStatus(`Parsed ${results.data.length} rows. Review below, then import.`);
      },
      error: (err) => setStatus(`Parse error: ${err.message}`),
    });
  }

  function calcProfit(t) {
    const open = parseFloat(t.open_price);
    const close = parseFloat(t.close_price);
    const volume = parseFloat(t.volume);
    if (isNaN(open) || isNaN(close) || isNaN(volume)) return null;
    const tradeType = (t.trade_type || 'long').toLowerCase();
    const raw = tradeType === 'long' ? (close - open) * volume : (open - close) * volume;
    return raw;
  }

  async function handleImport() {
    setStatus('Importing...');
    const rows = preview.map((r) => ({
      symbol: (r.symbol || '').toUpperCase(),
      trade_type: (r.trade_type || r.side || 'long').toLowerCase(),
      open_price: parseFloat(r.open_price || r.entry_price) || null,
      close_price: r.close_price || r.exit_price ? parseFloat(r.close_price || r.exit_price) : null,
      volume: parseFloat(r.volume || r.size) || null,
      entry_date: r.entry_date || null,
      exit_date: r.exit_date || null,
      notes: r.notes || '',
      user_id: user.id,
      profit: calcProfit({
        open_price: r.open_price || r.entry_price,
        close_price: r.close_price || r.exit_price,
        volume: r.volume || r.size,
        trade_type: r.trade_type || r.side,
      }),
      source: 'csv',
    })).filter((r) => r.symbol && r.open_price && r.volume && r.entry_date);

    const { error } = await supabase.from('trades').insert(rows);
    if (error) {
      setStatus(`Import failed: ${error.message}`);
    } else {
      setStatus(`Imported ${rows.length} trades.`);
      setPreview([]);
    }
  }

  return (
    <div className="stack">
      <h1>Import trades</h1>
      <div className="card">
        <p className="muted">
          CSV columns expected: <code>symbol, trade_type, open_price, close_price, volume, entry_date, exit_date, notes</code>.
          Dates as YYYY-MM-DD. trade_type is "long" or "short".
          <br />
          <em>Legacy format also accepted: side, entry_price, exit_price, size.</em>
        </p>
        <input type="file" accept=".csv" onChange={handleFile} />
        {status && <div className="info">{status}</div>}
        {preview.length > 0 && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>{Object.keys(preview[0]).map((k) => <th key={k}>{k}</th>)}</tr>
                </thead>
                <tbody>
                  {preview.slice(0, 10).map((row, i) => (
                    <tr key={i}>{Object.values(row).map((v, j) => <td key={j}>{v}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted">Showing first 10 of {preview.length} rows.</p>
            <button className="btn-primary" onClick={handleImport}>Import {preview.length} rows</button>
          </>
        )}
      </div>
    </div>
  );
}
