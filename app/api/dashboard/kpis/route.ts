import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const role = (session.user as any).role as string | undefined;
  if (!role || !['gerente', 'admin_rede', 'recepcao'].includes(role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const unidadeId = (session.user as any).unidadeId as string | undefined;
  const whereUnidade = unidadeId ? { unidadeId } : {};
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);

  const [totalQuartos, reservas, noShows] = await Promise.all([
    prisma.quarto.count({ where: { ...whereUnidade, ativo: true } }),
    prisma.reserva.findMany({
      where: { ...whereUnidade, dataCheckin: { gte: inicioMes, lte: fimMes }, status: { in: ['confirmada', 'checkin', 'checkout'] } },
      select: { noites: true, valorTotal: true, canalOrigem: true },
    }),
    prisma.reserva.count({ where: { ...whereUnidade, status: 'no_show', dataCheckin: { gte: inicioMes, lte: fimMes } } }),
  ]);

  const diasNoMes = fimMes.getDate();
  const disponiveis = totalQuartos * diasNoMes;
  const vendidas = reservas.reduce((s, r) => s + r.noites, 0);
  const receita = reservas.reduce((s, r) => s + Number(r.valorTotal), 0);

  return NextResponse.json({
    ocupacao: disponiveis > 0 ? (vendidas / disponiveis) * 100 : 0,
    adr: vendidas > 0 ? receita / vendidas : 0,
    revpar: disponiveis > 0 ? receita / disponiveis : 0,
    receita,
    noShows,
    totalReservas: reservas.length,
  });
}
