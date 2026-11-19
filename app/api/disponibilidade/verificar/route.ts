import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { quartoId, checkin, checkout, reservaIdIgnorar } = body ?? {};
  if (!quartoId || !checkin || !checkout) {
    return NextResponse.json({ error: 'quartoId, checkin e checkout são obrigatórios' }, { status: 400 });
  }

  const dtIn = new Date(checkin);
  const dtOut = new Date(checkout);
  if (isNaN(dtIn.getTime()) || isNaN(dtOut.getTime()) || dtOut <= dtIn) {
    return NextResponse.json({ error: 'Datas inválidas' }, { status: 400 });
  }

  const [reserva, bloqueio] = await Promise.all([
    prisma.reserva.findFirst({
      where: {
        quartoId,
        status: { in: ['pre_reserva', 'confirmada', 'checkin'] },
        dataCheckin: { lt: dtOut },
        dataCheckout: { gt: dtIn },
        ...(reservaIdIgnorar ? { id: { not: reservaIdIgnorar } } : {}),
      },
      select: { id: true, codigo: true, status: true },
    }),
    prisma.bloqueioManutencao.findFirst({
      where: { quartoId, ativo: true, dataInicio: { lt: dtOut }, dataFim: { gt: dtIn } },
      select: { id: true, motivo: true },
    }),
  ]);

  const conflito = reserva
    ? { tipo: 'reserva', codigo: reserva.codigo, status: reserva.status }
    : bloqueio
    ? { tipo: 'manutencao', motivo: bloqueio.motivo }
    : null;

  return NextResponse.json({ disponivel: !conflito, conflito });
}
