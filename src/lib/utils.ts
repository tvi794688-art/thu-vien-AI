export function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
}

export function daysBetween(start: string, end: string): number {
  const d1 = new Date(start);
  const d2 = new Date(end);
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export function getDaysOverdue(dueDate: string): number {
  if (!dueDate) return 0;

  const [year, month, day] = dueDate.split("-").map(Number);

  const due = Date.UTC(year, month - 1, day);

  const now = new Date();
  const today = Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const diff = Math.floor(
    (today - due) / (1000 * 60 * 60 * 24)
  );

  return Math.max(0, diff);
}

export function isOverdue(dueDate: string): boolean {
  return getDaysOverdue(dueDate) > 0;
}

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = [
    headers.join(","),
    ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export const COVER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  green: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  rose: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  violet: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  cyan: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  orange: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  slate: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
};

export function getCoverColor(color: string) {
  return COVER_COLORS[color] || COVER_COLORS.blue;
}
