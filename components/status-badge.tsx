import { STATUS_RESERVA_COR, STATUS_RESERVA_LABEL } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_RESERVA_COR[status] ?? "bg-zinc-500/10 text-fg-muted border-border";
  const label = STATUS_RESERVA_LABEL[status] ?? status;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "brand" | "success" | "warn" | "danger" }) {
  const tones: Record<string, string> = {
    neutral: "bg-zinc-500/10 text-fg-muted border-border",
    brand: "bg-brand/10 text-brand border-brand/30",
    success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    warn: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    danger: "bg-red-500/10 text-red-600 border-red-500/30",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
