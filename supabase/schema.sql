-- Run this in Supabase SQL editor (Project -> SQL Editor -> New query)

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  side text not null check (side in ('long', 'short')),
  entry_price numeric not null,
  exit_price numeric,
  size numeric not null,
  fees numeric default 0,
  pnl numeric,
  entry_date date not null,
  exit_date date,
  notes text,
  created_at timestamptz default now()
);

alter table public.trades enable row level security;

create policy "Users can view own trades"
  on public.trades for select
  using (auth.uid() = user_id);

create policy "Users can insert own trades"
  on public.trades for insert
  with check (auth.uid() = user_id);

create policy "Users can update own trades"
  on public.trades for update
  using (auth.uid() = user_id);

create policy "Users can delete own trades"
  on public.trades for delete
  using (auth.uid() = user_id);

create index if not exists trades_user_id_idx on public.trades(user_id);
create index if not exists trades_entry_date_idx on public.trades(entry_date);
