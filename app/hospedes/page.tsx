import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardBody, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Hóspedes | PousadaOS',
  description: 'Histórico, preferências e últimas estadias dos hóspedes da rede.',
  openGraph: {
    title: 'Hóspedes | PousadaOS',
    description: 'CRM hoteleiro: histórico e preferências.',
  },
};

export default async function Page({ searchParams }: { searchParams: { q?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?next=/hospedes');
  if (!['recepcao', 'gerente', 'admin_rede'].includes(session.user.role)) redirect('/');

  const q = (searchParams.q ?? '').trim();
  const hospedes = await prisma.hospede.findMany({
    where: q
      ? {
          OR: [
            { nomeCompleto: { contains: q, mode: 'insensitive' } },
            { cpf: { contains: q } },
            { email: { contains: q, mode: 'insensitive' } },
            { telefone: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { updatedAt: 'desc' },
    take: 50,
    include: {
      _count: { select: { reservas: true } },
      reservas: {
        orderBy: { dataCheckin: 'desc' },
        take: 1,
        select: { dataCheckin: true, dataCheckout: true, valorTotal: true, status: true },
      },
    },
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-fg-muted">CRM</p>
          <h1 className="mt-1 text-3xl font-semibold text-fg">Hóspedes</h1>
          <p className="mt-1 text-sm text-fg-muted">Histórico, preferências e oportunidades de upsell.</p>
        </div>
        <form className="flex items-center gap-2">
          <Input name="q" defaultValue={q} placeholder="Nome, CPF, e-mail ou telefone" />
          <Button type="submit" variant="secondary" size="sm">Buscar</Button>
        </form>
      </header>

      {hospedes.length === 0 ? (
        <Card>
          <CardBody className="space-y-3">
            <CardTitle>Nenhum hóspede encontrado</CardTitle>
            <p className="text-sm text-fg-muted">
              {q ? 'Ajuste a busca ou cadastre um novo hóspede pela recepção.' : 'Cadastre o primeiro hóspede pela tela de reservas.'}
            </p>
            <Link href="/reservas"><Button size="sm">Ir para reservas</Button></Link>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                  <th className="py-2">Hóspede</th>
                  <th className="py-2">Contato</th>
                  <th className="py-2">Reservas</th>
                  <th className="py-2">Última estadia</th>
                  <th className="py-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {hospedes.map((h) => {
                  const ultima = h.reservas[0];
                  return (
                    <tr key={h.id} className="border-b border-border/60">
                      <td className="py-3">
                        <p className="font-medium text-fg">{h.nomeCompleto}</p>
                        {h.cpf && <p className="text-xs text-fg-muted">CPF {h.cpf}</p>}
                      </td>
                      <td className="py-3 text-fg-muted">
                        {h.email && <p>{h.email}</p>}
                        {h.telefone && <p className="text-xs">{h.telefone}</p>}
                      </td>
                      <td className="py-3 text-fg">{h._count.reservas}</td>
                      <td className="py-3 text-fg-muted">
                        {ultima
                          ? `${new Date(ultima.dataCheckin).toLocaleDateString('pt-BR')} → ${new Date(ultima.dataCheckout).toLocaleDateString('pt-BR')}`
                          : '—'}
                      </td>
                      <td className="py-3 text-right">
                        <Link href={`/hospedes/${h.id}`} className="text-brand hover:underline">Ver histórico</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </main>
  );
}
