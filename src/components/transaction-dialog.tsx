import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Tx = {
  id?: string;
  type: "expense" | "income";
  amount: number;
  category: string;
  description: string;
  notes?: string | null;
  payment_method?: string | null;
  date: string;
};

export function TransactionDialog({
  open, onOpenChange, initial,
}: { open: boolean; onOpenChange: (v: boolean) => void; initial?: Tx | null }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState<string>("Card");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (initial) {
        setType(initial.type);
        setAmount(String(initial.amount));
        setCategory(initial.category);
        setDescription(initial.description);
        setNotes(initial.notes || "");
        setPayment(initial.payment_method || "Card");
        setDate(initial.date);
      } else {
        setType("expense"); setAmount(""); setCategory(""); setDescription("");
        setNotes(""); setPayment("Card"); setDate(new Date().toISOString().slice(0, 10));
      }
    }
  }, [open, initial]);

  const cats = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const save = async () => {
    const amt = Number(amount);
    if (!user) return;
    if (!amt || amt <= 0) return toast.error("Enter an amount greater than 0.");
    if (!category) return toast.error("Select a category.");
    if (!description.trim()) return toast.error("Add a short description.");
    setSaving(true);
    const payload = {
      user_id: user.id,
      type, amount: amt, category, description: description.trim(),
      notes: notes.trim() || null,
      payment_method: type === "expense" ? payment : null,
      date,
    };
    const { error } = initial?.id
      ? await supabase.from("transactions").update(payload).eq("id", initial.id)
      : await supabase.from("transactions").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(initial?.id ? "Transaction updated." : "Transaction added.");
    qc.invalidateQueries();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 max-h-[90vh] flex flex-col gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>{initial?.id ? "Edit Transaction" : "New Transaction"}</DialogTitle>
        </DialogHeader>

        <Tabs value={type} onValueChange={(v) => { setType(v as any); setCategory(""); }} className="flex flex-col flex-1 min-h-0">
          <div className="px-6 pt-4 shrink-0">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="expense">Expense</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value={type} className="mt-0 flex-1 min-h-0 flex flex-col data-[state=inactive]:hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Amount</Label>
                <div className="relative mt-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-muted-foreground">$</span>
                  <Input
                    type="number" inputMode="decimal" step="0.01" min="0"
                    value={amount} onChange={(e) => setAmount(e.target.value)}
                    className="text-3xl font-bold h-16 pl-10" placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {cats.map((c) => {
                    const Icon = c.icon;
                    const active = category === c.name;
                    return (
                      <button key={c.name} type="button" onClick={() => setCategory(c.name)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-full border text-sm transition ${
                          active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"
                        }`}>
                        <Icon className="size-4" />{c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="desc">Description</Label>
                  <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Coffee, Lunch…" />
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>

              {type === "expense" && (
                <div>
                  <Label>Payment method</Label>
                  <Select value={payment} onValueChange={setPayment}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-background flex gap-2 shrink-0">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button className="flex-1" size="lg" onClick={save} disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />} Save Transaction
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
