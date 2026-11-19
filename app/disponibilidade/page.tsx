import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle, CardBody } from '@/components/ui/card';
import { DisponibilidadeBusca } from './disponibilidade-busca-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Motor de Disponibilidade — PousadaOS',
  description: 'Busque quartos livres em tempo real e receba alerta de overbooking antes de confirmar.',
  openGraph: { title: 'Motor de Disponibilidade — PousadaOS', description: 'Disponibilidade em tempo real com alerta de overbooking.' },
};

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const unidades = await prisma.unidade.findMany({
    where: { ativa: true },
    select: { id: true, nome: true, cidade: true, estado: true },
    orderBy: { nome: 'asc' },
  });

  const tipos = await prisma.tipoDeQuarto.findMany({
    where: { ativo: true },
    select: { id: true, nome: true, unidadeId: true, capacidadeAdultos: true },
    orderBy: { nome: 'asc' },
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-fg-muted">Operação</p>
        <h1 className="mt-1 text-3xl font-semibold text-fg">Motor de Disponibilidade</h1>
        <p className="mt-2 max-w-2xl text-sm text-fg-muted">
          Consulte quartos livres por período e tipo. O sistema verifica conflitos em tempo real e alerta sobre overbooking antes de qualquer confirmação.
        </p>
      </header>

      {unidades.length === 0 ? (
        <Card>
          <CardBody>
            <CardTitle>Nenhuma unidade cadastrada</CardTitle>
            <p className="mt-2 text-sm text-fg-muted">Cadastre uma unidade e seus quartos para começar a usar o motor de disponibilidade.</p>
          </CardBody>
        </Card>
      ) : (
        <DisponibilidadeBusca unidades={unidades} tipos={tipos} />
      )}
    </main>
  );
}
