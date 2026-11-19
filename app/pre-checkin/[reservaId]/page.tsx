import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PreCheckinForm from './pre-checkin-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Pré-check-in online | PousadaOS',
  description: 'Adiante seu check-in: envie documento e assine digitalmente antes de chegar na pousada.',
  openGraph: {
    title: 'Pré-check-in online | PousadaOS',
    description: 'Envie documento e assine digitalmente antes de chegar.',
  },
};

export default async function Page({ params }: { params: { reservaId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/login?next=/pre-checkin/${params.reservaId}`);

  const reserva = await prisma.reserva.findUnique({
    where: { id: params.reservaId },
    include: {
      unidade: true,
      tipoDeQuarto: true,
      quarto: true,
      hospede: true,
    },
  });
  if (!reserva) notFound();

  const isOwner = reserva.hospedeUserId === session.user.id || reserva.hospede.userId === session.user.id;
  const isStaff = ['recepcao', 'gerente', 'admin_rede'].includes(session.user.role);
  if (!isOwner && !isStaff) redirect('/');

  const jaFeito = !!reserva.preCheckinRealizadoEm;
  const alerta48h = reserva.alerta48hEnviadoEm;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-fg-muted">Pré-check-in</p>
        <h1 className="mt-1 text-3xl font-semibold text-fg">Reserva {reserva.codigo}</h1>
        <p className="mt-2 text-sm text-fg-muted">
          {reserva.unidade.nome} · {reserva.tipoDeQuarto.nome}
          {reserva.quarto ? ` · Quarto ${reserva.quarto.numero}` : ''}
        </p>
      </div>

      <Card className="mb-6">
        <CardBody className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-fg-muted">Check-in</p>
            <p className="font-medium text-fg">{new Date(reserva.dataCheckin).toLocaleDateString('pt-BR')}</p>
          </div>
          <div>
            <p className="text-fg-muted">Check-out</p>
            <p className="font-medium text-fg">{new Date(reserva.dataCheckout).toLocaleDateString('pt-BR')}</p>
          </div>
          <div>
            <p className="text-fg-muted">Hóspede</p>
            <p className="font-medium text-fg">{reserva.hospede.nomeCompleto}</p>
          </div>
          <div>
            <p className="text-fg-muted">Status</p>
            <p className="font-medium text-fg capitalize">{reserva.status.replace('_', ' ')}</p>
          </div>
        </CardBody>
      </Card>

      {alerta48h && !jaFeito && (
        <div className="mb-6 rounded-lg border border-brand/30 bg-brand/5 p-4 text-sm text-fg">
          Lembrete enviado em {new Date(alerta48h).toLocaleString('pt-BR')} — finalize seu pré-check-in para agilizar a chegada.
        </div>
      )}

      {jaFeito ? (
        <Card>
          <CardBody className="space-y-3">
            <CardTitle>Pré-check-in concluído</CardTitle>
            <p className="text-sm text-fg-muted">
              Enviado em {new Date(reserva.preCheckinRealizadoEm!).toLocaleString('pt-BR')}. Ao chegar, basta apresentar um documento com foto.
            </p>
            <Link href="/portal/minhas-reservas">
              <Button variant="secondary" size="sm">Ver minhas reservas</Button>
            </Link>
          </CardBody>
        </Card>
      ) : (
        <PreCheckinForm reservaId={reserva.id} />
      )}
    </main>
  );
}
