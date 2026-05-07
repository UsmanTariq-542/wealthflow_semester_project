import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Lightbulb, AlertTriangle, Target, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function AiInsightsPanel() {
  const { user, session } = useAuth();
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: insights = [] } = useQuery({
    queryKey: ["ai_insights", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("ai_insights").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
  });

  const generate = async () => {
    if (!session) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-insights", {});
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["ai_insights"] });
      toast.success(`Generated ${data?.count ?? 0} insights.`);
    } catch (e: any) {
      toast.error(e?.message || "Could not generate insights.");
    } finally {
      setGenerating(false);
    }
  };

  // Auto-generate on first load if empty
  useEffect(() => {
    if (user && insights.length === 0 && !generating) {
      generate();
    }
    // eslint-disable-next-line
  }, [user]);

  const iconFor = (type: string) =>
    type === "warning" ? AlertTriangle : type === "tip" ? Lightbulb : type === "goal" ? Target : Sparkles;

  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h3 className="font-semibold">AI Recommendations</h3>
        </div>
        <Button size="sm" variant="ghost" onClick={generate} disabled={generating}>
          {generating ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        </Button>
      </div>
      {insights.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center">
          {generating ? "Analyzing your spending…" : "Add a few transactions to get personalized insights."}
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((i) => {
            const Icon = iconFor(i.insight_type);
            const tone =
              i.priority === "high" ? "bg-destructive/10 text-destructive" :
              i.priority === "medium" ? "bg-warning/15 text-warning-foreground" :
              "bg-primary/10 text-primary";
            return (
              <div key={i.id} className="flex items-start gap-3">
                <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
                  <Icon className="size-4" />
                </div>
                <p className="text-sm leading-relaxed">{i.message}</p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
