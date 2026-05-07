// AI insights edge function
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    // identify user
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SERVICE_KEY },
    });
    if (!userRes.ok) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { id: userId } = await userRes.json();

    // pull data using service key (we constrain by userId)
    const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const prevStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().slice(0, 10);

    const [txRes, budRes, bcRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/transactions?user_id=eq.${userId}&date=gte.${prevStart}&select=*`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/budgets?user_id=eq.${userId}&month=eq.${monthStart}&select=*`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/budget_categories?user_id=eq.${userId}&select=*`, { headers }),
    ]);
    const txs: any[] = await txRes.json();
    const budgets: any[] = await budRes.json();
    const bcs: any[] = await bcRes.json();

    const monthTx = txs.filter((t) => t.date >= monthStart);
    const prevTx = txs.filter((t) => t.date < monthStart);
    const totalSpent = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    const budget = budgets[0];

    const byCat = new Map<string, number>();
    monthTx.filter((t) => t.type === "expense").forEach((t) => byCat.set(t.category, (byCat.get(t.category) || 0) + Number(t.amount)));
    const prevByCat = new Map<string, number>();
    prevTx.filter((t) => t.type === "expense").forEach((t) => prevByCat.set(t.category, (prevByCat.get(t.category) || 0) + Number(t.amount)));

    type Ins = { insight_type: string; message: string; priority: "low" | "medium" | "high" };
    const rule: Ins[] = [];

    if (budget && Number(budget.total_budget) > 0) {
      const pct = totalSpent / Number(budget.total_budget);
      if (pct >= 1) rule.push({ insight_type: "warning", priority: "high", message: `You've exceeded your monthly budget by $${(totalSpent - Number(budget.total_budget)).toFixed(2)}. Consider cutting back this week.` });
      else if (pct >= 0.9) rule.push({ insight_type: "warning", priority: "medium", message: `You've used ${Math.round(pct * 100)}% of your monthly budget. Tighten discretionary spending.` });
      else if (pct < 0.6) rule.push({ insight_type: "goal", priority: "low", message: `Great pace! You've used only ${Math.round(pct * 100)}% of your budget so far.` });
    }

    bcs.forEach((bc) => {
      const spent = byCat.get(bc.category_name) || 0;
      const alloc = Number(bc.allocated_amount);
      if (alloc <= 0) return;
      const pct = spent / alloc;
      if (pct >= 1) rule.push({ insight_type: "warning", priority: "high", message: `${bc.category_name} is over budget by $${(spent - alloc).toFixed(2)}. Reduce spending here this week.` });
      else if (pct >= 0.8) rule.push({ insight_type: "warning", priority: "medium", message: `You're at ${Math.round(pct * 100)}% of your ${bc.category_name} budget — close to the limit.` });
      else if (pct < 0.5 && spent > 0) rule.push({ insight_type: "tip", priority: "low", message: `Nice — ${bc.category_name} is under budget by $${(alloc - spent).toFixed(2)}.` });
    });

    byCat.forEach((curr, cat) => {
      const prev = prevByCat.get(cat) || 0;
      if (prev > 0) {
        const change = ((curr - prev) / prev) * 100;
        if (change >= 20) rule.push({ insight_type: "warning", priority: "medium", message: `${cat} spending increased by ${Math.round(change)}% vs last month.` });
      }
    });

    // AI polish via Lovable AI
    let aiNotes: Ins[] = [];
    try {
      const summary = {
        total_spent: totalSpent.toFixed(2),
        total_budget: budget?.total_budget || 0,
        top_categories: Array.from(byCat.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5),
      };
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a friendly personal finance coach. Return 2 short, specific, actionable tips (one sentence each) based on the user's data. Plain text, separated by newlines, no numbering." },
            { role: "user", content: `My month so far: ${JSON.stringify(summary)}` },
          ],
        }),
      });
      if (aiRes.ok) {
        const j = await aiRes.json();
        const text: string = j.choices?.[0]?.message?.content ?? "";
        aiNotes = text.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 2)
          .map((m) => ({ insight_type: "tip", priority: "low", message: m.replace(/^[-•*\d.\s]+/, "") } as Ins));
      }
    } catch (e) { console.error("AI failed:", e); }

    const all = [...rule, ...aiNotes].slice(0, 5);

    // Replace previous insights for this user
    await fetch(`${SUPABASE_URL}/rest/v1/ai_insights?user_id=eq.${userId}`, { method: "DELETE", headers });
    if (all.length) {
      await fetch(`${SUPABASE_URL}/rest/v1/ai_insights`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify(all.map((i) => ({ ...i, user_id: userId }))),
      });
    }

    return new Response(JSON.stringify({ count: all.length, insights: all }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message || "Failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
