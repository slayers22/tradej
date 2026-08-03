import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

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

    const body = await req.json().catch(() => null);
    if (!body || !body.token || !body.trades || !Array.isArray(body.trades)) {
      throw new Error('Invalid payload. Expected { token: string, trades: array }');
    }

    const token = body.token;
    const incomingTrades = body.trades;

    // Verify token
    const { data: conn, error: connError } = await supabase
      .from('mt5_connections')
      .select('id, user_id')
      .eq('webhook_token', token)
      .maybeSingle();

    if (connError || !conn) {
      throw new Error('Invalid webhook token');
    }

    if (incomingTrades.length === 0) {
      return new Response(JSON.stringify({ status: 'ok', inserted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Map trades to DB schema
    const trades = incomingTrades.map((row: any) => {
      const entryDate = new Date(row.open_time * 1000); // MQL5 sends timestamps in seconds
      const closeDate = new Date(row.close_time * 1000);
      
      return {
        user_id: conn.user_id,
        mt5_ticket: row.ticket.toString(),
        source: 'mt5',
        symbol: row.symbol,
        trade_type: row.type.toLowerCase().includes('sell') ? 'short' : 'long',
        volume: parseFloat(row.volume || '0'),
        open_price: parseFloat(row.open_price || '0'),
        close_price: parseFloat(row.close_price || '0'),
        profit: parseFloat(row.profit || '0'),
        entry_date: entryDate.toISOString().split('T')[0],
        exit_date: closeDate.toISOString().split('T')[0],
        open_time: entryDate.toISOString(),
        close_time: closeDate.toISOString(),
      };
    });

    // Upsert trades
    const { error: upsertError } = await supabase
      .from('trades')
      .upsert(trades, { onConflict: 'user_id,mt5_ticket' });
      
    if (upsertError) throw new Error(upsertError.message);

    // Update connection status
    await supabase.from('mt5_connections').update({
      last_synced_at: new Date().toISOString(),
      last_sync_status: `Success: Synced ${trades.length} trades`
    }).eq('id', conn.id);

    return new Response(JSON.stringify({ status: 'ok', inserted: trades.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
