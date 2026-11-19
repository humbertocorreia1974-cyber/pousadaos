import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const GRAPH_URL = 'https://graph.facebook.com/v20.0';

async function enviarWhatsApp(to: string, body: string) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneId || !token) {
    console.warn('[whatsapp] credenciais ausentes — configure WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN');
    return { ok: false, error: 'credenciais ausentes' };
  }
  const res = await fetch(`${GRAPH_URL}/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? '', { status: 200 });
  }
  return new NextResponse('forbidden', { status: 403 });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: true });

  const entries = body?.entry ?? [];
  for (const entry of entries) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value ?? {};
      const messages = value?.messages ?? [];
      for (const msg of messages) {
        const from: string = msg.from;
        const text: string = msg?.text?.body ?? '';
        const lower = text.trim().toLowerCase();

        let resposta = 'Olá! Sou o assistente da PousadaOS. Envie *RESERVA* para consultar sua reserva ou *CHECKIN* para o pré-check-in.';
        if (lower.includes('reserva')) {
          const reservas = await prisma.reserva.findMany({
            where: { hospede: { telefone: { contains: from.slice(-8) } } },
            orderBy: { dataCheckin: 'desc' },
            take: 3,
            select: { codigo: true, dataCheckin: true, dataCheckout: true, status: true },
          });
          resposta = reservas.length
            ? 'Suas últimas reservas:\n' +
              reservas
                .map(
                  (r) =>
                    `• ${r.codigo} — ${new Date(r.dataCheckin).toLocaleDateString('pt-BR')} a ${new Date(r.dataCheckout).toLocaleDateString('pt-BR')} (${r.status})`,
                )
                .join('\n')
            : 'Não encontrei reservas para este número. Fale com a recepção.';
        } else if (lower.includes('checkin') || lower.includes('check-in')) {
          resposta = 'Perfeito! Acesse o link do pré-check-in enviado por e-mail ou peça à recepção para reenviar.';
        }

        await enviarWhatsApp(from, resposta).catch((e) => console.error('[whatsapp] erro', e));
      }
    }
  }

  return NextResponse.json({ ok: true });
}
