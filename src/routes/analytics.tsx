import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { fmtMoney } from "@/lib/format";
import { getCategoryMeta } from "@/lib/categories";

export const Route = createFileRoute("/analytics")({ component: AnalyticsPage });

function AnalyticsPage() { return <AppShell><Analytics /></AppShell>; }

const CHART_COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

function Analytics() {
  const { user } = useAuth();
  const [months, setMonths] = useState(6);

  const { data: txs = [] } = useQuery({
    queryKey: ["analytics", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("transactions").select("*").eq("user_id", user!.id);
      return data || [];
    },
  });

  const monthlySeries = useMemo(() => {
    const arr = Array.from({ length: months }).map((_, i) => {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (months - 1 - i));
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString("en-US", { month: "short" });
      return { key, label, expenses: 0, income: 0 };
    });
    txs.forEach((t) => {
      const k = t.date.slice(0, 7);
      const row = arr.find((r) => r.key === k);
      if (!row) return;
      if (t.type === "expense") row.expenses += Number(t.amount);
      else row.income += Number(t.amount);
    });
    return arr;
  }, [txs, months]);

  const categoryPie = useMemo(() => {
    const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - months);
    const map = new Map<string, number>();
    txs.filter((t) => t.type === "expense" && new Date(t.date) >= cutoff)
      .forEach((t) => map.set(t.category, (map.get(t.category) || 0) + Number(t.amount)));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [txs, months]);

  const totalCat = categoryPie.reduce((s, c) => s + c.value, 0);
  const topCat = categoryPie[0];
  const lastMonth = monthlySeries[monthlySeries.length - 1];
  const prevMonth = monthlySeries[monthlySeries.length - 2];
  const trendPct = prevMonth?.expenses ? ((lastMonth.expenses - prevMonth.expenses) / prevMonth.expenses) * 100 : 0;

  const exportReport = () => {
    const lines = ["Month,Income,Expenses", ...monthlySeries.map((m) => `${m.label},${m.income},${m.expenses}`)];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `wealthflow-report-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm">Visualize your spending trends.</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(months)} onValueChange={(v) => setMonths(Number(v))}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Last 3 Months</SelectItem>
              <SelectItem value="6">Last 6 Months</SelectItem>
              <SelectItem value="12">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportReport}><Download className="size-4" /> Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 shadow-soft lg:col-span-2">
          <h3 className="font-semibold mb-3">Monthly Spending</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12 }} formatter={(v: number) => fmtMoney(v)} />
                <Line type="monotone" dataKey="expenses" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4 }} name="Expenses" />
                <Line type="monotone" dataKey="income" stroke="var(--color-chart-4)" strokeWidth={3} dot={{ r: 4 }} name="Income" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 shadow-soft">
          <h3 className="font-semibold mb-3">Category Breakdown</h3>
          {categoryPie.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No expense data yet.</div>
          ) : (
            <>
              <div className="h-48">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={categoryPie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                      {categoryPie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmtMoney(v)} contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-sm text-muted-foreground">Total <span className="font-semibold text-foreground">{fmtMoney(totalCat)}</span></p>
              <div className="mt-3 space-y-1.5">
                {categoryPie.slice(0, 4).map((c, i) => (
                  <div key={c.name} className="flex justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      {c.name}
                    </span>
                    <span className="text-muted-foreground">{Math.round((c.value / totalCat) * 100)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      <Card className="p-5 shadow-soft">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="size-4 text-primary" /><h3 className="font-semibold">Trends & Insights</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <InsightTile
            icon={trendPct >= 0 ? TrendingUp : TrendingDown}
            tone={trendPct >= 20 ? "warning" : trendPct < 0 ? "success" : "neutral"}
            title="Month-over-Month"
            value={`${trendPct >= 0 ? "+" : ""}${trendPct.toFixed(1)}%`}
            sub={trendPct >= 0 ? "vs previous month" : "less than last month"}
          />
          <InsightTile
            icon={Sparkles}
            tone="neutral"
            title="Top category"
            value={topCat?.name ?? "—"}
            sub={topCat ? fmtMoney(topCat.value) : "No data"}
          />
          <InsightTile
            icon={TrendingDown}
            tone={lastMonth.income >= lastMonth.expenses ? "success" : "warning"}
            title="Savings this month"
            value={fmtMoney(Math.max(0, lastMonth.income - lastMonth.expenses))}
            sub={lastMonth.income >= lastMonth.expenses ? "On track 🎯" : "Below target"}
          />
        </div>
      </Card>
    </div>
  );
}

function InsightTile({ icon: Icon, tone, title, value, sub }: { icon: any; tone: "success" | "warning" | "neutral"; title: string; value: string; sub: string }) {
  const toneCls =
    tone === "success" ? "bg-success/15 text-success" :
    tone === "warning" ? "bg-warning/20 text-warning-foreground" : "bg-primary/10 text-primary";
  return (
    <div className="border rounded-xl p-4">
      <div className={`size-8 rounded-lg flex items-center justify-center ${toneCls}`}><Icon className="size-4" /></div>
      <p className="text-xs text-muted-foreground mt-3">{title}</p>
      <p className="text-xl font-bold mt-0.5">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
