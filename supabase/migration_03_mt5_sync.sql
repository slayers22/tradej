-- Run in Supabase SQL Editor AFTER migration_02_trade_review.sql

-- Track source + broker ticket id for dedup on auto-synced trades
alter table public.trades
  add column if not exists source text default 'manual',
  add column if not exists mt5_ticket text;

create unique index if not exists trades_user_ticket_uidx
  on public.trades(user_id, mt5_ticket)
  where mt5_ticket is not null;

-- Stores each user's MT4/5 FTP connection details.
-- NOTE: ftp_password stored in plaintext in this table, protected only by
-- row-level security (each user sees only their own row) and by the fact
-- the anon key can never read it directly (see policy below — no select
-- policy for regular users, only insert/update/delete of their own row).
-- The sync Edge Function reads it using the service-role key, which
-- bypasses RLS. Acceptable for a personal/free-tier setup; for production
-- multi-tenant use, encrypt this column (e.g. pgsodium) instead.
create table if not exists public.mt5_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text default 'MT4/5 account',
  ftp_host text not null,
  ftp_port int default 21,
  ftp_user text not null,
  ftp_password text not null,
  report_path text not null default '/statement.csv',
  last_synced_at timestamptz,
  last_sync_status text,
  created_at timestamptz default now()
);

alter table public.mt5_connections enable row level security;

create policy "Users can insert own connection"
  on public.mt5_connections for insert
  with check (auth.uid() = user_id);

create policy "Users can update own connection"
  on public.mt5_connections for update
  using (auth.uid() = user_id);

create policy "Users can delete own connection"
  on public.mt5_connections for delete
  using (auth.uid() = user_id);

-- Intentionally no plain "select" policy exposing ftp_password to the client.
-- Instead expose a safe view without the password for the UI to read.
create or replace view public.mt5_connections_safe as
  select id, user_id, label, ftp_host, ftp_port, ftp_user, report_path, last_synced_at, last_sync_status, created_at
  from public.mt5_connections;

alter view public.mt5_connections_safe set (security_invoker = true);

grant select on public.mt5_connections_safe to authenticated;

-- ---- Scheduled sync (optional, run once) ----
-- Requires pg_cron + pg_net extensions (enable in Database -> Extensions).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Replace <PROJECT_REF> and <SERVICE_ROLE_KEY> below, then run this select
-- once to schedule the sync every 15 minutes. Get the service role key from
-- Project Settings -> API Keys (keep it secret, never put it in frontend code).
select cron.schedule(
  'mt5-sync-every-15-min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/mt5-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To unschedule later: select cron.unschedule('mt5-sync-every-15-min');
