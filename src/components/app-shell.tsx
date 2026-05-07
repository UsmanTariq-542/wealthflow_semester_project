import { useEffect, useState, type ReactNode } from "react";
import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, CreditCard, BarChart3, Wallet, Bell, LogOut, Plus, Menu, X, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { TransactionDialog } from "@/components/transaction-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/lib/use-notifications";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/expenses", label: "Expenses", icon: CreditCard },
  { to: "/budgets", label: "Budgets", icon: Wallet },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
] as const;

export function AppShell({ children }: { children?: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openTx, setOpenTx] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const initial = (profile?.full_name || user?.email || "U")[0].toUpperCase();
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "You";

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 bg-sidebar border-r border-sidebar-border flex-col">
        <div className="p-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="size-9 rounded-xl gradient-brand flex items-center justify-center"><Wallet className="size-5 text-white" /></div>
            <span className="font-bold text-lg">WealthFlow</span>
          </Link>
        </div>
        <nav className="px-3 flex-1 space-y-1">
          {NAV.map((n) => {
            const active = location.pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}>
                <n.icon className="size-4" />{n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3">
          <Button onClick={() => setOpenTx(true)} className="w-full" size="lg">
            <Plus className="size-4" /> Add Transaction
          </Button>
        </div>
      </aside>

      {/* Topbar */}
      <header className="md:pl-64 sticky top-0 z-30 bg-background/80 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 md:px-8 h-16">
          <div className="flex items-center gap-2 md:hidden">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon"><Menu className="size-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="p-6 border-b">
                  <SheetTitle className="flex items-center gap-2">
                    <div className="size-8 rounded-xl gradient-brand flex items-center justify-center"><Wallet className="size-4 text-white" /></div>
                    WealthFlow
                  </SheetTitle>
                </SheetHeader>
                <nav className="p-3 space-y-1">
                  {NAV.map((n) => (
                    <Link key={n.to} to={n.to} onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-accent">
                      <n.icon className="size-4" />{n.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            <div className="size-8 rounded-xl gradient-brand flex items-center justify-center"><Wallet className="size-4 text-white" /></div>
            <span className="font-bold">WealthFlow</span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <NotificationsBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full hover:bg-accent p-1 pr-3">
                  <div className="size-8 rounded-full gradient-brand text-white flex items-center justify-center font-semibold text-sm">
                    {initial}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{displayName}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/profile"><UserIcon className="size-4" /> Profile</Link></DropdownMenuItem>
                <DropdownMenuItem onClick={async () => { await signOut(); navigate({ to: "/login" }); }}>
                  <LogOut className="size-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="md:pl-64 pb-24 md:pb-8">
        <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto">{children ?? <Outlet />}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-background border-t z-30">
        <div className="grid grid-cols-5 items-center px-2 py-2">
          {NAV.slice(0, 2).map((n) => (
            <Link key={n.to} to={n.to} className={`flex flex-col items-center text-xs gap-0.5 py-1 ${location.pathname.startsWith(n.to) ? "text-primary" : "text-muted-foreground"}`}>
              <n.icon className="size-5" />{n.label}
            </Link>
          ))}
          <button onClick={() => setOpenTx(true)} className="flex justify-center">
            <span className="size-12 -mt-6 rounded-full gradient-brand text-white flex items-center justify-center shadow-elegant">
              <Plus className="size-6" />
            </span>
          </button>
          {NAV.slice(2).map((n) => (
            <Link key={n.to} to={n.to} className={`flex flex-col items-center text-xs gap-0.5 py-1 ${location.pathname.startsWith(n.to) ? "text-primary" : "text-muted-foreground"}`}>
              <n.icon className="size-5" />{n.label}
            </Link>
          ))}
        </div>
      </nav>

      <TransactionDialog open={openTx} onOpenChange={setOpenTx} />
    </div>
  );
}

function NotificationsBell() {
  const { alerts, dismissAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const count = alerts.length;
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          {count > 0 && (
            <span className="absolute top-1 right-1 size-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
              {count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notifications
          {count > 0 && <button onClick={dismissAll} className="text-xs text-primary">Clear all</button>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {count === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">You're all caught up.</div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {alerts.map((a) => (
              <div key={a.id} className="px-3 py-2.5 border-b last:border-0">
                <div className="flex items-start gap-2">
                  <Badge variant={a.severity === "high" ? "destructive" : "secondary"} className="mt-0.5 capitalize">{a.severity}</Badge>
                  <p className="text-sm">{a.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
