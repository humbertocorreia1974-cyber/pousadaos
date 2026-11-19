import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle, CardBody } from '@/components/ui/card';
import CheckinForm from './checkin-form-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Check-in | PousadaOS',
  description: 'Realize o check-in do hóspede com captura de documento e assinatura digital.',
  openGraph: { title: 'Check-in | PousadaOS', description: 'Check-in com documento e assinatura.' },
};

export default async function CheckinPage({ params }: { params: { reservaId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const role = (session.user as any).role as string | undefined;
  if (!role || !['recepcao', 'gerente', 'admin_rede'].includes(role)) redirect('/');

  const reserva = await prisma.reserva.findUnique({
    where: { id: params.reservaId },
    include: {
      hospede: true,
      quarto: true,
      tipoDeQuarto: true,
      unidade: true,
    },
  });
  if (!reserva) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wide text-fg-muted">Reserva {reserva.codigo}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-fg">Check-in</h1>
        <p className="mt-1 text-sm text-fg-muted">
          {reserva.hospede.nomeCompleto} · {reserva.unidade.nome} · Quarto {reserva.quarto?.numero ?? '—'}
        </p>
      </header>

      <Card className="mb-6">
        <CardBody>
          <CardTitle>Dados da reserva</CardTitle>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-fg-muted">Check-in previsto</dt>
              <dd className="text-fg">{new Date(reserva.dataCheckin).toLocaleDateString('pt-BR')}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">Check-out previsto</dt>
              <dd className="text-fg">{new Date(reserva.dataCheckout).toLocaleDateString('pt-BR')}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">Hóspedes</dt>
              <dd className="text-fg">{reserva.adultos} adultos · {reserva.criancas} crianças</dd>
            </div>
            <div>
              <dt className="text-fg-muted">Status</dt>
              <dd className="text-fg capitalize">{reserva.status.replace('_', ' ')}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <CheckinForm
        reservaId={reserva.id}
        codigo={reserva.codigo}
        jaTemDocumento={Boolean(reserva.documentoUrl)}
        jaTemAssinatura={Boolean(reserva.assinaturaUrl)}
      />
    </div>
  );
}
