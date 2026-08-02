-- Run in Supabase SQL Editor AFTER schema.sql already applied.

alter table public.trades
  add column if not exists pre_trade_analysis text,
  add column if not exists post_trade_review text,
  add column if not exists lessons_learned text,
  add column if not exists rating smallint check (rating between 0 and 5),
  add column if not exists checklist jsonb default '{
    "higher_timeframe": false,
    "risk_within_limits": false,
    "fits_trading_plan": false,
    "key_levels_identified": false,
    "economic_calendar_checked": false
  }'::jsonb,
  add column if not exists screenshot_urls text[] default '{}';

-- Storage bucket for trade screenshots (private, per-user folders)
insert into storage.buckets (id, name, public)
values ('trade-screenshots', 'trade-screenshots', false)
on conflict (id) do nothing;

create policy "Users can upload own screenshots"
  on storage.objects for insert
  with check (bucket_id = 'trade-screenshots' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can view own screenshots"
  on storage.objects for select
  using (bucket_id = 'trade-screenshots' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own screenshots"
  on storage.objects for delete
  using (bucket_id = 'trade-screenshots' and (storage.foldername(name))[1] = auth.uid()::text);
