"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Props = { reservaId: string; status: string; role: string };

export function ReservaAcoesClient({ reservaId, status, role }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  async function acao(path: string, body?: Record<string, unknown>) {
    setErro(null);
    try {
      const res = await fetch(`/api/reservas/${reservaId}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Falha na operação");
      start(() => router.refresh());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro");
    }
  }

  const podeConfirmar = status === "pre_reserva";
  const podeCheckin = status === "confirmada";
  const podeCheckout = status === "checkin";
  const podeNoShow = status === "confirmada" || status === "pre_reserva";
  const podeCancelar =
    status === "pre_reserva" || status === "confirmada";
  const podeFolio = status === "checkin" || status === "checkout";

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {podeConfirmar && (
        <Button size="sm" variant="primary" disabled={pending} onClick={() => acao("confirmar")}>
          Confirmar
        </Button>
      )}
      {podeCheckin && (
        <Link href={`/reservas/${reservaId}/checkin`}>
          <Button size="sm" variant="primary">
            Check-in
          </Button>
        </Link>
      )}
      {podeCheckout && (
        <Link href={`/reservas/${reservaId}/checkout`}>
          <Button size="sm" variant="primary">
            Check-out
          </Button>
        </Link>
      )}
      {podeFolio && (
        <Link href={`/reservas/${reservaId}/folio`}>
          <Button size="sm" variant="secondary">
            Folio
          </Button>
        </Link>
      )}
      {podeNoShow && role !== "recepcao" && (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => acao("no-show")}
        >
          No-show
        </Button>
      )}
      {podeCancelar && (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            const motivo = window.prompt("Motivo do cancelamento:");
            if (motivo) acao("cancelar", { motivo });
          }}
        >
          Cancelar
        </Button>
      )}
      {erro && <span className="text-xs text-red-600">{erro}</span>}
    </div>
  );
}
