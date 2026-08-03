import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

// Standard contract sizes per lot (same as TradeLog)
const CONTRACT_SIZES = {
  XAUUSD: 100, XAGUSD: 5000, XAUEUR: 100, XAUGBP: 100,
  USOIL: 1000, UKOIL: 1000, WTI: 1000, BRENT: 1000, CRUDEOIL: 1000,
  NGAS: 10000, NATGAS: 10000,
  US30: 1, US500: 1, SPX500: 1, NAS100: 1, USTEC: 1, US100: 1,
  UK100: 1, GER40: 1, GER30: 1, FRA40: 1, JPN225: 1, AUS200: 1, DJ30: 1,
  BTCUSD: 1, ETHUSD: 1, LTCUSD: 1, XRPUSD: 1,
};

function getContractSize(symbol) {
  const s = (symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (CONTRACT_SIZES[s] != null) return CONTRACT_SIZES[s];
  for (const [key, size] of Object.entries(CONTRACT_SIZES)) {
    if (s.startsWith(key) || s.endsWith(key)) return size;
  }
  const forexPattern = /^[A-Z]{6}$/;
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'NZD', 'CAD', 'SGD', 'HKD', 'NOK', 'SEK', 'ZAR', 'TRY', 'MXN'];
  if (forexPattern.test(s)) {
    const base = s.slice(0, 3), quote = s.slice(3, 6);
    if (currencies.includes(base) && currencies.includes(quote)) return 100000;
  }
  return 1;
}

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
    const contractSize = getContractSize(t.symbol);
    const raw = tradeType === 'long'
      ? (close - open) * volume * contractSize
      : (open - close) * volume * contractSize;
    return raw;
  }

  async function handleImport() {
    setStatus('Importing...');
    const rows = preview.map((r) => {
      const symbol = (r.symbol || '').toUpperCase();
      const tradeType = (r.trade_type || r.side || 'long').toLowerCase();
      const openPrice = parseFloat(r.open_price || r.entry_price) || null;
      const closePrice = r.close_price || r.exit_price ? parseFloat(r.close_price || r.exit_price) : null;
      const volume = parseFloat(r.volume || r.size) || null;
      return {
        symbol,
        trade_type: tradeType,
        open_price: openPrice,
        close_price: closePrice,
        volume,
        entry_date: r.entry_date || null,
        exit_date: r.exit_date || null,
        notes: r.notes || '',
        user_id: user.id,
        profit: calcProfit({ symbol, trade_type: tradeType, open_price: openPrice, close_price: closePrice, volume }),
        source: 'csv',
      };
    }).filter((r) => r.symbol && r.open_price && r.volume && r.entry_date);

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
          <br />
          <em>PnL is auto-calculated using standard contract sizes (Gold=100oz, Forex=100K, etc.).</em>
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
