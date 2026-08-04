-- Add risk_reward and emotions to trades table
alter table public.trades
  add column if not exists risk_reward text,
  add column if not exists emotions text[] default '{}';
