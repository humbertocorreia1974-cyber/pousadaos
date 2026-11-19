import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const role = (session.user as any).role;
  if (!['gerente', 'admin_rede'].includes(role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }
  const body = await request.json();
  const data: any = {};
  if (body.nome !== undefined) data.nome = body.nome;
  if (body.precoBase !== undefined) data.precoBase = body.precoBase;
  if (body.precoFimSemana !== undefined) data.precoFimSemana = body.precoFimSemana;
  if (body.minimoNoites !== undefined) data.minimoNoites = body.minimoNoites;
  if (body.maximoNoites !== undefined) data.maximoNoites = body.maximoNoites;
  if (body.ativa !== undefined) data.ativa = body.ativa;
  const tarifa = await prisma.tarifa.update({ where: { id: params.id }, data });
  return NextResponse.json({ tarifa });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const role = (session.user as any).role;
  if (!['gerente', 'admin_rede'].includes(role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }
  await prisma.tarifa.update({ where: { id: params.id }, data: { ativa: false } });
  return NextResponse.json({ ok: true });
}
