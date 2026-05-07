import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtMoney, fmtDate, monthStart, monthEnd } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, TrendingUp, Sparkles, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { getCategoryMeta } from "@/lib/categories";
import { AiInsightsPanel } from "@/components/ai-insights-panel";

export const Route = createFileRoute("/dashboard")({ component: DashboardPage });

function DashboardPage() {
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const start = monthStart();
  const end = monthEnd();

  const { data: txs = [] } = useQuery({
    queryKey: ["txs", "month", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("transactions").select("*").eq("user_id", user!.id).order("date", { ascending: false });
      return data || [];
    },
  });

  const { data: budget } = useQuery({
    queryKey: ["budget", start, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: b } = await supabase.from("budgets").select("*").eq("user_id", user!.id).eq("month", start).maybeSingle();
      const { data: bcs } = await supabase.from("budget_categories").select("*").eq("user_id", user!.id).order("created_at");
      return { budget: b, categories: bcs || [] };
    },
  });

  const monthTx = txs.filter((t) => t.date >= start && t.date <= end);
  const totalIncome = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const allIncome = txs.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const allExpense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const balance = allIncome - allExpense;

  // weekly chart
  const week = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const total = monthTx.filter((t) => t.type === "expense" && t.date === key).reduce((s, t) => s + Number(t.amount), 0);
    return { day: d.toLocaleDateString("en-US", { weekday: "short" }), total };
  });

  const recent = txs.slice(0, 5);

  const byCat = new Map<string, number>();
  monthTx.filter((t) => t.type === "expense").forEach((t) => byCat.set(t.category, (byCat.get(t.category) || 0) + Number(t.amount)));
  const top3 = (budget?.categories || []).slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Welcome back 👋</h1>
        <p className="text-muted-foreground">Here's how your money is moving this month.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 shadow-soft relative overflow-hidden">
          <p className="text-sm text-muted-foreground">Total Balance</p>
          <p className="mt-2 text-3xl font-bold">{fmtMoney(balance)}</p>
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-success">
            <TrendingUp className="size-3" /> Net worth
          </div>
        </Card>
        <Card className="p-5 shadow-soft">
          <p className="text-sm text-muted-foreground">Income (this month)</p>
          <p className="mt-2 text-3xl font-bold text-success">{fmtMoney(totalIncome)}</p>
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-success">
            <ArrowUpRight className="size-3" /> {monthTx.filter(t=>t.type==="income").length} transactions
          </div>
        </Card>
        <Card className="p-5 shadow-soft">
          <p className="text-sm text-muted-foreground">Expenses (this month)</p>
          <p className="mt-2 text-3xl font-bold">{fmtMoney(totalExpense)}</p>
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-destructive">
            <ArrowDownRight className="size-3" /> {monthTx.filter(t=>t.type==="expense").length} transactions
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 shadow-soft lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Weekly Spending</h3>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </div>
            <span className="text-sm font-medium">{fmtMoney(week.reduce((s, w) => s + w.total, 0))}</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={week}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} className="text-xs" />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)" }}
                  contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12 }}
                  formatter={(v: number) => fmtMoney(v)}
                />
                <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                  {week.map((_, i) => <Cell key={i} fill="var(--color-primary)" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Budget Progress</h3>
            <Link to="/budgets" className="text-xs text-primary inline-flex items-center">View all <ChevronRight className="size-3" /></Link>
          </div>
          {top3.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No budgets yet. <Link to="/budgets" className="text-primary">Set one up</Link>.
            </div>
          ) : (
            <div className="space-y-4">
              {top3.map((bc) => {
                const spent = byCat.get(bc.category_name) || 0;
                const alloc = Number(bc.allocated_amount) || 0;
                const pct = alloc ? Math.min(spent / alloc * 100, 150) : 0;
                const color = pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-warning" : "bg-success";
                return (
                  <div key={bc.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{bc.category_name}</span>
                      <span className="text-muted-foreground">{fmtMoney(spent)} / {fmtMoney(alloc)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 shadow-soft lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent Transactions</h3>
            <Link to="/expenses" className="text-xs text-primary inline-flex items-center">View all <ChevronRight className="size-3" /></Link>
          </div>
          {recent.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No transactions yet. Add your first one!</div>
          ) : (
            <div className="divide-y">
              {recent.map((t) => {
                const meta = getCategoryMeta(t.category);
                const Icon = meta.icon;
                return (
                  <div key={t.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className={`size-10 rounded-xl ${meta.ring} flex items-center justify-center`}>
                        <Icon className={`size-5 ${meta.color}`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{t.description}</p>
                        <p className="text-xs text-muted-foreground">{t.category} • {fmtDate(t.date)}</p>
                      </div>
                    </div>
                    <span className={`font-semibold text-sm ${t.type === "income" ? "text-success" : ""}`}>
                      {t.type === "income" ? "+" : "-"}{fmtMoney(Number(t.amount))}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <AiInsightsPanel />
      </div>
    </div>
  );
}
