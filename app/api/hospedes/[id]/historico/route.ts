import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const role = (session.user as any).role as string | undefined;
  if (!role || !['gerente', 'admin_rede', 'recepcao'].includes(role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const hospede = await prisma.hospede.findUnique({
    where: { id: params.id },
    include: {
      reservas: { orderBy: { dataCheckin: 'desc' }, take: 50 },
      historicos: { orderBy: { dataEvento: 'desc' }, take: 50 },
    },
  });
  if (!hospede) return NextResponse.json({ error: 'Hóspede não encontrado' }, { status: 404 });

  return NextResponse.json({
    hospede: { id: hospede.id, nome: hospede.nomeCompleto, preferencias: hospede.preferencias },
    reservas: hospede.reservas,
    historicos: hospede.hospedes ?? hospede.historicos,
  });
}
