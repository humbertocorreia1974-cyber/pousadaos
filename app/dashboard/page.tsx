import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard Gerencial | PousadaOS',
  description: 'Ocupação, ADR, RevPAR, receita por canal e no-show em tempo real.',
  openGraph: {
    title: 'Dashboard Gerencial | PousadaOS',
    description: 'KPIs hoteleiros em tempo real: ocupação, ADR, RevPAR, canal e no-show.',
  },
};

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const role = (session.user as any).role as string | undefined;
  if (!role || !['gerente', 'admin_rede', 'recepcao'].includes(role)) redirect('/');

  const unidadeId = (session.user as any).unidadeId as string | undefined;

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);

  const whereUnidade = unidadeId ? { unidadeId } : {};

  const [totalQuartos, reservasMes, noShows, canceladas] = await Promise.all([
    prisma.quarto.count({ where: { ...whereUnidade, ativo: true } }),
    prisma.reserva.findMany({
      where: {
        ...whereUnidade,
        dataCheckin: { gte: inicioMes, lte: fimMes },
        status: { in: ['confirmada', 'checkin', 'checkout'] },
      },
      select: {
        noites: true,
        valorTotal: true,
        canalOrigem: true,
        status: true,
      },
    }),
    prisma.reserva.count({
      where: { ...whereUnidade, status: 'no_show', dataCheckin: { gte: inicioMes, lte: fimMes } },
    }),
    prisma.reserva.count({
      where: { ...whereUnidade, status: 'cancelada', dataCheckin: { gte: inicioMes, lte: fimMes } },
    }),
  ]);

  const diasNoMes = fimMes.getDate();
  const quartoNoitesDisponiveis = totalQuartos * diasNoMes;
  const quartoNoitesVendidas = reservasMes.reduce((s, r) => s + r.noites, 0);
  const receitaTotal = reservasMes.reduce((s, r) => s + Number(r.valorTotal), 0);
  const ocupacao = quartoNoitesDisponiveis > 0 ? (quartoNoitesVendidas / quartoNoitesDisponiveis) * 100 : 0;
  const adr = quartoNoitesVendidas > 0 ? receitaTotal / quartoNoitesVendidas : 0;
  const revpar = quartoNoitesDisponiveis > 0 ? receitaTotal / quartoNoitesDisponiveis : 0;

  const porCanal = new Map<string, { receita: number; reservas: number }>();
  for (const r of reservasMes) {
    const c = porCanal.get(r.canalOrigem) ?? { receita: 0, reservas: 0 };
    c.receita += Number(r.valorTotal);
    c.reservas += 1;
    porCanal.set(r.canalOrigem, c);
  }
  const canais = Array.from(porCanal.entries()).sort((a, b) => b[1].receita - a[1].receita);

  const kpis = [
    { label: 'Ocupação', value: `${ocupacao.toFixed(1)}%`, hint: `${quartoNoitesVendidas} de ${quartoNoitesDisponiveis} quarto-noites` },
    { label: 'ADR', value: fmtBRL(adr), hint: 'Diária média' },
    { label: 'RevPAR', value: fmtBRL(revpar), hint: 'Receita por quarto disponível' },
    { label: 'Receita do mês', value: fmtBRL(receitaTotal), hint: `${reservasMes.length} reservas` },
    { label: 'No-show', value: String(noShows), hint: 'Reservas não comparecidas' },
    { label: 'Canceladas', value: String(canceladas), hint: 'No período' },
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Dashboard Gerencial</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Indicadores de {inicioMes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/auditoria"><Button variant="secondary" size="sm">Auditoria</Button></Link>
          <Link href="/disponibilidade"><Button size="sm">Disponibilidade</Button></Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardBody>
              <p className="text-xs uppercase tracking-wide text-fg-muted">{k.label}</p>
              <p className="mt-2 text-2xl font-semibold text-fg">{k.value}</p>
              <p className="mt-1 text-xs text-fg-muted">{k.hint}</p>
            </CardBody>
          </Card>
        ))}
      </section>

      <section className="mt-8">
        <Card>
          <CardBody>
            <CardTitle>Receita por canal de origem</CardTitle>
            {canais.length === 0 ? (
              <div className="mt-4 rounded-md border border-border bg-surface/50 p-6 text-center">
                <p className="text-sm text-fg-muted">Nenhuma reserva registrada neste mês.</p>
                <Link href="/reservas/nova" className="mt-3 inline-block">
                  <Button size="sm">Criar primeira reserva</Button>
                </Link>
              </div>
            ) : (
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                    <th className="py-2">Canal</th>
                    <th className="py-2 text-right">Reservas</th>
                    <th className="py-2 text-right">Receita</th>
                    <th className="py-2 text-right">% do total</th>
                  </tr>
                </thead>
                <tbody>
                  {canais.map(([canal, v]) => (
                    <tr key={canal} className="border-b border-border/60 transition-colors duration-150 hover:bg-white/5">
                      <td className="py-2 capitalize text-fg">{canal.replace('_', ' ')}</td>
                      <td className="py-2 text-right text-fg-muted">{v.reservas}</td>
                      <td className="py-2 text-right text-fg">{fmtBRL(v.receita)}</td>
                      <td className="py-2 text-right text-fg-muted">
                        {receitaTotal > 0 ? ((v.receita / receitaTotal) * 100).toFixed(1) : '0.0'}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </section>
    </main>
  );
}
