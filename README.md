# TradeJournal

A modern React web application for trade logging, dashboard analytics, and CSV/MT5 import. Designed to give traders deep insights into their performance through automated metrics and a robust journaling interface.

Works on desktop and mobile browsers, supporting multi-user environments with secure authentication.

---

## 🌟 Features

- **Dashboard Analytics:** Visual equity curves, win rates, profit factors, and a daily P&L calendar heatmap.
- **Trade Logging:** Fast, manual entry with support for long/short, custom lot sizing, and entry/exit prices.
- **Journaling:** Split-pane interface to record pre-trade analysis, post-trade reviews, emotional states, and key takeaways per trade.
- **CSV Import:** Bulk import trades from virtually any broker (Standard or Legacy CSV formats).
- **MT4/MT5 Webhook Sync:** Connect your MetaTrader terminal using an Expert Advisor to automatically sync trades upon closure in real-time.

## 🛠 Tech Stack

- **Frontend:** React + Vite
- **Styling:** Vanilla CSS variables and a custom design system
- **Backend / Database / Auth:** Supabase (PostgreSQL, Row-Level Security, Edge Functions)
- **Charts:** Recharts
- **Data Parsing:** PapaParse

---

## 🚀 Local Setup & Installation

1. **Clone the repository and install dependencies:**
   ```bash
   git clone https://github.com/yourusername/tradejournal.git
   cd tradejournal
   npm install
   ```

2. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   ```
   Open `.env` and paste your Supabase Project URL and Anon Key.

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173/`.

---

## 🗄 Supabase Configuration

This project relies on Supabase for the backend, providing a robust PostgreSQL database, Edge Functions, and secure Authentication.

### 1. Project Setup
1. Go to [Supabase](https://supabase.com), sign up, and create a "New project".
2. Go to **Project Settings -> API** to retrieve your "Project URL" and "anon public" key. Add these to your `.env` file.

### 2. Database Schema
1. In your Supabase dashboard, navigate to the **SQL Editor** -> **New query**.
2. Paste the contents of `supabase/schema.sql` (and any migration files) and run them.
3. This creates the necessary tables (`trades`, `mt5_connections`) and enforces **Row-Level Security (RLS)** so users can only access their own data.

### 3. Edge Functions (For MT5 Sync)
If you want to use the MetaTrader 5 Sync feature, you must deploy the edge function:
1. Ensure you have the Supabase CLI installed.
2. Run `supabase link --project-ref YOUR_PROJECT_REF`
3. Run `supabase functions deploy mt5-sync`
4. Set your Supabase service role key as a secret for the function if required.

---

## 🌐 Deploying to Vercel

TradeJournal is fully optimized for static hosting on Vercel.

1. Push your repository to GitHub.
2. Go to [Vercel](https://vercel.com), sign in, and click "Add New Project", selecting your repository.
3. Vercel will auto-detect **Vite** as the framework.
4. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
5. Click **Deploy**.

*Alternative: Cloudflare Pages works similarly for free, static, no-sleep hosting.*

---

## 📈 Importing Data

### CSV Import
The application accepts generic CSV formats. Your CSV should have the following headers:
`symbol, trade_type, open_price, close_price, volume, entry_date, exit_date, notes`

- `trade_type`: `long` or `short`
- `entry_date` / `exit_date`: `YYYY-MM-DD` or ISO string
- P&L is automatically calculated using standard contract multipliers (e.g., XAUUSD=100).

### MT5 Sync
1. In the TradeJournal web app, go to **MT4/MT5 Sync** and generate a Webhook Token.
2. Open MetaTrader 5, go to **Tools > Options > Expert Advisors** and check "Allow WebRequest for listed URL". Add your Supabase project URL.
3. Open MetaEditor (F4) and compile `TradeJournal_Sync.mq5`.
4. Attach the Expert Advisor to any chart and input your **Webhook URL** and **Sync Token**.
5. The EA will automatically sync any closed trades to your dashboard.
