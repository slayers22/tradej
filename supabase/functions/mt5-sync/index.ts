import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as ftp from 'npm:basic-ftp@5';
import Papa from 'npm:papaparse@5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    let connection_id = null;
    let authUserId = null;

    // The request can come from the frontend UI (manual sync) or from pg_cron (auto-sync).
    // If it's a manual sync, we should authenticate using the user's JWT.
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      // Get the user from the token
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (user) {
        authUserId = user.id;
      }
    }

    if (req.body) {
      const body = await req.json().catch(() => ({}));
      connection_id = body.connection_id;
    }

    // Determine which connections to sync
    let query = supabase.from('mt5_connections').select('*');
    if (connection_id) {
      query = query.eq('id', connection_id);
    }
    // If called manually by a user, only let them sync their own connection
    if (authUserId && connection_id) {
      query = query.eq('user_id', authUserId);
    }

    const { data: connections, error: dbError } = await query;
    if (dbError || !connections || connections.length === 0) {
      throw new Error('Connection not found or DB error');
    }

    const results = [];

    for (const conn of connections) {
      let status = 'Success';
      let tradesSynced = 0;
      const client = new ftp.Client();

      try {
        await client.access({
          host: conn.ftp_host,
          port: conn.ftp_port || 21,
          user: conn.ftp_user,
          password: conn.ftp_password,
        });

        const passThrough = new TransformStream();
        const writableStream = passThrough.writable;
        const readableStream = passThrough.readable;

        // Download the file stream
        const downloadPromise = client.downloadTo(writableStream, conn.report_path || '/statement.csv');

        // Read stream to text
        const response = new Response(readableStream);
        const csvText = await response.text();
        
        await downloadPromise;

        // Parse CSV
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        
        const trades = parsed.data
          .filter(row => row.ticket && row.symbol && row.profit) // basic validation
          .map(row => {
            // Map the CSV headers to our database schema
            // MT5 standard CSV often uses: ticket, symbol, type, time, price, volume, profit
            // Adjust logic here based on exact CSV format of the broker
            const entryDate = new Date(row.time || row.open_time || new Date().toISOString());
            const closeDate = row.close_time ? new Date(row.close_time) : null;
            
            return {
              user_id: conn.user_id,
              mt5_ticket: row.ticket.toString(),
              source: 'mt5',
              symbol: row.symbol,
              trade_type: row.type?.toLowerCase().includes('sell') ? 'short' : 'long',
              volume: parseFloat(row.volume || row.lots || '0'),
              open_price: parseFloat(row.price || row.open_price || '0'),
              close_price: parseFloat(row.close_price || row.price || '0'),
              profit: parseFloat(row.profit || '0'),
              entry_date: entryDate.toISOString().split('T')[0],
              exit_date: closeDate ? closeDate.toISOString().split('T')[0] : null,
              open_time: entryDate.toISOString(),
              close_time: closeDate ? closeDate.toISOString() : null,
            };
          });

        if (trades.length > 0) {
          // Upsert trades
          const { error: upsertError } = await supabase
            .from('trades')
            .upsert(trades, { onConflict: 'user_id,mt5_ticket' });
            
          if (upsertError) throw new Error(upsertError.message);
          tradesSynced = trades.length;
        }

      } catch (err) {
        status = `Failed: ${err.message}`;
      } finally {
        client.close();
      }

      // Update connection status
      await supabase.from('mt5_connections').update({
        last_synced_at: new Date().toISOString(),
        last_sync_status: status
      }).eq('id', conn.id);

      results.push({ id: conn.id, status, tradesSynced });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
