import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }) {
  const h = await prisma.hospede.findUnique({ where: { id: params.id }, select: { nomeCompleto: true } });
  return {
    title: h ? `${h.nomeCompleto} | Hóspede | PousadaOS` : 'Hóspede | PousadaOS',
    description: 'Histórico de estadias, preferências e oportunidades de upsell.',
    openGraph: {
      title: h ? `${h.nomeCompleto} | PousadaOS` : 'Hóspede | PousadaOS',
      description: 'Histórico de estadias, preferências e oportunidades de upsell.',
    },
  };
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default async function HospedePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const role = (session.user as any).role as string | undefined;
  if (!role || !['gerente', 'admin_rede', 'recepcao'].includes(role)) redirect('/');

  const hospede = await prisma.hospede.findUnique({
    where: { id: params.id },
    include: {
      reservas: {
        orderBy: { dataCheckin: 'desc' },
        take: 20,
        include: { unidade: { select: { nome: true } }, tipoDeQuarto: { select: { nome: true } } },
      },
      historicos: { orderBy: { dataEvento: 'desc' }, take: 20 },
    },
  });

  if (!hospede) notFound();

  const totalGasto = hospede.reservas.reduce((s, r) => s + Number(r.valorTotal), 0);
  const totalNoites = hospede.reservas.reduce((s, r) => s + r.noites, 0);
  const ultima = hospede.reservas[0];
  const prefs = (hospede.preferencias as Record<string, unknown> | null) ?? {};

  const upsell: string[] = [];
  if (totalNoites >= 5) upsell.push('Oferecer upgrade para suíte na próxima estadia (fidelidade).');
  if (totalGasto > 2000) upsell.push('Convidar para pacote de passeios com desconto de retorno.');
  if (Object.keys(prefs).length === 0) upsell.push('Coletar preferências (andar, travesseiro, café) no próximo check-in.');

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-fg-muted">Hóspede</p>
          <h1 className="text-2xl font-semibold text-fg">{hospede.nomeCompleto}</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {hospede.email ?? 'sem e-mail'} · {hospede.telefone ?? 'sem telefone'} · CPF {hospede.cpf ?? '—'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/hospedes"><Button variant="secondary" size="sm">Voltar</Button></Link>
          <Link href={`/reservas/nova?hospedeId=${hospede.id}`}><Button size="sm">Nova reserva</Button></Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card><CardBody><p className="text-xs uppercase text-fg-muted">Estadias</p><p className="mt-2 text-2xl font-semibold text-fg">{hospede.reservas.length}</p></CardBody></Card>
        <Card><CardBody><p className="text-xs uppercase text-fg-muted">Noites</p><p className="mt-2 text-2xl font-semibold text-fg">{totalNoites}</p></CardBody></Card>
        <Card><CardBody><p className="text-xs uppercase text-fg-muted">Total gasto</p><p className="mt-2 text-2xl font-semibold text-fg">{fmtBRL(totalGasto)}</p></CardBody></Card>
        <Card><CardBody><p className="text-xs uppercase text-fg-muted">Última visita</p><p className="mt-2 text-sm text-fg">{ultima ? new Date(ultima.dataCheckin).toLocaleDateString('pt-BR') : '—'}</p></CardBody></Card>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardBody>
            <CardTitle>Preferências</CardTitle>
            {Object.keys(prefs).length === 0 ? (
              <p className="mt-3 text-sm text-fg-muted">Nenhuma preferência registrada ainda.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {Object.entries(prefs).map(([k, v]) => (
                  <li key={k} className="flex justify-between border-b border-border/60 py-1">
                    <span className="text-fg-muted capitalize">{k}</span>
                    <span className="text-fg">{String(v)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <CardTitle>Oportunidades de upsell</CardTitle>
            {upsell.length === 0 ? (
              <p className="mt-3 text-sm text-fg-muted">Sem sugestões no momento.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm text-fg">
                {upsell.map((u) => (
                  <li key={u} className="rounded-md border border-border bg-surface/50 px-3 py-2">{u}</li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </section>

      <section className="mt-8">
        <Card>
          <CardBody>
            <CardTitle>Últimas estadias</CardTitle>
            {hospede.reservas.length === 0 ? (
              <div className="mt-4 rounded-md border border-border bg-surface/50 p-6 text-center">
                <p className="text-sm text-fg-muted">Este hóspede ainda não possui reservas.</p>
                <Link href={`/reservas/nova?hospedeId=${hospede.id}`} className="mt-3 inline-block">
                  <Button size="sm">Criar reserva</Button>
                </Link>
              </div>
            ) : (
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                    <th className="py-2">Código</th>
                    <th className="py-2">Unidade</th>
                    <th className="py-2">Quarto</th>
                    <th className="py-2">Check-in</th>
                    <th className="py-2">Check-out</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {hospede.reservas.map((r) => (
                    <tr key={r.id} className="border-b border-border/60 transition-colors duration-150 hover:bg-white/5">
                      <td className="py-2"><Link className="text-brand hover:underline" href={`/reservas/${r.id}`}>{r.codigo}</Link></td>
                      <td className="py-2 text-fg-muted">{r.unidade.nome}</td>
                      <td className="py-2 text-fg-muted">{r.tipoDeQuarto.nome}</td>
                      <td className="py-2 text-fg-muted">{new Date(r.dataCheckin).toLocaleDateString('pt-BR')}</td>
                      <td className="py-2 text-fg-muted">{new Date(r.dataCheckout).toLocaleDateString('pt-BR')}</td>
                      <td className="py-2"><span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand">{r.status}</span></td>
                      <td className="py-2 text-right text-fg">{fmtBRL(Number(r.valorTotal))}</td>
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
