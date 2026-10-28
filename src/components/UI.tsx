import { type ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-cream-200/80 border border-cream-300 text-butter-700 flex items-center justify-center mb-3.5 shadow-warm-xs">
          {icon}
        </div>
      )}
      <p className="text-charcoal-900 font-bold text-base">{title}</p>
      {description && <p className="text-sm text-charcoal-500 mt-1.5 max-w-sm leading-relaxed">{description}</p>}
    </div>
  );
}

export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-butter-500 animate-spin" />
        {label && <p className="text-sm text-charcoal-700 font-medium">{label}</p>}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold text-charcoal-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-charcoal-500 mt-1 leading-relaxed">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Badge({ children, color = "slate" }: { children: ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    butter: "bg-butter-100 text-butter-900 border border-butter-300/80",
    cream: "bg-cream-200 text-charcoal-800 border border-cream-400/70",
    ivory: "bg-ivory-200 text-charcoal-800 border border-ivory-400",
    sage: "bg-sage-100 text-sage-900 border border-sage-300",
    terracotta: "bg-terracotta-50 text-terracotta-700 border border-terracotta-200",
    slate: "bg-charcoal-100 text-charcoal-700 border border-charcoal-200",
    // Compatibility aliases:
    forest: "bg-sage-100 text-sage-900 border border-sage-300",
    gold: "bg-butter-100 text-butter-900 border border-butter-300/80",
    blue: "bg-cream-200 text-butter-900 border border-cream-400",
    green: "bg-sage-100 text-sage-900 border border-sage-300",
    amber: "bg-butter-100 text-butter-900 border border-butter-300/80",
    red: "bg-terracotta-50 text-terracotta-700 border border-terracotta-200",
    violet: "bg-cream-100 text-charcoal-800 border border-cream-300",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[color] || colors.slate}`}>
      {children}
    </span>
  );
}
