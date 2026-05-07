import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtMoney, fmtDate } from "@/lib/format";
import { getCategoryMeta, EXPENSE_CATEGORIES } from "@/lib/categories";
import { TransactionDialog } from "@/components/transaction-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Trash2, Pencil, ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/expenses")({ component: ExpensesPage });

const PAGE_SIZE = 10;

function ExpensesPage() {
  return <AppShell><Expenses /></AppShell>;
}

function Expenses() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCats, setFilterCats] = useState<string[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [minAmt, setMinAmt] = useState("");
  const [maxAmt, setMaxAmt] = useState("");
  const [sort, setSort] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc" | "category">("date_desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: txs = [] } = useQuery({
    queryKey: ["txs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("transactions").select("*").eq("user_id", user!.id).order("date", { ascending: false });
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    let r = [...txs];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((t) => t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    }
    if (filterCats.length) r = r.filter((t) => filterCats.includes(t.category));
    if (from) r = r.filter((t) => t.date >= from);
    if (to) r = r.filter((t) => t.date <= to);
    if (minAmt) r = r.filter((t) => Number(t.amount) >= Number(minAmt));
    if (maxAmt) r = r.filter((t) => Number(t.amount) <= Number(maxAmt));
    switch (sort) {
      case "date_asc": r.sort((a, b) => a.date.localeCompare(b.date)); break;
      case "date_desc": r.sort((a, b) => b.date.localeCompare(a.date)); break;
      case "amount_asc": r.sort((a, b) => Number(a.amount) - Number(b.amount)); break;
      case "amount_desc": r.sort((a, b) => Number(b.amount) - Number(a.amount)); break;
      case "category": r.sort((a, b) => a.category.localeCompare(b.category)); break;
    }
    return r;
  }, [txs, search, filterCats, from, to, minAmt, maxAmt, sort]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const view = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const summaryByCat = useMemo(() => {
    const m = new Map<string, number>();
    filtered.filter((t) => t.type === "expense").forEach((t) => m.set(t.category, (m.get(t.category) || 0) + Number(t.amount)));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const totalSpend = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  const exportCSV = () => {
    const header = ["Date", "Type", "Category", "Description", "Amount", "Payment", "Notes"];
    const rows = filtered.map((t) => [t.date, t.type, t.category, t.description, t.amount, t.payment_method || "", (t.notes || "").replace(/\n/g, " ")]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `wealthflow-transactions-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const doDelete = async (id: string) => {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted.");
    setConfirmDelete(null); setSelected(null);
    qc.invalidateQueries();
  };

  const toggleCat = (c: string) =>
    setFilterCats((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Expenses</h1>
          <p className="text-muted-foreground text-sm">All your transactions in one place.</p>
        </div>
        <Button variant="outline" onClick={exportCSV}><Download className="size-4" /> Export CSV</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <Card className="p-5 shadow-soft">
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" placeholder="Search transactions…" />
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v as any)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Newest first</SelectItem>
                <SelectItem value="date_asc">Oldest first</SelectItem>
                <SelectItem value="amount_desc">Amount: high → low</SelectItem>
                <SelectItem value="amount_asc">Amount: low → high</SelectItem>
                <SelectItem value="category">Category A → Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={() => setFilterCats([])} className={`px-3 py-1 rounded-full text-xs border ${filterCats.length === 0 ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}>All</button>
            {EXPENSE_CATEGORIES.slice(0, 7).map((c) => (
              <button key={c.name} onClick={() => { toggleCat(c.name); setPage(1); }}
                className={`px-3 py-1 rounded-full text-xs border ${filterCats.includes(c.name) ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}>
                {c.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <div><label className="text-xs text-muted-foreground">From</label><Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></div>
            <div><label className="text-xs text-muted-foreground">To</label><Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></div>
            <div><label className="text-xs text-muted-foreground">Min $</label><Input type="number" value={minAmt} onChange={(e) => setMinAmt(e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground">Max $</label><Input type="number" value={maxAmt} onChange={(e) => setMaxAmt(e.target.value)} /></div>
          </div>

          {view.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No transactions match your filters.</div>
          ) : (
            <div className="divide-y">
              {view.map((t) => {
                const meta = getCategoryMeta(t.category);
                const Icon = meta.icon;
                return (
                  <button key={t.id} onClick={() => setSelected(t)} className="w-full flex items-center justify-between py-3 text-left hover:bg-accent/40 px-2 rounded-lg transition">
                    <div className="flex items-center gap-3">
                      <div className={`size-10 rounded-xl ${meta.ring} flex items-center justify-center`}><Icon className={`size-5 ${meta.color}`} /></div>
                      <div>
                        <p className="font-medium text-sm">{t.description}</p>
                        <p className="text-xs text-muted-foreground">{t.category} • {fmtDate(t.date)}</p>
                      </div>
                    </div>
                    <span className={`font-semibold text-sm ${t.type === "income" ? "text-success" : ""}`}>
                      {t.type === "income" ? "+" : "-"}{fmtMoney(Number(t.amount))}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}><ChevronLeft className="size-4" /></Button>
              <span>{page} / {pages}</span>
              <Button variant="outline" size="icon" onClick={() => setPage(Math.min(pages, page + 1))} disabled={page === pages}><ChevronRight className="size-4" /></Button>
            </div>
          </div>
        </Card>

        <Card className="p-5 shadow-soft h-fit">
          <h3 className="font-semibold">Summary</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Filtered results</p>
          <p className="mt-3 text-2xl font-bold">{fmtMoney(totalSpend)}</p>
          <div className="mt-4 space-y-2">
            {summaryByCat.slice(0, 6).map(([cat, amt]) => {
              const meta = getCategoryMeta(cat);
              const Icon = meta.icon;
              const pct = totalSpend ? (amt / totalSpend) * 100 : 0;
              return (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="inline-flex items-center gap-1"><Icon className={`size-3 ${meta.color}`} />{cat}</span>
                    <span className="text-muted-foreground">{fmtMoney(amt)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && <DetailContent tx={selected} onEdit={() => { setEditing(selected); setSelected(null); }} onDelete={() => setConfirmDelete(selected.id)} />}
        </DialogContent>
      </Dialog>

      <TransactionDialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)} initial={editing} />

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && doDelete(confirmDelete)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DetailContent({ tx, onEdit, onDelete }: { tx: any; onEdit: () => void; onDelete: () => void }) {
  const meta = getCategoryMeta(tx.category);
  const Icon = meta.icon;
  return (
    <div>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <div className={`size-10 rounded-xl ${meta.ring} flex items-center justify-center`}><Icon className={`size-5 ${meta.color}`} /></div>
          {tx.description}
        </DialogTitle>
      </DialogHeader>
      <div className="mt-4">
        <p className={`text-4xl font-bold ${tx.type === "income" ? "text-success" : ""}`}>
          {tx.type === "income" ? "+" : "-"}{fmtMoney(Number(tx.amount))}
        </p>
        <Badge className="mt-2" variant="secondary">Completed</Badge>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <Field label="Category" value={tx.category} />
        <Field label="Type" value={tx.type === "income" ? "Income" : "Expense"} />
        <Field label="Date" value={fmtDate(tx.date)} />
        <Field label="Payment" value={tx.payment_method || "—"} />
      </div>
      {tx.notes && (
        <div className="mt-4">
          <p className="text-xs text-muted-foreground">Notes</p>
          <p className="text-sm mt-1">{tx.notes}</p>
        </div>
      )}
      <DialogFooter className="mt-6 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onDelete} className="text-destructive border-destructive/30 hover:bg-destructive/10">
          <Trash2 className="size-4" /> Delete
        </Button>
        <Button onClick={onEdit}><Pencil className="size-4" /> Edit</Button>
      </DialogFooter>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium mt-0.5">{value}</p>
    </div>
  );
}
