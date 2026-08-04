import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  TableProperties,
  ArrowRight
} from 'lucide-react';

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

export default function Import() {
  const { user } = useAuth();
  const [preview, setPreview] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [file, setFile] = useState(null);

  function handleFile(e) {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setStatus('');
    setError('');
    
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`Parse warning: ${results.errors[0].message}`);
        }
        setPreview(results.data);
      },
      error: (err) => setError(`Parse error: ${err.message}`),
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
    setIsImporting(true);
    setStatus('Importing...');
    setError('');

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

    if (rows.length === 0) {
      setError("No valid trades found to import. Check your column headers.");
      setIsImporting(false);
      return;
    }

    const { error } = await supabase.from('trades').insert(rows);
    if (error) {
      setError(`Import failed: ${error.message}`);
      setStatus('');
    } else {
      setStatus(`Successfully imported ${rows.length} trades.`);
      setPreview([]);
      setFile(null);
    }
    setIsImporting(false);
  }

  return (
    <motion.div 
      className="stack"
      style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="calendar-page-header" style={{ marginBottom: '32px' }}>
        <div className="calendar-page-title">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
            <Upload size={28} style={{ color: 'var(--muted)' }} /> 
            Import Trades
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '14px' }}>Bulk upload your trade history via CSV</p>
        </div>
      </div>

      <div className="card stack" style={{ gap: '24px' }}>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
          <h3 style={{ marginTop: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} /> Format Requirements
          </h3>
          <p className="muted" style={{ fontSize: '14px', lineHeight: 1.6, marginBottom: '16px' }}>
            Your CSV must contain the following columns:<br/>
            <code style={{ background: 'var(--bg-hover)', padding: '4px 8px', borderRadius: '4px', color: 'var(--text)' }}>symbol, trade_type, open_price, close_price, volume, entry_date, exit_date, notes</code>
          </p>
          <ul className="muted" style={{ fontSize: '13px', margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li><strong>trade_type</strong> must be exactly "long" or "short".</li>
            <li><strong>dates</strong> should be in YYYY-MM-DD HH:MM:SS format (ISO 8601 preferred).</li>
            <li><strong>close_price</strong> and <strong>exit_date</strong> can be left blank for open trades.</li>
            <li>Legacy formats (side, entry_price, size) are also supported.</li>
            <li>PnL is auto-calculated using standard contract sizes.</li>
          </ul>
        </div>

        <div style={{ position: 'relative', border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)', padding: '40px 20px', textAlign: 'center', background: 'var(--bg)' }}>
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFile} 
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
            title="Upload CSV"
          />
          <Upload size={32} style={{ color: 'var(--muted)', marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>
            {file ? file.name : "Click or drag CSV file to upload"}
          </h3>
          <p className="muted" style={{ margin: 0, fontSize: '14px' }}>
            {file ? "File selected. Review data below before importing." : "Maximum file size: 5MB"}
          </p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--neg)', background: 'var(--neg-soft)', padding: '16px', borderRadius: 'var(--radius-sm)', fontSize: '14px' }}>
            <AlertCircle size={18} /> {error}
          </motion.div>
        )}
        
        {status && !error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--pos)', background: 'var(--pos-soft)', padding: '16px', borderRadius: 'var(--radius-sm)', fontSize: '14px' }}>
            <CheckCircle2 size={18} /> {status}
          </motion.div>
        )}

        <AnimatePresence>
          {preview.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TableProperties size={18} /> Data Preview
                </h3>
                <span className="muted" style={{ fontSize: '13px' }}>
                  Found {preview.length} rows (showing first 5)
                </span>
              </div>
              
              <div className="table-wrap" style={{ marginBottom: '24px', border: '1px solid var(--border)' }}>
                <table>
                  <thead>
                    <tr>{Object.keys(preview[0]).map((k) => <th key={k} style={{ textTransform: 'none' }}>{k}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 5).map((row, i) => (
                      <tr key={i}>{Object.values(row).map((v, j) => <td key={j} style={{ whiteSpace: 'nowrap' }}>{v}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={handleImport}
                  disabled={isImporting}
                  style={{ padding: '12px 24px' }}
                >
                  {isImporting ? 'Importing...' : `Import ${preview.length} Trades`}
                  {!isImporting && <ArrowRight size={16} />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
