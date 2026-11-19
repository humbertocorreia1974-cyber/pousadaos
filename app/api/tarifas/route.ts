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
  const tarifas = await prisma.tarifa.findMany({
    where: unidadeId ? { unidadeId } : undefined,
    include: { tipoDeQuarto: true, temporada: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ tarifas });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const role = (session.user as any).role;
  if (!['gerente', 'admin_rede'].includes(role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }
  const body = await request.json();
  if (!body.unidadeId || !body.tipoDeQuartoId || !body.nome || body.precoBase == null) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
  }
  const tarifa = await prisma.tarifa.create({
    data: {
      unidadeId: body.unidadeId,
      tipoDeQuartoId: body.tipoDeQuartoId,
      temporadaId: body.temporadaId || null,
      nome: body.nome,
      precoBase: body.precoBase,
      precoFimSemana: body.precoFimSemana ?? null,
      minimoNoites: body.minimoNoites ?? 1,
      maximoNoites: body.maximoNoites ?? null,
    },
  });
  return NextResponse.json({ tarifa }, { status: 201 });
}
