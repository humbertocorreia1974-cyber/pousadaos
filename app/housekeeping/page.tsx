import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusQuartoClient } from './status-quarto-client';
import { EscalaForm } from './escala-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Housekeeping — PousadaOS',
  description: 'Painel de status por quarto e escala de camareiras em tempo real.',
  openGraph: { title: 'Housekeeping — PousadaOS', description: 'Status por quarto e escala de camareiras.' },
};

const STATUS_LABEL: Record<string, string> = {
  limpo: 'Limpo',
  sujo: 'Sujo',
  em_limpeza: 'Em limpeza',
  inspecao: 'Inspeção',
  manutencao: 'Manutenção',
};

export default async function HousekeepingPage({ searchParams }: { searchParams: { unidadeId?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const role = (session.user as any).role as string;
  if (!['camareira', 'recepcao', 'gerente', 'admin_rede'].includes(role)) redirect('/');

  const unidades = await prisma.unidade.findMany({ where: { ativa: true }, orderBy: { nome: 'asc' } });
  const unidadeId = searchParams.unidadeId || (session.user as any).unidadeId || unidades[0]?.id;

  const quartos = unidadeId
    ? await prisma.quarto.findMany({
        where: { unidadeId, ativo: true },
        include: {
          tipoDeQuarto: true,
          statusHousekeeping: { orderBy: { atualizadoEm: 'desc' }, take: 1 },
        },
        orderBy: [{ andar: 'asc' }, { numero: 'asc' }],
      })
    : [];

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  const escalas = unidadeId
    ? await prisma.escalaCamareira.findMany({
        where: { unidadeId, data: { gte: hoje, lt: amanha } },
        include: { camareira: { select: { id: true, name: true, email: true } } },
        orderBy: { turno: 'asc' },
      })
    : [];

  const camareiras = await prisma.user.findMany({
    where: { role: 'camareira' },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });

  const contagem = quartos.reduce<Record<string, number>>((acc, q) => {
    const s = q.statusHousekeeping[0]?.status || 'limpo';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Housekeeping</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Status por quarto e escala de camareiras — atualizado em tempo real.
          </p>
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
          <Button type="submit" variant="secondary" size="sm">Filtrar</Button>
        </form>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Object.entries(STATUS_LABEL).map(([key, label]) => (
          <Card key={key}>
            <CardBody>
              <p className="text-xs uppercase tracking-wide text-fg-muted">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-fg">{contagem[key] || 0}</p>
            </CardBody>
          </Card>
        ))}
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-muted">Quartos</h2>
        {quartos.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-sm text-fg-muted">
                Nenhum quarto cadastrado nesta unidade. Cadastre quartos para começar o housekeeping.
              </p>
              <Link href="/unidades" className="mt-3 inline-block">
                <Button size="sm">Cadastrar quartos</Button>
              </Link>
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quartos.map((q) => (
              <StatusQuartoClient
                key={q.id}
                quartoId={q.id}
                numero={q.numero}
                tipo={q.tipoDeQuarto.nome}
                andar={q.andar}
                statusAtual={q.statusHousekeeping[0]?.status || 'limpo'}
                atualizadoEm={q.statusHousekeeping[0]?.atualizadoEm?.toISOString() || null}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-muted">Escala de hoje</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardTitle>Camareiras escaladas</CardTitle>
            <CardBody>
              {escalas.length === 0 ? (
                <p className="text-sm text-fg-muted">Nenhuma escala definida para hoje.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-fg-muted">
                    <tr>
                      <th className="pb-2">Camareira</th>
                      <th className="pb-2">Turno</th>
                      <th className="pb-2">Quartos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {escalas.map((e) => {
                      const qs = Array.isArray(e.quartosAtribuidos) ? (e.quartosAtribuidos as string[]) : [];
                      return (
                        <tr key={e.id}>
                          <td className="py-2 text-fg">{e.camareira.name}</td>
                          <td className="py-2 text-fg-muted capitalize">{e.turno}</td>
                          <td className="py-2 text-fg-muted">{qs.length} quartos</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
          <EscalaForm unidadeId={unidadeId} camareiras={camareiras} quartos={quartos.map((q) => ({ id: q.id, numero: q.numero }))} />
        </div>
      </section>
    </div>
  );
}
