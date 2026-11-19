import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const unidadeId = searchParams.get('unidadeId');
  const tipoDeQuartoId = searchParams.get('tipoDeQuartoId');
  const checkin = searchParams.get('checkin');
  const checkout = searchParams.get('checkout');

  if (!unidadeId || !checkin || !checkout) {
    return NextResponse.json({ error: 'unidadeId, checkin e checkout são obrigatórios' }, { status: 400 });
  }

  const dtIn = new Date(checkin);
  const dtOut = new Date(checkout);
  if (isNaN(dtIn.getTime()) || isNaN(dtOut.getTime()) || dtOut <= dtIn) {
    return NextResponse.json({ error: 'Datas inválidas' }, { status: 400 });
  }

  const quartos = await prisma.quarto.findMany({
    where: { unidadeId, ativo: true, ...(tipoDeQuartoId ? { tipoDeQuartoId } : {}) },
    include: { tipoDeQuarto: { select: { nome: true, capacidadeAdultos: true } } },
    orderBy: [{ andar: 'asc' }, { numero: 'asc' }],
  });

  const quartoIds = quartos.map((q) => q.id);

  const reservasConflitantes = await prisma.reserva.findMany({
    where: {
      quartoId: { in: quartoIds },
      status: { in: ['pre_reserva', 'confirmada', 'checkin'] },
      dataCheckin: { lt: dtOut },
      dataCheckout: { gt: dtIn },
    },
    select: { quartoId: true, codigo: true, status: true },
  });

  const bloqueios = await prisma.bloqueioManutencao.findMany({
    where: {
      quartoId: { in: quartoIds },
      ativo: true,
      dataInicio: { lt: dtOut },
      dataFim: { gt: dtIn },
    },
    select: { quartoId: true, motivo: true },
  });

  const conflitosMap = new Map<string, string>();
  for (const r of reservasConflitantes) {
    if (r.quartoId) conflitosMap.set(r.quartoId, `Reserva ${r.codigo} (${r.status})`);
  }
  for (const b of bloqueios) {
    if (!conflitosMap.has(b.quartoId)) conflitosMap.set(b.quartoId, `Manutenção: ${b.motivo}`);
  }

  const livres = quartos
    .filter((q) => !conflitosMap.has(q.id))
    .map((q) => ({
      id: q.id,
      numero: q.numero,
      andar: q.andar,
      tipo: q.tipoDeQuarto.nome,
      capacidade: q.tipoDeQuarto.capacidadeAdultos,
    }));

  const conflitos = Array.from(conflitosMap.entries()).map(([quartoId, motivo]) => {
    const q = quartos.find((x) => x.id === quartoId);
    return { quartoId, numero: q?.numero ?? '—', motivo };
  });

  return NextResponse.json({ quartos: livres, conflitos });
}
