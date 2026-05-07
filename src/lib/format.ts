export const fmtMoney = (n: number, opts: { signed?: boolean } = {}) => {
  const abs = Math.abs(n).toLocaleString("en-US", { style: "currency", currency: "USD" });
  if (!opts.signed) return abs;
  if (n > 0) return `+${abs}`;
  if (n < 0) return `-${abs}`;
  return abs;
};

export const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const fmtMonth = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-US", { month: "long", year: "numeric" });

export const monthStart = (d = new Date()) => {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  return x.toISOString().slice(0, 10);
};

export const monthEnd = (d = new Date()) => {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return x.toISOString().slice(0, 10);
};
