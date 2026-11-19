export function brl(v: number | string | { toString(): string } | null | undefined): string {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function dataBR(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("pt-BR");
}

export function dataHoraBR(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const STATUS_RESERVA_LABEL: Record<string, string> = {
  pre_reserva: "Pré-reserva",
  confirmada: "Confirmada",
  checkin: "Hospedado",
  checkout: "Check-out",
  cancelada: "Cancelada",
  no_show: "No-show",
};

export const STATUS_RESERVA_COR: Record<string, string> = {
  pre_reserva: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  confirmada: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  checkin: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  checkout: "bg-zinc-500/10 text-fg-muted border-border",
  cancelada: "bg-red-500/10 text-red-600 border-red-500/30",
  no_show: "bg-red-500/10 text-red-600 border-red-500/30",
};

export const CANAIS = ["site", "balcao", "ota", "telefone", "whatsapp", "indicacao"] as const;
