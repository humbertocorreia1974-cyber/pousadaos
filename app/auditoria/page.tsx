import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Auditoria | PousadaOS',
  description: 'Trilha completa de check-in, check-out e ações sensíveis por usuário e reserva.',
  openGraph: {
    title: 'Auditoria | PousadaOS',
    description: 'Trilha completa de check-in, check-out e ações sensíveis.',
  },
};

const ACOES = ['checkin', 'checkout', 'no_show', 'cancelamento', 'estorno', 'fechamento_folio', 'alteracao_tarifa'];

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: { acao?: string; usuarioId?: string; reservaId?: string; de?: string; ate?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const role = (session.user as any).role as string | undefined;
  if (!role || !['gerente', 'admin_rede'].includes(role)) redirect('/');

  const where: any = {};
  if (searchParams.acao) where.acao = searchParams.acao;
  if (searchParams.usuarioId) where.usuarioId = searchParams.usuarioId;
  if (searchParams.reservaId) where.reservaId = searchParams.reservaId;
  if (searchParams.de || searchParams.ate) {
    where.createdAt = {};
    if (searchParams.de) where.createdAt.gte = new Date(searchParams.de);
    if (searchParams.ate) where.createdAt.lte = new Date(searchParams.ate + 'T23:59:59');
  }

  const [registros, usuarios] = await Promise.all([
    prisma.auditoriaCheckInOut.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        usuario: { select: { name: true, email: true, role: true } },
        reserva: { select: { codigo: true, status: true } },
      },
    }),
    prisma.user.findMany({ select: { id: true, name: true, role: true }, orderBy: { name: 'asc' } }),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Auditoria</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {registros.length} registro(s) — check-in, check-out, cancelamentos, estornos e ações sensíveis.
          </p>
        </div>
        <Link href="/dashboard"><Button variant="secondary" size="sm">Dashboard</Button></Link>
      </header>

      <Card>
        <CardBody>
          <form method="GET" className="grid gap-3 md:grid-cols-5">
            <select
              name="acao"
              defaultValue={searchParams.acao ?? ''}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg"
            >
              <option value="">Todas as ações</option>
              {ACOES.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select
              name="usuarioId"
              defaultValue={searchParams.usuarioId ?? ''}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg"
            >
              <option value="">Todos os usuários</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
            <Input name="reservaId" placeholder="ID da reserva" defaultValue={searchParams.reservaId ?? ''} />
            <Input type="date" name="de" defaultValue={searchParams.de ?? ''} />
            <div className="flex gap-2">
              <Input type="date" name="ate" defaultValue={searchParams.ate ?? ''} />
              <Button type="submit" size="sm">Filtrar</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <section className="mt-6">
        <Card>
          <CardBody>
            <CardTitle>Trilha de eventos</CardTitle>
            {registros.length === 0 ? (
              <div className="mt-4 rounded-md border border-border bg-surface/50 p-6 text-center">
                <p className="text-sm text-fg-muted">Nenhum evento encontrado com os filtros aplicados.</p>
                <Link href="/auditoria" className="mt-3 inline-block">
                  <Button variant="secondary" size="sm">Limpar filtros</Button>
                </Link>
              </div>
            ) : (
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                    <th className="py-2">Data</th>
                    <th className="py-2">Ação</th>
                    <th className="py-2">Reserva</th>
                    <th className="py-2">Usuário</th>
                    <th className="py-2">IP</th>
                    <th className="py-2">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r) => (
                    <tr key={r.id} className="border-b border-border/60 align-top transition-colors duration-150 hover:bg-white/5">
                      <td className="py-2 text-fg-muted">{new Date(r.createdAt).toLocaleString('pt-BR')}</td>
                      <td className="py-2"><span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand">{r.acao}</span></td>
                      <td className="py-2">
                        {r.reserva ? (
                          <Link className="text-brand hover:underline" href={`/reservas/${r.reservaId}`}>{r.reserva.codigo}</Link>
                        ) : '—'}
                      </td>
                      <td className="py-2 text-fg-muted">
                        {r.usuario ? `${r.usuario.name} (${r.usuario.role})` : 'sistema'}
                      </td>
                      <td className="py-2 text-fg-muted">{r.ipAddress ?? '—'}</td>
                      <td className="py-2 max-w-xs truncate text-fg-muted" title={r.detalhes ? JSON.stringify(r.detalhes) : ''}>
                        {r.detalhes ? JSON.stringify(r.detalhes) : '—'}
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
