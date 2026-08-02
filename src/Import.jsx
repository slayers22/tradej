import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

// Expected CSV headers: symbol,side,entry_price,exit_price,size,fees,entry_date,exit_date,notes
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

  function calcPnl(t) {
    const entry = parseFloat(t.entry_price);
    const exit = parseFloat(t.exit_price);
    const size = parseFloat(t.size);
    const fees = parseFloat(t.fees) || 0;
    if (isNaN(entry) || isNaN(exit) || isNaN(size)) return null;
    const side = (t.side || 'long').toLowerCase();
    const raw = side === 'long' ? (exit - entry) * size : (entry - exit) * size;
    return raw - fees;
  }

  async function handleImport() {
    setStatus('Importing...');
    const rows = preview.map((r) => ({
      symbol: (r.symbol || '').toUpperCase(),
      side: (r.side || 'long').toLowerCase(),
      entry_price: parseFloat(r.entry_price) || null,
      exit_price: r.exit_price ? parseFloat(r.exit_price) : null,
      size: parseFloat(r.size) || null,
      fees: r.fees ? parseFloat(r.fees) : 0,
      entry_date: r.entry_date || null,
      exit_date: r.exit_date || null,
      notes: r.notes || '',
      user_id: user.id,
      pnl: calcPnl(r),
    })).filter((r) => r.symbol && r.entry_price && r.size && r.entry_date);

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
          CSV columns expected: <code>symbol, side, entry_price, exit_price, size, fees, entry_date, exit_date, notes</code>.
          Dates as YYYY-MM-DD. side is "long" or "short".
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
