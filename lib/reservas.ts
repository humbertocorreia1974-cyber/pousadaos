import { prisma } from "@/lib/prisma";

export type Conflito = {
  quartoId: string;
  numero: string;
  reservaId: string;
  codigo: string;
  dataCheckin: Date;
  dataCheckout: Date;
};

/**
 * Verifica conflitos de reserva em um quarto para um intervalo.
 * Considera reservas ativas (pre_reserva, confirmada, checkin) e bloqueios de manutenção.
 */
export async function verificarConflito(
  quartoId: string,
  dataCheckin: Date,
  dataCheckout: Date,
  ignorarReservaId?: string
): Promise<{ conflito: boolean; reservas: Conflito[]; bloqueios: { id: string; motivo: string; dataInicio: Date; dataFim: Date }[] }> {
  const reservas = await prisma.reserva.findMany({
    where: {
      quartoId,
      id: ignorarReservaId ? { not: ignorarReservaId } : undefined,
      status: { in: ["pre_reserva", "confirmada", "checkin"] },
      dataCheckin: { lt: dataCheckout },
      dataCheckout: { gt: dataCheckin },
    },
    select: {
      id: true,
      codigo: true,
      dataCheckin: true,
      dataCheckout: true,
      quartoId: true,
      quarto: { select: { numero: true } },
    },
  });

  const bloqueios = await prisma.bloqueioManutencao.findMany({
    where: {
      quartoId,
      ativo: true,
      dataInicio: { lt: dataCheckout },
      dataFim: { gt: dataCheckin },
    },
    select: { id: true, motivo: true, dataInicio: true, dataFim: true },
  });

  return {
    conflito: reservas.length > 0 || bloqueios.length > 0,
    reservas: reservas.map((r) => ({
      quartoId: r.quartoId!,
      numero: r.quarto?.numero ?? "",
      reservaId: r.id,
      codigo: r.codigo,
      dataCheckin: r.dataCheckin,
      dataCheckout: r.dataCheckout,
    })),
    bloqueios,
  };
}

/**
 * Busca quartos disponíveis para um tipo e intervalo.
 */
export async function buscarQuartosDisponiveis(
  unidadeId: string,
  tipoDeQuartoId: string,
  dataCheckin: Date,
  dataCheckout: Date
) {
  const quartos = await prisma.quarto.findMany({
    where: { unidadeId, tipoDeQuartoId, ativo: true },
    select: { id: true, numero: true, andar: true },
    orderBy: { numero: "asc" },
  });

  const ocupados = await prisma.reserva.findMany({
    where: {
      quartoId: { in: quartos.map((q) => q.id) },
      status: { in: ["pre_reserva", "confirmada", "checkin"] },
      dataCheckin: { lt: dataCheckout },
      dataCheckout: { gt: dataCheckin },
    },
    select: { quartoId: true },
  });

  const bloqueados = await prisma.bloqueioManutencao.findMany({
    where: {
      quartoId: { in: quartos.map((q) => q.id) },
      ativo: true,
      dataInicio: { lt: dataCheckout },
      dataFim: { gt: dataCheckin },
    },
    select: { quartoId: true },
  });

  const indisponiveis = new Set<string>([
    ...ocupados.map((o) => o.quartoId!).filter(Boolean),
    ...bloqueados.map((b) => b.quartoId),
  ]);

  return quartos.filter((q) => !indisponiveis.has(q.id));
}

/**
 * Calcula preço de reserva a partir da tarifa e datas.
 */
export function calcularPreco(
  tarifa: { precoBase: any; precoFimSemana: any; adultosInclusos: number; precoAdultoExtra: any; precoCriancaExtra: any },
  dataCheckin: Date,
  dataCheckout: Date,
  adultos: number,
  criancas: number
) {
  const noites = Math.max(1, Math.round((dataCheckout.getTime() - dataCheckin.getTime()) / 86400000));
  const base = Number(tarifa.precoBase);
  const fimSemana = tarifa.precoFimSemana ? Number(tarifa.precoFimSemana) : base;

  let totalDiarias = 0;
  for (let i = 0; i < noites; i++) {
    const d = new Date(dataCheckin.getTime() + i * 86400000);
    const dow = d.getDay();
    totalDiarias += dow === 5 || dow === 6 ? fimSemana : base;
  }

  const adultosExtras = Math.max(0, adultos - tarifa.adultosInclusos);
  const precoAdultoExtra = tarifa.precoAdultoExtra ? Number(tarifa.precoAdultoExtra) : 0;
  const precoCriancaExtra = tarifa.precoCriancaExtra ? Number(tarifa.precoCriancaExtra) : 0;
  const extras = adultosExtras * precoAdultoExtra * noites + criancas * precoCriancaExtra * noites;

  return { noites, totalDiarias, extras, total: totalDiarias + extras };
}

/**
 * Aplica política de cancelamento.
 */
export function aplicarPolitica(
  politica: { diasAntecedenciaGratis: number; percentualReembolsoApos: number; percentualNoShow: number } | null,
  dataCheckin: Date,
  valorPago: number
): { reembolso: number; retencao: number; motivo: string } {
  if (!politica) {
    return { reembolso: valorPago, retencao: 0, motivo: "Sem política — reembolso integral" };
  }
  const dias = Math.floor((dataCheckin.getTime() - Date.now()) / 86400000);
  if (dias >= politica.diasAntecedenciaGratis) {
    return { reembolso: valorPago, retencao: 0, motivo: `Cancelamento com ${dias} dias de antecedência — reembolso integral` };
  }
  const pct = politica.percentualReembolsoApos / 100;
  const reembolso = valorPago * pct;
  return {
    reembolso,
    retencao: valorPago - reembolso,
    motivo: `Cancelamento com ${dias} dias — reembolso de ${politica.percentualReembolsoApos}%`,
  };
}

export function gerarCodigoReserva(): string {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `PSD-${y}${m}-${rand}`;
}
