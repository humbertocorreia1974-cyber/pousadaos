import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const role = (session.user as any).role as string | undefined;
  if (!role || !['gerente', 'admin_rede'].includes(role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const where: any = {};
  const acao = searchParams.get('acao');
  const usuarioId = searchParams.get('usuarioId');
  const reservaId = searchParams.get('reservaId');
  const de = searchParams.get('de');
  const ate = searchParams.get('ate');
  if (acao) where.acao = acao;
  if (usuarioId) where.usuarioId = usuarioId;
  if (reservaId) where.reservaId = reservaId;
  if (de || ate) {
    where.createdAt = {};
    if (de) where.createdAt.gte = new Date(de);
    if (ate) where.createdAt.lte = new Date(ate + 'T23:59:59');
  }

  const registros = await prisma.auditoriaCheckInOut.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: {
      usuario: { select: { name: true, email: true, role: true } },
      reserva: { select: { codigo: true, status: true } },
    },
  });

  return NextResponse.json({ total: registros.length, registros });
}
