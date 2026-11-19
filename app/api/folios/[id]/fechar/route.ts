import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const METODOS_VALIDOS = ['dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'transferencia'];

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const role = (session.user as any).role as string;
  if (!['recepcao', 'gerente', 'admin_rede'].includes(role)) {
    return NextResponse.json({ error: 'Sem permissão para fechar folio' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const pagamentosInput: Array<{ metodo: string; valor: number }> = Array.isArray(body?.pagamentos)
    ? body.pagamentos
    : [];

  if (pagamentosInput.length === 0) {
    return NextResponse.json({ error: 'Informe ao menos uma forma de pagamento' }, { status: 400 });
  }
  for (const p of pagamentosInput) {
    if (!METODOS_VALIDOS.includes(p.metodo)) {
      return NextResponse.json({ error: `Método inválido: ${p.metodo}` }, { status: 400 });
    }
    if (!Number.isFinite(p.valor) || p.valor <= 0) {
      return NextResponse.json({ error: 'Valor de pagamento inválido' }, { status: 400 });
    }
  }

  const folio = await prisma.folio.findUnique({
    where: { id: params.id },
    include: {
      reserva: { include: { hospede: true, unidade: true } },
      lancamentos: { where: { estornado: false } },
    },
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

  const totalLanc = folio.lancamentos.reduce((acc, l) => acc + Number(l.valorTotal), 0);
  const totalPagoNovo = pagamentosInput.reduce((acc, p) => acc + Number(p.valor), 0);
  const totalPagoFinal = Number((Number(folio.totalPago) + totalPagoNovo).toFixed(2));
  const saldoFinal = Number((totalLanc - totalPagoFinal).toFixed(2));

  if (saldoFinal > 0.01) {
    return NextResponse.json(
      { error: `Saldo devedor de R$ ${saldoFinal.toFixed(2)} — pagamento insuficiente` },
      { status: 400 }
    );
  }

  const resultado = await prisma.$transaction(async (tx) => {
    for (const p of pagamentosInput) {
      await tx.pagamento.create({
        data: {
          reservaId: folio.reservaId,
          folioId: folio.id,
          valor: p.valor,
          metodo: p.metodo,
          status: 'pago',
          registradoPorId: session.user.id,
          pagoEm: new Date(),
        },
      });
    }

    const folioAtualizado = await tx.folio.update({
      where: { id: folio.id },
      data: {
        status: 'fechado',
        totalLancamentos: totalLanc,
        totalPago: totalPagoFinal,
        saldo: 0,
        fechadoEm: new Date(),
      },
    });

    await tx.reserva.update({
      where: { id: folio.reservaId },
      data: {
        valorPago: totalPagoFinal,
        valorExtras: totalLanc,
      },
    });

    await tx.auditoriaCheckInOut.create({
      data: {
        reservaId: folio.reservaId,
        usuarioId: session.user.id,
        acao: 'fechamento_folio',
        detalhes: {
          folioId: folio.id,
          totalLancamentos: totalLanc,
          totalPago: totalPagoFinal,
          pagamentos: pagamentosInput,
        },
      },
    });

    return folioAtualizado;
  });

  const hospedeEmail = folio.reserva.hospede.email;
  if (hospedeEmail) {
    try {
      await sendEmail({
        to: hospedeEmail,
        subject: `Recibo da sua estadia — ${folio.reserva.unidade.nome}`,
        html: `
          <h2>Obrigado pela sua estadia!</h2>
          <p>Olá ${folio.reserva.hospede.nomeCompleto},</p>
          <p>Segue o resumo do fechamento da sua conta (folio <strong>${folio.numero}</strong>):</p>
          <ul>
            <li>Total de lançamentos: R$ ${totalLanc.toFixed(2)}</li>
            <li>Total pago: R$ ${totalPagoFinal.toFixed(2)}</li>
            <li>Saldo: R$ 0,00</li>
          </ul>
          <p>Esperamos te ver novamente em breve.</p>
          <p>— Equipe ${folio.reserva.unidade.nome}</p>
        `,
      });
    } catch {
      // envio de e-mail não bloqueia o fechamento
    }
  }

  return NextResponse.json({ ok: true, folio: resultado });
}
