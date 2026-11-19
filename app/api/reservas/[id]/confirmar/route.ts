import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
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

  const reserva = await prisma.reserva.findUnique({ where: { id: params.id } });
  if (!reserva) {
    return NextResponse.json({ error: "Reserva não encontrada" }, { status: 404 });
  }
  if (reserva.status !== "pre_reserva") {
    return NextResponse.json(
      { error: "Só pré-reservas podem ser confirmadas" },
      { status: 400 }
    );
  }

  const updated = await prisma.reserva.update({
    where: { id: params.id },
    data: { status: "confirmada" },
  });

  await prisma.auditoriaCheckInOut.create({
    data: {
      reservaId: reserva.id,
      usuarioId: session.user.id,
      acao: "reserva_confirmada",
      detalhes: { statusAnterior: reserva.status, statusNovo: "confirmada" },
    },
  });

  return NextResponse.json({ ok: true, reserva: updated });
}
