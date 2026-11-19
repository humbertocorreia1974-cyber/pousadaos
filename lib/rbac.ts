import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export type Papel = "hospede" | "recepcao" | "camareira" | "gerente" | "admin_rede";

export const PERMISSOES: Record<Papel, string[]> = {
  hospede: ["portal:ler", "reserva:propria"],
  recepcao: [
    "reserva:ler", "reserva:criar", "reserva:checkin", "reserva:checkout",
    "reserva:cancelar", "reserva:noshow", "folio:ler", "folio:lancar",
    "pagamento:registrar", "hospede:ler", "hospede:criar", "hospede:editar",
    "housekeeping:ler", "disponibilidade:ler",
  ],
  camareira: ["housekeeping:ler", "housekeeping:atualizar", "escala:propria"],
  gerente: [
    "reserva:ler", "reserva:criar", "reserva:checkin", "reserva:checkout",
    "reserva:cancelar", "reserva:noshow", "folio:ler", "folio:lancar", "folio:fechar",
    "pagamento:registrar", "hospede:ler", "hospede:criar", "hospede:editar",
    "housekeeping:ler", "housekeeping:atualizar", "escala:gerenciar",
    "tarifa:gerenciar", "temporada:gerenciar", "bloqueio:gerenciar",
    "dashboard:ler", "auditoria:ler", "unidade:gerenciar", "quarto:gerenciar",
    "tipoQuarto:gerenciar", "disponibilidade:ler",
  ],
  admin_rede: ["*"],
};

export function temPermissao(role: string | undefined, perm: string): boolean {
  if (!role) return false;
  const perms = PERMISSOES[role as Papel];
  if (!perms) return false;
  return perms.includes("*") || perms.includes(perm);
}

export async function exigirSessao() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return session;
}

export async function exigirPapel(papeis: Papel[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role as string | undefined;
  if (!role || !papeis.includes(role as Papel)) redirect("/");
  return session;
}

export async function exigirPermissao(perm: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role as string | undefined;
  if (!temPermissao(role, perm)) redirect("/");
  return session;
}
