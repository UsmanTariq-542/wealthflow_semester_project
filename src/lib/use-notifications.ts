import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { monthStart, monthEnd } from "@/lib/format";

export type Alert = {
  id: string;
  severity: "low" | "medium" | "high";
  message: string;
};

export function useNotifications() {
  const { user } = useAuth();
  const { data: alerts = [], refetch } = useQuery({
    queryKey: ["alerts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const start = monthStart();
      const end = monthEnd();
      const [{ data: budget }, { data: bcs }, { data: txs }] = await Promise.all([
        supabase.from("budgets").select("*").eq("user_id", user!.id).eq("month", start).maybeSingle(),
        supabase.from("budget_categories").select("*").eq("user_id", user!.id),
        supabase.from("transactions").select("*").eq("user_id", user!.id).eq("type", "expense").gte("date", start).lte("date", end),
      ]);
      const dismissed: string[] = JSON.parse(localStorage.getItem("dismissed_alerts") || "[]");
      const out: Alert[] = [];
      const totalSpent = (txs || []).reduce((s, t) => s + Number(t.amount), 0);
      if (budget && Number(budget.total_budget) > 0) {
        const pct = totalSpent / Number(budget.total_budget);
        if (pct >= 0.9 && pct < 1) out.push({ id: "monthly-90", severity: "medium", message: `You've used ${Math.round(pct * 100)}% of your monthly budget.` });
        if (pct >= 1) out.push({ id: "monthly-over", severity: "high", message: `Monthly budget exceeded by $${(totalSpent - Number(budget.total_budget)).toFixed(2)}.` });
      }
      if (bcs && bcs.length) {
        const byCat = new Map<string, number>();
        (txs || []).forEach((t) => byCat.set(t.category, (byCat.get(t.category) || 0) + Number(t.amount)));
        bcs.forEach((bc) => {
          const spent = byCat.get(bc.category_name) || 0;
          const alloc = Number(bc.allocated_amount);
          if (alloc <= 0) return;
          const pct = spent / alloc;
          if (pct >= 1) out.push({ id: `cat-over-${bc.id}`, severity: "high", message: `${bc.category_name} is over budget by $${(spent - alloc).toFixed(2)}.` });
          else if (pct >= 0.8) out.push({ id: `cat-80-${bc.id}`, severity: "medium", message: `You're at ${Math.round(pct * 100)}% of your ${bc.category_name} budget.` });
        });
      }
      return out.filter((a) => !dismissed.includes(a.id));
    },
  });

  return {
    alerts,
    dismissAll: () => {
      const ids = alerts.map((a) => a.id);
      const prev: string[] = JSON.parse(localStorage.getItem("dismissed_alerts") || "[]");
      localStorage.setItem("dismissed_alerts", JSON.stringify([...prev, ...ids]));
      refetch();
    },
  };
}
