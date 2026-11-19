import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const reserva = await prisma.reserva.findUnique({
    where: { id: params.id },
    include: { hospede: true, unidade: true },
  });
  if (!reserva) return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 });

  const isOwner = reserva.hospedeUserId === session.user.id || reserva.hospede.userId === session.user.id;
  const isStaff = ['recepcao', 'gerente', 'admin_rede'].includes(session.user.role);
  if (!isOwner && !isStaff) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const form = await req.formData();
  const doc = form.get('documento');
  const assinatura = form.get('assinatura');
  const telefone = (form.get('telefone') as string) || null;
  const observacoes = (form.get('observacoes') as string) || null;

  if (!(doc instanceof File)) return NextResponse.json({ error: 'Documento obrigatório' }, { status: 400 });
  if (typeof assinatura !== 'string' || assinatura.length < 2000)
    return NextResponse.json({ error: 'Assinatura obrigatória' }, { status: 400 });

  const buf = Buffer.from(await doc.arrayBuffer());
  const docUrl = `data:${doc.type || 'application/octet-stream'};base64,${buf.toString('base64')}`;

  await prisma.$transaction([
    prisma.reserva.update({
      where: { id: reserva.id },
      data: {
        documentoUrl: docUrl,
        assinaturaUrl: assinatura,
        preCheckinRealizadoEm: new Date(),
        observacoes: observacoes ?? reserva.observacoes,
      },
    }),
    prisma.hospede.update({
      where: { id: reserva.hospedeId },
      data: { telefone: telefone ?? reserva.hospede.telefone },
    }),
    prisma.auditoriaCheckInOut.create({
      data: {
        reservaId: reserva.id,
        usuarioId: session.user.id,
        acao: 'pre_checkin',
        detalhes: { canal: 'online', temDocumento: true, temAssinatura: true },
      },
    }),
    prisma.historicoHospede.create({
      data: {
        hospedeId: reserva.hospedeId,
        reservaId: reserva.id,
        tipo: 'pre_checkin',
        descricao: 'Pré-check-in realizado online',
      },
    }),
  ]);

  if (reserva.hospede.email) {
    await sendEmail({
      to: reserva.hospede.email,
      subject: `Pré-check-in confirmado — ${reserva.codigo}`,
      html: `<p>Olá ${reserva.hospede.nomeCompleto},</p><p>Seu pré-check-in para <strong>${reserva.unidade.nome}</strong> foi registrado. Ao chegar, apresente apenas um documento com foto.</p>`,
    }).catch(() => null);
  }

  return NextResponse.json({ ok: true });
}
