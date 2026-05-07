import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtMoney, fmtMonth, monthStart, monthEnd } from "@/lib/format";
import { EXPENSE_CATEGORIES, getCategoryMeta } from "@/lib/categories";
import { Plus, Trash2, Loader2, Target } from "lucide-react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/budgets")({ component: BudgetsPage });

function BudgetsPage() { return <AppShell><Budgets /></AppShell>; }

type CatRow = { id?: string; category_name: string; allocated_amount: number };

function Budgets() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const month = monthStart();

  const { data, isLoading } = useQuery({
    queryKey: ["budget-page", user?.id, month],
    enabled: !!user,
    queryFn: async () => {
      const { data: b } = await supabase.from("budgets").select("*").eq("user_id", user!.id).eq("month", month).maybeSingle();
      const { data: bcs } = await supabase.from("budget_categories").select("*").eq("user_id", user!.id).order("created_at");
      const { data: txs } = await supabase.from("transactions").select("*").eq("user_id", user!.id).eq("type", "expense").gte("date", month).lte("date", monthEnd());
      return { budget: b, cats: (bcs || []) as any[], txs: txs || [] };
    },
  });

  const [total, setTotal] = useState(0);
  const [savingsGoal, setSavingsGoal] = useState(0);
  const [rows, setRows] = useState<CatRow[]>([]);
  const [newCat, setNewCat] = useState("Housing");
  const [newAmt, setNewAmt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setTotal(Number(data.budget?.total_budget || 0));
      const goal = Number(localStorage.getItem(`savings_goal_${user?.id}`) || 0);
      setSavingsGoal(goal);
      setRows(data.cats.map((c: any) => ({ id: c.id, category_name: c.category_name, allocated_amount: Number(c.allocated_amount) })));
    }
  }, [data, user]);

  const allocated = rows.reduce((s, r) => s + Number(r.allocated_amount || 0), 0);
  const remaining = total - allocated;

  const spentByCat = new Map<string, number>();
  (data?.txs || []).forEach((t) => spentByCat.set(t.category, (spentByCat.get(t.category) || 0) + Number(t.amount)));
  const totalSpent = (data?.txs || []).reduce((s, t) => s + Number(t.amount), 0);
  const savingsProgress = total > 0 ? Math.max(0, Math.min(100, ((total - totalSpent) / Math.max(savingsGoal || 1, 1)) * 100)) : 0;

  const addRow = () => {
    if (!newAmt || Number(newAmt) <= 0) return toast.error("Enter an allocation amount.");
    if (rows.some((r) => r.category_name === newCat)) return toast.error("Category already added.");
    setRows([...rows, { category_name: newCat, allocated_amount: Number(newAmt) }]);
    setNewAmt("");
  };

  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!user) return;
    if (allocated > total && total > 0) return toast.error("Allocations exceed total budget.");
    setSaving(true);
    // upsert budget
    const { data: b, error: be } = await supabase.from("budgets").upsert({
      user_id: user.id, month, total_budget: total,
    }, { onConflict: "user_id,month" }).select().single();
    if (be) { setSaving(false); return toast.error(be.message); }
    // delete removed
    const existingIds = (data?.cats || []).map((c: any) => c.id);
    const keptIds = rows.map((r) => r.id).filter(Boolean);
    const removed = existingIds.filter((id: string) => !keptIds.includes(id));
    if (removed.length) await supabase.from("budget_categories").delete().in("id", removed);
    // upsert each
    for (const r of rows) {
      if (r.id) {
        await supabase.from("budget_categories").update({ allocated_amount: r.allocated_amount, category_name: r.category_name }).eq("id", r.id);
      } else {
        await supabase.from("budget_categories").insert({ user_id: user.id, budget_id: b.id, category_name: r.category_name, allocated_amount: r.allocated_amount });
      }
    }
    localStorage.setItem(`savings_goal_${user.id}`, String(savingsGoal));
    setSaving(false);
    toast.success("Budget saved.");
    qc.invalidateQueries();
  };

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Budget — {fmtMonth(new Date())}</h1>
        <p className="text-muted-foreground text-sm">Allocate your income and stay on track.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4">
          <Card className="p-6 shadow-soft">
            <p className="text-sm text-muted-foreground">Monthly Budget</p>
            <div className="relative mt-2 max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-2xl font-semibold text-muted-foreground">$</span>
              <Input type="number" value={total} onChange={(e) => setTotal(Number(e.target.value))} className="text-3xl font-bold h-14 pl-9" />
            </div>
            <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
              <span>Allocated: <strong className="text-foreground">{fmtMoney(allocated)}</strong></span>
              <span className={remaining < 0 ? "text-destructive" : ""}>Remaining: <strong>{fmtMoney(remaining)}</strong></span>
            </div>
          </Card>

          <Card className="p-6 shadow-soft">
            <h3 className="font-semibold mb-4">Category Allocations</h3>
            <div className="space-y-3">
              {rows.length === 0 && <p className="text-sm text-muted-foreground">No allocations yet. Add one below.</p>}
              {rows.map((r, i) => {
                const meta = getCategoryMeta(r.category_name);
                const Icon = meta.icon;
                const spent = spentByCat.get(r.category_name) || 0;
                const pct = r.allocated_amount ? Math.min(spent / r.allocated_amount * 100, 150) : 0;
                const color = pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-warning" : "bg-success";
                return (
                  <div key={i} className="border rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className={`size-10 rounded-xl ${meta.ring} flex items-center justify-center`}><Icon className={`size-5 ${meta.color}`} /></div>
                      <div className="flex-1">
                        <p className="font-medium">{r.category_name}</p>
                        <p className="text-xs text-muted-foreground">{fmtMoney(spent)} spent</p>
                      </div>
                      <div className="relative w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input type="number" className="pl-6" value={r.allocated_amount}
                          onChange={(e) => setRows(rows.map((x, idx) => idx === i ? { ...x, allocated_amount: Number(e.target.value) } : x))} />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeRow(i)}><Trash2 className="size-4" /></Button>
                    </div>
                    <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap gap-2 items-end border-t pt-4">
              <div className="flex-1 min-w-[160px]">
                <label className="text-xs text-muted-foreground">Add category</label>
                <Select value={newCat} onValueChange={setNewCat}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <label className="text-xs text-muted-foreground">Amount</label>
                <Input type="number" value={newAmt} onChange={(e) => setNewAmt(e.target.value)} placeholder="0" />
              </div>
              <Button onClick={addRow}><Plus className="size-4" /> Add</Button>
            </div>

            <Button className="mt-6 w-full" size="lg" onClick={save} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />} Save Budget
            </Button>
          </Card>
        </div>

        <Card className="p-6 shadow-soft h-fit">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-primary" />
            <h3 className="font-semibold">Savings Goal</h3>
          </div>
          <div className="mt-4 flex items-center justify-center">
            <CircularProgress value={savingsProgress} />
          </div>
          <div className="mt-4 space-y-2">
            <label className="text-xs text-muted-foreground">Monthly contribution</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input type="number" value={savingsGoal} onChange={(e) => setSavingsGoal(Number(e.target.value))} className="pl-6" />
            </div>
            <p className="text-xs text-muted-foreground">
              {savingsGoal > 0
                ? `On track to save ${fmtMoney(Math.max(0, total - totalSpent))} this month.`
                : "Set a savings target to track your progress."}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function CircularProgress({ value }: { value: number }) {
  const r = 50, c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className="relative size-32">
      <svg viewBox="0 0 120 120" className="-rotate-90">
        <circle cx="60" cy="60" r={r} stroke="var(--color-muted)" strokeWidth="10" fill="none" />
        <circle cx="60" cy="60" r={r} stroke="var(--color-primary)" strokeWidth="10" fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{Math.round(value)}%</span>
        <span className="text-xs text-muted-foreground">complete</span>
      </div>
    </div>
  );
}
