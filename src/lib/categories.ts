import {
  Utensils, ShoppingCart, Car, Lightbulb, Film, HeartPulse, ShoppingBag,
  Home, Plane, GraduationCap, Coffee, Wallet, Briefcase, TrendingUp, Gift,
  type LucideIcon,
} from "lucide-react";

export type CategoryMeta = {
  name: string;
  icon: LucideIcon;
  color: string; // tailwind class on bg
  ring: string; // for icon bg
  type: "expense" | "income" | "both";
};

export const EXPENSE_CATEGORIES: CategoryMeta[] = [
  { name: "Dining", icon: Utensils, color: "text-orange-600", ring: "bg-orange-100 dark:bg-orange-900/30", type: "expense" },
  { name: "Groceries", icon: ShoppingCart, color: "text-emerald-600", ring: "bg-emerald-100 dark:bg-emerald-900/30", type: "expense" },
  { name: "Transport", icon: Car, color: "text-sky-600", ring: "bg-sky-100 dark:bg-sky-900/30", type: "expense" },
  { name: "Utilities", icon: Lightbulb, color: "text-amber-600", ring: "bg-amber-100 dark:bg-amber-900/30", type: "expense" },
  { name: "Entertainment", icon: Film, color: "text-fuchsia-600", ring: "bg-fuchsia-100 dark:bg-fuchsia-900/30", type: "expense" },
  { name: "Healthcare", icon: HeartPulse, color: "text-rose-600", ring: "bg-rose-100 dark:bg-rose-900/30", type: "expense" },
  { name: "Shopping", icon: ShoppingBag, color: "text-violet-600", ring: "bg-violet-100 dark:bg-violet-900/30", type: "expense" },
  { name: "Housing", icon: Home, color: "text-indigo-600", ring: "bg-indigo-100 dark:bg-indigo-900/30", type: "expense" },
  { name: "Travel", icon: Plane, color: "text-cyan-600", ring: "bg-cyan-100 dark:bg-cyan-900/30", type: "expense" },
  { name: "Education", icon: GraduationCap, color: "text-blue-600", ring: "bg-blue-100 dark:bg-blue-900/30", type: "expense" },
  { name: "Coffee", icon: Coffee, color: "text-yellow-700", ring: "bg-yellow-100 dark:bg-yellow-900/30", type: "expense" },
  { name: "Other", icon: Wallet, color: "text-slate-600", ring: "bg-slate-100 dark:bg-slate-800", type: "expense" },
];

export const INCOME_CATEGORIES: CategoryMeta[] = [
  { name: "Salary", icon: Briefcase, color: "text-emerald-600", ring: "bg-emerald-100 dark:bg-emerald-900/30", type: "income" },
  { name: "Freelance", icon: Wallet, color: "text-sky-600", ring: "bg-sky-100 dark:bg-sky-900/30", type: "income" },
  { name: "Investment", icon: TrendingUp, color: "text-violet-600", ring: "bg-violet-100 dark:bg-violet-900/30", type: "income" },
  { name: "Gift", icon: Gift, color: "text-rose-600", ring: "bg-rose-100 dark:bg-rose-900/30", type: "income" },
  { name: "Other Income", icon: Wallet, color: "text-slate-600", ring: "bg-slate-100 dark:bg-slate-800", type: "income" },
];

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export function getCategoryMeta(name: string): CategoryMeta {
  return (
    ALL_CATEGORIES.find((c) => c.name.toLowerCase() === name.toLowerCase()) ?? {
      name,
      icon: Wallet,
      color: "text-slate-600",
      ring: "bg-slate-100 dark:bg-slate-800",
      type: "expense",
    }
  );
}

export const PAYMENT_METHODS = ["Card", "Cash", "Apple Pay", "Google Pay", "Bank Transfer", "Other"];
