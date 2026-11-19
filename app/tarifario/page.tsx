import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import TarifaForm from './tarifa-form-client';
import { Plus, Calendar, Tag } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Tarifário por Temporada | PousadaOS',
  description: 'Preços por temporada, mínimo de noites e regras tarifárias definidas centralmente pela rede.',
  openGraph: { title: 'Tarifário | PousadaOS', description: 'Gestão de tarifas por temporada.' },
};

export default async function Page({ searchParams }: { searchParams: { unidadeId?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const role = (session.user as any).role;
  if (!['gerente', 'admin_rede', 'recepcao'].includes(role)) redirect('/');

  const unidades = await prisma.unidade.findMany({ orderBy: { nome: 'asc' } });
  const unidadeId = searchParams.unidadeId || unidades[0]?.id;

  const [tarifas, temporadas, tipos] = await Promise.all([
    unidadeId
      ? prisma.tarifa.findMany({
          where: { unidadeId },
          include: { tipoDeQuarto: true, temporada: true },
          orderBy: [{ ativa: 'desc' }, { createdAt: 'desc' }],
        })
      : Promise.resolve([]),
    unidadeId ? prisma.temporada.findMany({ where: { unidadeId }, orderBy: { dataInicio: 'asc' } }) : Promise.resolve([]),
    unidadeId ? prisma.tipoDeQuarto.findMany({ where: { unidadeId, ativo: true } }) : Promise.resolve([]),
  ]);

  const fmt = (v: any) => Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Tarifário por temporada</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Preços, mínimo de noites e regras definidas centralmente pela rede.
          </p>
        </div>
        <Link href="/tarifario/nova">
          <Button variant="primary" size="md">
            <Plus className="mr-2 h-4 w-4" /> Nova tarifa
          </Button>
        </Link>
      </div>

      <form className="mb-6 flex flex-wrap items-end gap-3" action="/tarifario">
        <div>
          <label className="mb-1 block text-xs font-medium text-fg-muted">Unidade</label>
          <select
            name="unidadeId"
            defaultValue={unidadeId}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg"
          >
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>{u.nome}</option>
            ))}
          </select>
        </div>
        <Button variant="secondary" size="md" type="submit">Aplicar</Button>
      </form>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardBody>
            <div className="flex items-center gap-2 text-fg-muted">
              <Tag className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wide">Tarifas ativas</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-fg">{tarifas.filter((t) => t.ativa).length}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-center gap-2 text-fg-muted">
              <Calendar className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wide">Temporadas</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-fg">{temporadas.length}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-center gap-2 text-fg-muted">
              <Tag className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wide">Tipos de quarto</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-fg">{tipos.length}</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <CardTitle className="mb-4">Tarifas cadastradas</CardTitle>
          {tarifas.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <p className="text-sm text-fg-muted">Nenhuma tarifa cadastrada para esta unidade.</p>
              <Link href="/tarifario/nova" className="mt-3 inline-block">
                <Button variant="primary" size="sm">Criar primeira tarifa</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                    <th className="py-2 pr-4">Nome</th>
                    <th className="py-2 pr-4">Tipo</th>
                    <th className="py-2 pr-4">Temporada</th>
                    <th className="py-2 pr-4">Base</th>
                    <th className="py-2 pr-4">Fim de semana</th>
                    <th className="py-2 pr-4">Mín. noites</th>
                    <th className="py-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tarifas.map((t) => (
                    <tr key={t.id} className="border-b border-border/60 transition-colors hover:bg-white/5">
                      <td className="py-3 pr-4 font-medium text-fg">{t.nome}</td>
                      <td className="py-3 pr-4 text-fg-muted">{t.tipoDeQuarto.nome}</td>
                      <td className="py-3 pr-4 text-fg-muted">{t.temporada?.nome ?? '—'}</td>
                      <td className="py-3 pr-4 text-fg">{fmt(t.precoBase)}</td>
                      <td className="py-3 pr-4 text-fg-muted">{t.precoFimSemana ? fmt(t.precoFimSemana) : '—'}</td>
                      <td className="py-3 pr-4 text-fg-muted">{t.minimoNoites}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${t.ativa ? 'bg-brand/10 text-brand' : 'bg-border/40 text-fg-muted'}`}>
                          {t.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="mt-8">
        <TarifaForm unidadeId={unidadeId} tipos={tipos.map((t) => ({ id: t.id, nome: t.nome }))} temporadas={temporadas.map((t) => ({ id: t.id, nome: t.nome }))} />
      </div>
    </div>
  );
}
