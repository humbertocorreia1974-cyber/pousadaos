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
  if (!unidadeId) return NextResponse.json({ error: 'unidadeId obrigatório' }, { status: 400 });

  const escalas = await prisma.escalaCamareira.findMany({
    where: { unidadeId },
    include: { camareira: { select: { id: true, name: true } } },
    orderBy: { data: 'desc' },
    take: 100,
  });
  return NextResponse.json({ escalas });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const role = (session.user as any).role as string;
  if (!['gerente', 'admin_rede', 'recepcao'].includes(role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { unidadeId, camareiraId, turno, quartosAtribuidos } = body;
  if (!unidadeId || !camareiraId) {
    return NextResponse.json({ error: 'unidadeId e camareiraId obrigatórios' }, { status: 400 });
  }

  const escala = await prisma.escalaCamareira.create({
    data: {
      unidadeId,
      camareiraId,
      turno: turno || 'manha',
      data: new Date(),
      quartosAtribuidos: Array.isArray(quartosAtribuidos) ? quartosAtribuidos : [],
    },
  });

  return NextResponse.json({ ok: true, id: escala.id });
}
