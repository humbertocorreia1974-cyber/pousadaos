import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role ?? "user";
  if (!["recepcao", "gerente", "admin_rede"].includes(role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const motivo = typeof body?.motivo === "string" ? body.motivo : null;

  const reserva = await prisma.reserva.findUnique({
    where: { id: params.id },
    include: { politicaCancelamento: true },
  });
  if (!reserva) {
    return NextResponse.json({ error: "Reserva não encontrada" }, { status: 404 });
  }
  if (!["pre_reserva", "confirmada"].includes(reserva.status)) {
    return NextResponse.json(
      { error: "Status atual não permite cancelamento" },
      { status: 400 }
    );
  }

  // Política aplicada server-side
  const agora = new Date();
  const diasAntes = Math.floor(
    (reserva.dataCheckin.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24)
  );
  const politica = reserva.politicaCancelamento;
  let percentualReembolso = 100;
  if (politica) {
    if (diasAntes >= politica.diasAntecedenciaGratis) {
      percentualReembolso = 100;
    } else {
      percentualReembolso = politica.percentualReembolsoApos;
    }
  }
  const valorPago = Number(reserva.valorPago);
  const valorReembolso = (valorPago * percentualReembolso) / 100;

  const updated = await prisma.reserva.update({
    where: { id: params.id },
    data: {
      status: "cancelada",
      canceladaEm: agora,
      motivoCancelamento: motivo,
    },
  });

  await prisma.auditoriaCheckInOut.create({
    data: {
      reservaId: reserva.id,
      usuarioId: session.user.id,
      acao: "reserva_cancelada",
      detalhes: {
        motivo,
        diasAntes,
        percentualReembolso,
        valorPago,
        valorReembolso,
      },
    },
  });

  return NextResponse.json({
    ok: true,
    reserva: updated,
    reembolso: { percentualReembolso, valorReembolso },
  });
}
