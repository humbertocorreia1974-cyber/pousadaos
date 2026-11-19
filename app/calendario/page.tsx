import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BloqueioForm } from './bloqueio-form';
import { BloqueioAcoes } from './bloqueio-acoes';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Calendário de Ocupação — PousadaOS',
  description: 'Grade de ocupação por quarto e bloqueio de manutenção.',
  openGraph: { title: 'Calendário de Ocupação — PousadaOS', description: 'Ocupação por quarto e bloqueios.' },
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}
function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: { unidadeId?: string; mes?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const role = (session.user as any).role as string;
  if (!['recepcao', 'gerente', 'admin_rede'].includes(role)) redirect('/');

  const unidades = await prisma.unidade.findMany({ where: { ativa: true }, orderBy: { nome: 'asc' } });
  const unidadeId = searchParams.unidadeId || (session.user as any).unidadeId || unidades[0]?.id;

  const base = searchParams.mes ? new Date(`${searchParams.mes}-01T00:00:00`) : new Date();
  const inicio = startOfMonth(base);
  const fim = endOfMonth(base);

  const quartos = unidadeId
    ? await prisma.quarto.findMany({
        where: { unidadeId, ativo: true },
        include: { tipoDeQuarto: true },
        orderBy: [{ andar: 'asc' }, { numero: 'asc' }],
      })
    : [];

  const reservas = unidadeId
    ? await prisma.reserva.findMany({
        where: {
          unidadeId,
          status: { in: ['pre_reserva', 'confirmada', 'checkin'] },
          dataCheckin: { lte: fim },
          dataCheckout: { gte: inicio },
        },
        include: { hospede: { select: { nomeCompleto: true } } },
      })
    : [];

  const bloqueios = unidadeId
    ? await prisma.bloqueioManutencao.findMany({
        where: {
          unidadeId,
          ativo: true,
          dataInicio: { lte: fim },
          dataFim: { gte: inicio },
        },
      })
    : [];

  const dias: Date[] = [];
  for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
    dias.push(new Date(d));
  }

  function statusDia(quartoId: string, dia: Date) {
    const t = dia.getTime();
    const r = reservas.find(
      (x) =>
        x.quartoId === quartoId &&
        new Date(x.dataCheckin).getTime() <= t &&
        new Date(x.dataCheckout).getTime() > t,
    );
    if (r) return { tipo: 'reserva' as const, label: r.hospede.nomeCompleto, status: r.status };
    const b = bloqueios.find(
      (x) =>
        x.quartoId === quartoId &&
        new Date(x.dataInicio).getTime() <= t &&
        new Date(x.dataFim).getTime() >= t,
    );
    if (b) return { tipo: 'bloqueio' as const, label: b.motivo, status: 'manutencao' };
    return null;
  }

  const mesLabel = inicio.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const mesInput = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Calendário de Ocupação</h1>
          <p className="mt-1 text-sm text-fg-muted capitalize">{mesLabel}</p>
        </div>
        <form className="flex items-center gap-2">
          <select
            name="unidadeId"
            defaultValue={unidadeId}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg"
          >
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>{u.nome}</option>
            ))}
          </select>
          <input
            type="month"
            name="mes"
            defaultValue={mesInput}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg"
          />
          <Button type="submit" variant="secondary" size="sm">Ver</Button>
        </form>
      </header>

      {quartos.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-fg-muted">Nenhum quarto cadastrado nesta unidade.</p>
            <Link href="/unidades" className="mt-3 inline-block">
              <Button size="sm">Cadastrar quartos</Button>
            </Link>
          </CardBody>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <CardBody>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-surface px-2 py-2 text-left text-fg-muted">Quarto</th>
                  {dias.map((d) => (
                    <th key={d.toISOString()} className="min-w-[28px] px-1 py-2 text-center text-fg-muted">
                      {d.getDate()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {quartos.map((q) => (
                  <tr key={q.id} className="border-t border-border">
                    <td className="sticky left-0 z-10 bg-surface px-2 py-2 text-fg">
                      <span className="font-medium">{q.numero}</span>
                      <span className="ml-1 text-[10px] text-fg-muted">{q.tipoDeQuarto.nome}</span>
                    </td>
                    {dias.map((d) => {
                      const s = statusDia(q.id, d);
                      const cls = !s
                        ? 'bg-surface'
                        : s.tipo === 'bloqueio'
                        ? 'bg-rose-500/20'
                        : s.status === 'checkin'
                        ? 'bg-emerald-500/30'
                        : s.status === 'confirmada'
                        ? 'bg-sky-500/25'
                        : 'bg-amber-500/25';
                      return (
                        <td
                          key={d.toISOString()}
                          title={s ? `${s.label} (${s.status})` : 'Livre'}
                          className={`h-7 border-l border-border ${cls}`}
                        />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-fg-muted">
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-amber-500/40" /> Pré-reserva</span>
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-sky-500/40" /> Confirmada</span>
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-emerald-500/40" /> Check-in</span>
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-rose-500/40" /> Manutenção</span>
            </div>
          </CardBody>
        </Card>
      )}

      <section className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Bloqueios ativos no mês</CardTitle>
          <CardBody>
            {bloqueios.length === 0 ? (
              <p className="text-sm text-fg-muted">Nenhum bloqueio de manutenção no período.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-fg-muted">
                  <tr>
                    <th className="pb-2">Quarto</th>
                    <th className="pb-2">Motivo</th>
                    <th className="pb-2">Período</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bloqueios.map((b) => {
                    const q = quartos.find((x) => x.id === b.quartoId);
                    return (
                      <tr key={b.id}>
                        <td className="py-2 text-fg">{q?.numero || '—'}</td>
                        <td className="py-2 text-fg-muted">{b.motivo}</td>
                        <td className="py-2 text-fg-muted">
                          {fmt(new Date(b.dataInicio))} → {fmt(new Date(b.dataFim))}
                        </td>
                        <td className="py-2 text-right">
                          <BloqueioAcoes bloqueioId={b.id} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
        <BloqueioForm unidadeId={unidadeId} quartos={quartos.map((q) => ({ id: q.id, numero: q.numero }))} />
      </section>
    </div>
  );
}
