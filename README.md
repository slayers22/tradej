# TradeJournal

Original React web app for trade logging, dashboard analytics, and CSV import.
Not a copy of Journalit (that project is proprietary, source-available only — not
open source, so it could not legally be cloned). Same general concept, own code.

Works on desktop and mobile browsers, multi-user with login.

## Stack

- Frontend: React + Vite, hosted on Vercel (free, static, no sleep)
- Backend/DB/Auth: Supabase (free tier Postgres + Auth — no cold-start sleep)
- Charts: Recharts
- CSV parsing: PapaParse

## 1. Supabase setup (backend, free, no sleep)

1. Go to supabase.com, sign up, click "New project".
2. Pick name, password, region. Wait ~2 min for provisioning.
3. In the project, go to SQL Editor -> New query. Paste contents of
   `supabase/schema.sql` and run it. This creates the `trades` table with
   row-level security so each user only sees their own trades.
4. Go to Project Settings -> Data API. Copy the "Project URL".
5. Go to Project Settings -> API Keys. Copy the "anon public" key.
6. Go to Authentication -> Providers, confirm Email is enabled (default).
   Optional: Authentication -> URL Configuration, disable "Confirm email"
   for faster testing (re-enable for production).

## 2. Local setup

```bash
npm install
cp .env.example .env
# paste your Supabase URL and anon key into .env
npm run dev
```

Open the local URL, sign up with an email/password, start logging trades.

## 3. Deploy free, no-sleep hosting (Vercel)

1. Push this folder to a new GitHub repo.
2. Go to vercel.com, sign in with GitHub, "Add New Project", pick the repo.
3. Framework preset: Vite (auto-detected).
4. Under Environment Variables, add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
5. Deploy. Vercel's free tier serves static builds directly from CDN —
   no server process, so nothing to "sleep". Same for Supabase's free
   Postgres — it's a managed always-on database, not a free-tier web
   dyno, so no cold starts either.
6. Your app is live at `<project>.vercel.app`, works on any device/browser.
   Add to home screen on mobile for an app-like icon.

Alternative to Vercel: Cloudflare Pages — same free, no-sleep, static-hosting
deal, GitHub-connected auto-deploys.

## 4. CSV import format

Header row required, columns:
```
symbol,side,entry_price,exit_price,size,fees,entry_date,exit_date,notes
```
`side` is `long` or `short`. Dates as `YYYY-MM-DD`. `fees` and `exit_price`
optional.

## Notes / what's not included vs. Journalit

- No MetaTrader FTP sync (needs a paid backend service to poll broker FTP —
  can be added later with a serverless function, but out of scope for a
  free no-backend-maintenance setup).
- No broker-specific statement parsers per broker (IBKR, Tradovate, etc.) —
  generic CSV import only. Can add per-broker column mapping later.
- No drag-and-drop layout builder for the dashboard — fixed layout for now.
- Review templates (daily/weekly/monthly journal entries) not yet built —
  natural next addition as a `journal_entries` table + markdown editor page.
