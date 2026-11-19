import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: { id: string; lancId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const role = (session.user as any).role as string;
  if (!['recepcao', 'gerente', 'admin_rede'].includes(role)) {
    return NextResponse.json({ error: 'Sem permissão para estornar' }, { status: 403 });
  }

  const folio = await prisma.folio.findUnique({
    where: { id: params.id },
    include: { reserva: { select: { unidadeId: true, id: true } } },
  });
  if (!folio) return NextResponse.json({ error: 'Folio não encontrado' }, { status: 404 });
  if (folio.status !== 'aberto') {
    return NextResponse.json({ error: 'Folio fechado não pode ser alterado' }, { status: 409 });
  }

  if (role !== 'admin_rede' && role !== 'gerente') {
    const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { unidadeId: true } });
    if (u?.unidadeId && u.unidadeId !== folio.reserva.unidadeId) {
      return NextResponse.json({ error: 'Sem permissão nesta unidade' }, { status: 403 });
    }
  }

  const lanc = await prisma.folioLancamento.findUnique({ where: { id: params.lancId } });
  if (!lanc || lanc.folioId !== folio.id) {
    return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 });
  }
  if (lanc.estornado) {
    return NextResponse.json({ error: 'Lançamento já estornado' }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.folioLancamento.update({
      where: { id: lanc.id },
      data: { estornado: true, estornadoEm: new Date() },
    });

    const agg = await tx.folioLancamento.aggregate({
      where: { folioId: folio.id, estornado: false },
      _sum: { valorTotal: true },
    });
    const totalLanc = Number(agg._sum.valorTotal ?? 0);
    const saldo = Number((totalLanc - Number(folio.totalPago)).toFixed(2));

    await tx.folio.update({
      where: { id: folio.id },
      data: { totalLancamentos: totalLanc, saldo },
    });

    await tx.reserva.update({
      where: { id: folio.reserva.id },
      data: { valorExtras: totalLanc },
    });

    await tx.auditoriaCheckInOut.create({
      data: {
        reservaId: folio.reserva.id,
        usuarioId: session.user.id,
        acao: 'estorno_lancamento_folio',
        detalhes: { lancamentoId: lanc.id, valor: Number(lanc.valorTotal) },
      },
    });
  });

  return NextResponse.json({ ok: true });
}
