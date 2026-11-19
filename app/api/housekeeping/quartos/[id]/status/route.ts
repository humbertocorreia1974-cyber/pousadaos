import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const VALIDOS = ['limpo', 'sujo', 'em_limpeza', 'inspecao', 'manutencao'];

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const role = (session.user as any).role as string;
  if (!['camareira', 'recepcao', 'gerente', 'admin_rede'].includes(role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const status = String(body.status || '');
  if (!VALIDOS.includes(status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
  }

  const quarto = await prisma.quarto.findUnique({ where: { id: params.id } });
  if (!quarto) return NextResponse.json({ error: 'Quarto não encontrado' }, { status: 404 });

  const criado = await prisma.statusHousekeeping.create({
    data: {
      quartoId: params.id,
      status,
      atualizadoPorId: session.user.id,
    },
  });

  return NextResponse.json({ ok: true, id: criado.id, status });
}
