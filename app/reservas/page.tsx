import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReservaAcoesClient } from "./reserva-acoes-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ciclo de vida das reservas | PousadaOS",
  description:
    "Acompanhe pré-reservas, confirmações, check-in, check-out, no-show e cancelamentos em tempo real.",
  openGraph: {
    title: "Ciclo de vida das reservas | PousadaOS",
    description:
      "Pré-reserva → confirmada → check-in → check-out / no-show / cancelada, tudo auditado.",
  },
};

const STATUS_LABEL: Record<string, string> = {
  pre_reserva: "Pré-reserva",
  confirmada: "Confirmada",
  checkin: "Check-in",
  checkout: "Check-out",
  no_show: "No-show",
  cancelada: "Cancelada",
};

const STATUS_TONE: Record<string, string> = {
  pre_reserva: "bg-amber-500/10 text-amber-600",
  confirmada: "bg-brand/10 text-brand",
  checkin: "bg-emerald-500/10 text-emerald-600",
  checkout: "bg-fg-muted/10 text-fg-muted",
  no_show: "bg-red-500/10 text-red-600",
  cancelada: "bg-red-500/10 text-red-600",
};

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("pt-BR");
}

export default async function ReservasPage({
  searchParams,
}: {
  searchParams: { status?: string; unidadeId?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as { role?: string }).role ?? "user";
  if (!["recepcao", "gerente", "admin_rede"].includes(role)) redirect("/");

  const where: Record<string, unknown> = {};
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.unidadeId) where.unidadeId = searchParams.unidadeId;

  const [reservas, unidades] = await Promise.all([
    prisma.reserva.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        hospede: { select: { nomeCompleto: true, telefone: true } },
        unidade: { select: { nome: true } },
        quarto: { select: { numero: true } },
        tipoDeQuarto: { select: { nome: true } },
      },
    }),
    prisma.unidade.findMany({ select: { id: true, nome: true } }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Ciclo de vida das reservas
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Pré-reserva → confirmada → check-in → check-out / no-show / cancelada.
          </p>
        </div>
        <Link href="/disponibilidade">
          <Button variant="primary" size="md">
            Nova reserva
          </Button>
        </Link>
      </header>

      <form className="mb-6 flex flex-wrap items-center gap-3" method="get">
        <select
          name="status"
          defaultValue={searchParams.status ?? ""}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          name="unidadeId"
          defaultValue={searchParams.unidadeId ?? ""}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg"
        >
          <option value="">Todas as unidades</option>
          {unidades.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary" size="sm">
          Filtrar
        </Button>
      </form>

      {reservas.length === 0 ? (
        <Card>
          <CardBody>
            <CardTitle>Nenhuma reserva encontrada</CardTitle>
            <p className="mt-2 text-sm text-fg-muted">
              Ajuste os filtros ou crie uma nova reserva no motor de disponibilidade.
            </p>
            <Link href="/disponibilidade" className="mt-4 inline-block">
              <Button variant="primary" size="sm">
                Ir para disponibilidade
              </Button>
            </Link>
          </CardBody>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface/70 text-left text-xs uppercase tracking-wide text-fg-muted">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Hóspede</th>
                <th className="px-4 py-3">Unidade / Quarto</th>
                <th className="px-4 py-3">Período</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reservas.map((r) => (
                <tr key={r.id} className="transition-colors duration-150 hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-xs text-fg">{r.codigo}</td>
                  <td className="px-4 py-3">
                    <div className="text-fg">{r.hospede.nomeCompleto}</div>
                    <div className="text-xs text-fg-muted">{r.hospede.telefone ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-fg">{r.unidade.nome}</div>
                    <div className="text-xs text-fg-muted">
                      {r.quarto?.numero ?? "—"} · {r.tipoDeQuarto.nome}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-fg-muted">
                    {fmt(r.dataCheckin)} → {fmt(r.dataCheckout)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        STATUS_TONE[r.status] ?? "bg-fg-muted/10 text-fg-muted"
                      }`}
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-fg">
                    R$ {Number(r.valorTotal).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ReservaAcoesClient
                      reservaId={r.id}
                      status={r.status}
                      role={role}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
