import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, ChartPie, Sparkles, Wallet, TrendingUp, Utensils, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Onboarding,
});

const slides = [
  {
    title: "Track Every Penny",
    sub: "Keep a clear record of your daily spending and build better financial habits with smart expense tracking.",
    cta: "Continue",
    visual: "track" as const,
  },
  {
    title: "Smart Insights",
    sub: "Unlock actionable intelligence tailored to your spending habits. WealthFlow analyzes your transactions to find hidden savings.",
    cta: "Next",
    visual: "insights" as const,
  },
  {
    title: "Smart Budgeting",
    sub: "Take control of your finances with automated categorization and intelligent budget tracking. See where your money goes.",
    cta: "Get Started",
    visual: "budget" as const,
  },
];

function Onboarding() {
  const [step, setStep] = useState(-1); // -1 splash, 0..2 slides
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        // already signed in
        window.location.replace("/dashboard");
      } else {
        setAuthChecked(true);
        const t = setTimeout(() => setStep(0), 1400);
        return () => clearTimeout(t);
      }
    });
  }, []);

  if (!authChecked || step === -1) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gradient-brand text-white px-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="size-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-elegant">
            <Wallet className="size-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">WealthFlow</h1>
        </div>
        <p className="text-white/80 text-sm">Confident clarity for your financial future</p>
        <div className="mt-10 flex items-center gap-2 text-xs text-white/70">
          <span className="size-2 rounded-full bg-white/80 animate-pulse" />
          Securing connection…
        </div>
      </div>
    );
  }

  const current = slides[step];
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col px-6 pt-10 pb-8 max-w-md mx-auto w-full">
        <div className="flex items-center gap-2 mb-8">
          <div className="size-9 rounded-xl gradient-brand flex items-center justify-center">
            <Wallet className="size-5 text-white" />
          </div>
          <span className="font-semibold">WealthFlow</span>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <SlideVisual kind={current.visual} />
        </div>

        <div className="mt-6 space-y-3">
          <h2 className="text-3xl font-bold tracking-tight">{current.title}</h2>
          <p className="text-muted-foreground leading-relaxed">{current.sub}</p>
        </div>

        <div className="mt-6 flex items-center gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === step ? "w-8 bg-primary" : "w-1.5 bg-muted"}`}
            />
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {step < slides.length - 1 ? (
            <Button size="lg" className="w-full" onClick={() => setStep(step + 1)}>
              {current.cta} <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button asChild size="lg" className="w-full">
              <Link to="/signup">
                {current.cta} <ArrowRight className="size-4" />
              </Link>
            </Button>
          )}
          <Link to="/login" className="text-center text-sm text-muted-foreground hover:text-foreground">
            Already have an account? <span className="text-primary font-medium">Log in</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function SlideVisual({ kind }: { kind: "track" | "insights" | "budget" }) {
  if (kind === "track") {
    return (
      <div className="w-full space-y-3">
        <Card className="p-4 flex items-center justify-between shadow-soft">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Utensils className="size-5 text-orange-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Dining Out</p>
              <p className="text-xs text-muted-foreground">Today</p>
            </div>
          </div>
          <span className="font-semibold text-sm">-$45.90</span>
        </Card>
        <Card className="p-4 flex items-center justify-between shadow-soft">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <ShoppingCart className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Groceries</p>
              <p className="text-xs text-muted-foreground">Yesterday</p>
            </div>
          </div>
          <span className="font-semibold text-sm">-$112.50</span>
        </Card>
        <Card className="p-4 gradient-brand text-white shadow-elegant">
          <p className="text-xs opacity-80">Income</p>
          <p className="text-2xl font-bold mt-1">+$2,400</p>
        </Card>
      </div>
    );
  }
  if (kind === "insights") {
    return (
      <div className="w-full space-y-3">
        <Card className="p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <ChartPie className="size-4 text-primary" />
            <p className="font-semibold text-sm">Category Split</p>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden">
            <div className="bg-primary" style={{ width: "45%" }} />
            <div className="bg-chart-2" style={{ width: "30%" }} />
            <div className="bg-chart-4" style={{ width: "25%" }} />
          </div>
          <div className="mt-3 grid grid-cols-3 text-xs gap-2">
            <div><div className="size-2 rounded-full bg-primary inline-block mr-1" />Food 45%</div>
            <div><div className="size-2 rounded-full bg-chart-2 inline-block mr-1" />Shop 30%</div>
            <div><div className="size-2 rounded-full bg-chart-4 inline-block mr-1" />Health 25%</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3 shadow-soft">
          <Sparkles className="size-5 text-primary" />
          <div>
            <p className="font-medium text-sm">Spending Optimized</p>
            <p className="text-xs text-muted-foreground">Save $185 this month</p>
          </div>
        </Card>
      </div>
    );
  }
  return (
    <div className="w-full space-y-3">
      <Card className="p-5 shadow-soft">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">Monthly Budget</p>
          <span className="text-xs text-muted-foreground">$4,500</span>
        </div>
        <div className="space-y-3">
          {[["Housing", 75], ["Food", 60], ["Transport", 40]].map(([n, p]) => (
            <div key={n as string}>
              <div className="flex justify-between text-xs mb-1">
                <span>{n}</span><span className="text-muted-foreground">{p as number}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${p}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-4 flex items-center gap-3 shadow-soft">
        <TrendingUp className="size-5 text-success" />
        <div>
          <p className="font-medium text-sm">On track to save $600</p>
          <p className="text-xs text-muted-foreground">Keep going!</p>
        </div>
      </Card>
    </div>
  );
}
