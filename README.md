# 💰 WealthFlow — Expense Tracker & Budget Planner

A modern, AI-powered personal finance web application that helps users track expenses, plan budgets, visualize spending trends, and receive intelligent insights to improve their financial health.

---

## ✨ Features

- 🔐 Secure email/password authentication (signup, login, password reset)
- 💸 Add, edit, delete, filter, and search transactions (income & expenses)
- 📊 Interactive dashboards with charts and spending trends
- 🎯 Monthly budgets with per-category allocations and progress tracking
- 🔔 Smart notifications for budget overruns and category alerts
- 🤖 AI-powered insights and personalized financial tips
- 📁 CSV export of transactions
- 📱 Fully responsive — mobile, tablet, and desktop
- 🌗 Polished UI with a modern design system

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TanStack Start, TanStack Router, TypeScript
- **Styling:** Tailwind CSS v4, shadcn/ui, Lucide Icons
- **Charts:** Recharts
- **Backend:** Supabase (Postgres, Auth, Edge Functions, Row Level Security)
- **AI:** Lovable AI Gateway (Google Gemini)
- **Build Tool:** Vite 7
- **Deployment:** Lovable / Vercel / Cloudflare Workers

---

## 🌐 Live Demo

🔗 **Live URL:** https://usebudgetbuddy.lovable.app

---

## 📸 Screenshots

| Dashboard | Expenses | Budgets |
|-----------|----------|---------|
| ![Dashboard](./screenshots/dashboard.png) | ![Expenses](./screenshots/expenses.png) | ![Budgets](./screenshots/budgets.png) |

| Analytics | AI Insights | Mobile View |
|-----------|-------------|-------------|
| ![Analytics](./screenshots/analytics.png) | ![AI Insights](./screenshots/ai-insights.png) | ![Mobile](./screenshots/mobile.png) |

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js 20+ and npm (or [Bun](https://bun.sh))
- A Supabase project (or use Lovable Cloud)

### 1. Clone the repository
```bash
git clone https://github.com/UsmanTariq-542/wealthflow_semester_project.git
cd wealthflow
```

### 2. Install dependencies
```bash
npm install
# or
bun install
```

### 3. Configure environment variables
Create a `.env` file in the project root (see [Environment Variables](#-environment-variables)).

### 4. Run the development server
```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### 5. Build for production
```bash
npm run build
```

---

## 🚀 Usage

1. **Sign up** with your email and password, then verify your email.
2. **Log in** to access your personal dashboard.
3. **Add a transaction** using the **+ Add Transaction** button — choose income or expense, amount, category, date, and note.
4. **Set a budget** by going to the **Budgets** page and entering a monthly limit, then allocate amounts per category.
5. **View analytics** on the Analytics page to see spending trends, category breakdowns, and month-over-month comparisons.
6. **Read AI insights** on the dashboard for personalized recommendations.
7. **Export** your transactions as CSV from the Expenses page.

---

## 📂 Folder Structure

```
wealthflow/
├── src/
│   ├── components/        # Reusable UI + feature components
│   │   └── ui/            # shadcn/ui primitives
│   ├── routes/            # File-based routing (TanStack Start)
│   ├── lib/               # Auth, formatters, hooks, utilities
│   ├── integrations/
│   │   └── supabase/      # Supabase client & types (auto-generated)
│   └── styles.css         # Tailwind v4 design tokens
├── supabase/
│   ├── migrations/        # Database schema migrations
│   └── functions/         # Edge functions (AI insights)
├── public/                # Static assets
└── package.json
```

---

## 🗄️ Database / Supabase Integration

WealthFlow uses **Supabase** as its backend, providing Postgres, authentication, and serverless edge functions.

### Tables
- `profiles` — user profile information (auto-created on signup via trigger)
- `transactions` — income and expense records
- `budgets` — monthly budget limits
- `budget_categories` — per-category allocations
- `ai_insights` — generated AI tips and warnings

### Security
- **Row Level Security (RLS)** is enabled on every table.
- Users can only read and write their own data.
- A Postgres trigger creates a profile row automatically when a new user signs up.

### Edge Functions
- `ai-insights` — analyzes transactions vs. budgets and generates insights using rule-based logic combined with the Lovable AI Gateway (Google Gemini).

---

## 🔑 Environment Variables

Create a `.env` file in the project root:

```env
# Supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_ANON_KEY
VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_REF

# Server-side (used by edge functions)
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
LOVABLE_API_KEY=YOUR_LOVABLE_AI_KEY
```

> ⚠️ Never commit `.env` to version control. Service role keys must remain server-side only.

---

## 🚢 Deployment

### Option 1 — Lovable (Recommended)
1. Open the project in Lovable.
2. Click **Publish** in the top-right.
3. Your app deploys instantly to `https://YOUR_PROJECT.lovable.app`.
4. (Optional) Connect a custom domain from **Project Settings → Domains**.

### Option 2 — Vercel
1. Push your repository to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Add the environment variables in **Project Settings → Environment Variables**.
4. Deploy — Vercel will auto-detect the build command (`npm run build`).

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.

---

## 🔮 Future Improvements

- 🏦 Bank account integration via Plaid for automatic transaction sync
- 🔁 Recurring transactions and bills tracking
- 💱 Multi-currency support with live exchange rates
- 🧾 Receipt scanning with OCR
- 👨‍👩‍👧 Shared / family budgets and collaborative expense splitting
- 📲 Native mobile apps (iOS & Android)
- 📤 PDF report exports
- 🌍 Internationalization (i18n)
- 🌑 Dark mode toggle
- 🔐 Two-factor authentication (2FA)

---

> Built with ❤️ using React, Supabase, and Lovable.
