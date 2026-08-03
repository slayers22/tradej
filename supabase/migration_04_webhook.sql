-- Run in Supabase SQL Editor AFTER migration_03_mt5_sync.sql

-- Add webhook token to mt5_connections and make FTP fields optional
alter table public.mt5_connections
  add column if not exists webhook_token text unique,
  alter column ftp_host drop not null,
  alter column ftp_user drop not null,
  alter column ftp_password drop not null,
  alter column report_path drop not null;

-- Ensure existing connections get a random token if they don't have one
update public.mt5_connections 
set webhook_token = encode(gen_random_bytes(16), 'hex')
where webhook_token is null;

-- Recreate the view to expose the webhook token safely
drop view if exists public.mt5_connections_safe;

create view public.mt5_connections_safe as
  select id, user_id, label, webhook_token, last_synced_at, last_sync_status, created_at
  from public.mt5_connections;

alter view public.mt5_connections_safe set (security_invoker = true);
grant select on public.mt5_connections_safe to authenticated;
