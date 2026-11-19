import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const SETORES_VALIDOS = ['frigobar', 'restaurante', 'passeios', 'outros'];
const PAPEIS_LANCAMENTO = ['recepcao', 'gerente', 'admin_rede'];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const folio = await prisma.folio.findUnique({
    where: { id: params.id },
    include: {
      lancamentos: { orderBy: { createdAt: 'desc' } },
      reserva: { select: { unidadeId: true } },
    },
  });
  if (!folio) return NextResponse.json({ error: 'Folio não encontrado' }, { status: 404 });

  const role = (session.user as any).role as string;
  if (role !== 'admin_rede' && role !== 'gerente') {
    const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { unidadeId: true } });
    if (u?.unidadeId && u.unidadeId !== folio.reserva.unidadeId) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }
  }
  return NextResponse.json({ folio });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const role = (session.user as any).role as string;
  if (!PAPEIS_LANCAMENTO.includes(role)) {
    return NextResponse.json({ error: 'Papel sem permissão para lançar consumo' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });

  const setor = String(body.setor || '').trim();
  const descricao = String(body.descricao || '').trim();
  const quantidade = Math.max(1, parseInt(String(body.quantidade || '1'), 10) || 1);
  const valorUnitario = Number(body.valorUnitario);

  if (!SETORES_VALIDOS.includes(setor)) {
    return NextResponse.json({ error: 'Setor inválido' }, { status: 400 });
  }
  if (!descricao) return NextResponse.json({ error: 'Descrição obrigatória' }, { status: 400 });
  if (!Number.isFinite(valorUnitario) || valorUnitario <= 0) {
    return NextResponse.json({ error: 'Valor unitário inválido' }, { status: 400 });
  }

  const folio = await prisma.folio.findUnique({
    where: { id: params.id },
    include: { reserva: { select: { unidadeId: true, id: true } } },
  });
  if (!folio) return NextResponse.json({ error: 'Folio não encontrado' }, { status: 404 });
  if (folio.status !== 'aberto') {
    return NextResponse.json({ error: 'Folio já está fechado' }, { status: 409 });
  }

  if (role !== 'admin_rede' && role !== 'gerente') {
    const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { unidadeId: true } });
    if (u?.unidadeId && u.unidadeId !== folio.reserva.unidadeId) {
      return NextResponse.json({ error: 'Sem permissão nesta unidade' }, { status: 403 });
    }
  }

  const valorTotal = Number((valorUnitario * quantidade).toFixed(2));

  const result = await prisma.$transaction(async (tx) => {
    const lanc = await tx.folioLancamento.create({
      data: {
        folioId: folio.id,
        setor,
        descricao,
        quantidade,
        valorUnitario,
        valorTotal,
        lancadoPorId: session.user.id,
      },
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
        acao: 'lancamento_folio',
        detalhes: { setor, descricao, quantidade, valorUnitario, valorTotal },
      },
    });

    return lanc;
  });

  return NextResponse.json({ ok: true, lancamento: result }, { status: 201 });
}
