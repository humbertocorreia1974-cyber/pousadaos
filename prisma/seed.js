const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

const senha = bcrypt.hashSync('Demo@1234', 10);

async function main() {
  const emails = ['admin@demo.app', 'recepcao@demo.app', 'gerente@demo.app', 'admin_rede@demo.app', 'jogador@demo.app'];
  const roles = ['recepcao', 'recepcao', 'gerente', 'admin_rede', 'user'];
  const users = [];
  for (let i = 0; i < emails.length; i++) {
    const u = await prisma.user.upsert({
      where: { email: emails[i] },
      update: { role: roles[i], passwordHash: senha },
      create: { email: emails[i], name: emails[i].split('@')[0], passwordHash: senha, role: roles[i], plan: 'pro', termsAcceptedAt: new Date() },
    });
    users.push(u);
  }
  const [admin, recepcao, gerente, adminRede, jogador] = users;

  const unidade = await prisma.unidade.upsert({
    where: { slug: 'pousada-demo' },
    update: {},
    create: { nome: 'Pousada Demo', slug: 'pousada-demo', endereco: 'Rua das Flores, 123', cidade: 'Campos do Jordão', estado: 'SP', cep: '12460-000', telefone: '(12) 3662-1000', email: 'contato@pousadademo.com.br' },
  });

  const comodidades = ['Wi-Fi', 'Ar-condicionado', 'TV', 'Frigobar', 'Cofre', 'Varanda'];
  for (const nome of comodidades) await prisma.comodidade.upsert({ where: { nome }, update: {}, create: { nome, categoria: 'quarto' } });

  const tipoStd = await prisma.tipoDeQuarto.upsert({
    where: { id: 'tipo-std-demo' },
    update: {},
    create: { id: 'tipo-std-demo', unidadeId: unidade.id, nome: 'Standard', descricao: 'Quarto aconchegante com vista para o jardim', capacidadeAdultos: 2, capacidadeCriancas: 1, camas: '1 cama casal', metragem: 22 },
  });
  const tipoLux = await prisma.tipoDeQuarto.upsert({
    where: { id: 'tipo-lux-demo' },
    update: {},
    create: { id: 'tipo-lux-demo', unidadeId: unidade.id, nome: 'Luxo', descricao: 'Suíte ampla com varanda e lareira', capacidadeAdultos: 3, capacidadeCriancas: 2, camas: '1 cama king + 1 solteiro', metragem: 35 },
  });

  const quartosData = [
    { numero: '101', andar: 1, tipoDeQuartoId: tipoStd.id }, { numero: '102', andar: 1, tipoDeQuartoId: tipoStd.id },
    { numero: '103', andar: 1, tipoDeQuartoId: tipoStd.id }, { numero: '201', andar: 2, tipoDeQuartoId: tipoLux.id },
    { numero: '202', andar: 2, tipoDeQuartoId: tipoLux.id }, { numero: '203', andar: 2, tipoDeQuartoId: tipoLux.id },
  ];
  const quartos = [];
  for (const q of quartosData) {
    const quarto = await prisma.quarto.upsert({
      where: { unidadeId_numero: { unidadeId: unidade.id, numero: q.numero } },
      update: {},
      create: { unidadeId: unidade.id, ...q },
    });
    quartos.push(quarto);
  }

  const temporada = await prisma.temporada.upsert({
    where: { id: 'temp-alta-demo' },
    update: {},
    create: { id: 'temp-alta-demo', unidadeId: unidade.id, nome: 'Alta Temporada', dataInicio: new Date('2026-12-20'), dataFim: new Date('2027-02-28'), prioridade: 10 },
  });

  const tarifaStd = await prisma.tarifa.upsert({
    where: { id: 'tarifa-std-demo' },
    update: {},
    create: { id: 'tarifa-std-demo', unidadeId: unidade.id, tipoDeQuartoId: tipoStd.id, temporadaId: temporada.id, nome: 'Standard Alta', precoBase: 380.00, precoFimSemana: 450.00, minimoNoites: 2, adultosInclusos: 2, precoAdultoExtra: 80.00, precoCriancaExtra: 40.00 },
  });
  const tarifaLux = await prisma.tarifa.upsert({
    where: { id: 'tarifa-lux-demo' },
    update: {},
    create: { id: 'tarifa-lux-demo', unidadeId: unidade.id, tipoDeQuartoId: tipoLux.id, temporadaId: temporada.id, nome: 'Luxo Alta', precoBase: 620.00, precoFimSemana: 720.00, minimoNoites: 2, adultosInclusos: 3, precoAdultoExtra: 100.00, precoCriancaExtra: 50.00 },
  });

  const politica = await prisma.politicaCancelamento.upsert({
    where: { id: 'pol-flex-demo' },
    update: {},
    create: { id: 'pol-flex-demo', unidadeId: unidade.id, nome: 'Flexível', descricao: 'Cancelamento grátis até 7 dias antes', diasAntecedenciaGratis: 7, percentualReembolsoApos: 50, percentualNoShow: 100 },
  });

  const hospedesData = [
    { nomeCompleto: 'Ana Beatriz Souza', cpf: '11111111111', email: 'ana.souza@email.com', telefone: '(11) 98888-1111', cidade: 'São Paulo', estado: 'SP' },
    { nomeCompleto: 'Carlos Eduardo Lima', cpf: '22222222222', email: 'carlos.lima@email.com', telefone: '(21) 97777-2222', cidade: 'Rio de Janeiro', estado: 'RJ' },
    { nomeCompleto: 'Fernanda Oliveira', cpf: '33333333333', email: 'fernanda.oliveira@email.com', telefone: '(31) 96666-3333', cidade: 'Belo Horizonte', estado: 'MG' },
    { nomeCompleto: 'Roberto Almeida', cpf: '44444444444', email: 'roberto.almeida@email.com', telefone: '(41) 95555-4444', cidade: 'Curitiba', estado: 'PR' },
    { nomeCompleto: 'Juliana Costa', cpf: '55555555555', email: 'juliana.costa@email.com', telefone: '(51) 94444-5555', cidade: 'Porto Alegre', estado: 'RS' },
  ];
  const hospedes = [];
  for (const h of hospedesData) {
    const hospede = await prisma.hospede.upsert({ where: { cpf: h.cpf }, update: {}, create: h });
    hospedes.push(hospede);
  }

  const nReservas = await prisma.reserva.count();
  if (nReservas === 0) {
    const hoje = new Date();
    const reservasData = [
      { codigo: 'RES-2026-001', hospedeId: hospedes[0].id, quartoId: quartos[0].id, tipoDeQuartoId: tipoStd.id, tarifaId: tarifaStd.id, dataCheckin: new Date(hoje.getTime() + 5 * 86400000), dataCheckout: new Date(hoje.getTime() + 8 * 86400000), noites: 3, status: 'confirmada', valorDiarias: 1140, valorTotal: 1140, valorPago: 570 },
      { codigo: 'RES-2026-002', hospedeId: hospedes[1].id, quartoId: quartos[3].id, tipoDeQuartoId: tipoLux.id, tarifaId: tarifaLux.id, dataCheckin: new Date(hoje.getTime() + 10 * 86400000), dataCheckout: new Date(hoje.getTime() + 14 * 86400000), noites: 4, status: 'confirmada', valorDiarias: 2480, valorTotal: 2480, valorPago: 1240 },
      { codigo: 'RES-2026-003', hospedeId: hospedes[2].id, quartoId: quartos[1].id, tipoDeQuartoId: tipoStd.id, tarifaId: tarifaStd.id, dataCheckin: new Date(hoje.getTime() - 2 * 86400000), dataCheckout: new Date(hoje.getTime() + 1 * 86400000), noites: 3, status: 'hospedado', valorDiarias: 1140, valorTotal: 1140, valorPago: 1140, checkinRealizadoEm: new Date(hoje.getTime() - 2 * 86400000) },
      { codigo: 'RES-2026-004', hospedeId: hospedes[3].id, quartoId: quartos[4].id, tipoDeQuartoId: tipoLux.id, tarifaId: tarifaLux.id, dataCheckin: new Date(hoje.getTime() - 10 * 86400000), dataCheckout: new Date(hoje.getTime() - 7 * 86400000), noites: 3, status: 'finalizada', valorDiarias: 1860, valorTotal: 1860, valorPago: 1860, checkinRealizadoEm: new Date(hoje.getTime() - 10 * 86400000), checkoutRealizadoEm: new Date(hoje.getTime() - 7 * 86400000) },
      { codigo: 'RES-2026-005', hospedeId: hospedes[4].id, quartoId: quartos[2].id, tipoDeQuartoId: tipoStd.id, tarifaId: tarifaStd.id, dataCheckin: new Date(hoje.getTime() + 20 * 86400000), dataCheckout: new Date(hoje.getTime() + 23 * 86400000), noites: 3, status: 'pre_reserva', valorDiarias: 1140, valorTotal: 1140, valorPago: 0 },
    ];
    for (const r of reservasData) {
      await prisma.reserva.create({ data: { ...r, unidadeId: unidade.id, politicaCancelamentoId: politica.id, criadaPorId: recepcao.id, adultos: 2, criancas: 0, canalOrigem: 'site' } });
    }
  }

  const nFolios = await prisma.folio.count();
  if (nFolios === 0) {
    const reservas = await prisma.reserva.findMany({ take: 3 });
    let i = 1;
    for (const r of reservas) {
      const folio = await prisma.folio.create({ data: { reservaId: r.id, numero: `FOL-${String(i).padStart(4, '0')}`, status: 'aberto', totalLancamentos: Number(r.valorTotal), totalPago: Number(r.valorPago), saldo: Number(r.valorTotal) - Number(r.valorPago) } });
      await prisma.folioLancamento.create({ data: { folioId: folio.id, setor: 'hospedagem', descricao: `Diárias - ${r.codigo}`, quantidade: r.noites, valorUnitario: Number(r.valorDiarias) / r.noites, valorTotal: Number(r.valorDiarias), lancadoPorId: recepcao.id } });
      if (Number(r.valorPago) > 0) await prisma.pagamento.create({ data: { reservaId: r.id, folioId: folio.id, valor: Number(r.valorPago), metodo: 'pix', status: 'pago', registradoPorId: recepcao.id, pagoEm: new Date() } });
      i++;
    }
  }

  const nStatus = await prisma.statusHousekeeping.count();
  if (nStatus === 0) {
    const statuses = ['limpo', 'sujo', 'limpo', 'em_limpeza', 'limpo', 'sujo'];
    for (let i = 0; i < quartos.length; i++) {
      await prisma.statusHousekeeping.create({ data: { quartoId: quartos[i].id, status: statuses[i], atualizadoPorId: gerente.id } });
    }
  }

  const nEscalas = await prisma.escalaCamareira.count();
  if (nEscalas === 0) {
    await prisma.escalaCamareira.create({ data: { unidadeId: unidade.id, camareiraId: gerente.id, data: new Date(), turno: 'manha', quartosAtribuidos: quartos.slice(0, 3).map(q => q.numero), observacoes: 'Priorizar quartos 101 e 102' } });
  }

  const nBloqueios = await prisma.bloqueioManutencao.count();
  if (nBloqueios === 0) {
    await prisma.bloqueioManutencao.create({ data: { unidadeId: unidade.id, quartoId: quartos[5].id, motivo: 'Manutenção do ar-condicionado', dataInicio: new Date(), dataFim: new Date(Date.now() + 3 * 86400000), criadoPorId: admin.id } });
  }

  const nNotif = await prisma.notification.count();
  if (nNotif === 0) {
    await prisma.notification.createMany({ data: [
      { userId: recepcao.id, titulo: 'Nova reserva', mensagem: 'Reserva RES-2026-001 confirmada', tipo: 'info', link: '/reservas' },
      { userId: gerente.id, titulo: 'Check-in pendente', mensagem: 'Hóspede Ana Beatriz aguarda check-in', tipo: 'warning' },
      { userId: adminRede.id, titulo: 'Relatório mensal', mensagem: 'Relatório de ocupação disponível', tipo: 'info' },
    ] });
  }

  const nAudit = await prisma.auditoriaCheckInOut.count();
  if (nAudit === 0) {
    const reservas = await prisma.reserva.findMany({ take: 2 });
    for (const r of reservas) {
      await prisma.auditoriaCheckInOut.create({ data: { reservaId: r.id, usuarioId: recepcao.id, acao: 'checkin', detalhes: { canal: 'recepcao' }, ipAddress: '192.168.0.10', userAgent: 'Mozilla/5.0' } });
    }
  }

  const nHist = await prisma.historicoHospede.count();
  if (nHist === 0) {
    for (const h of hospedes.slice(0, 3)) {
      await prisma.historicoHospede.create({ data: { hospedeId: h.id, tipo: 'estadia', descricao: `Hospedagem registrada para ${h.nomeCompleto}`, valorTotal: 1140.00 } });
    }
  }
}

main().then(()=>prisma.$disconnect()).catch(async(e)=>{console.error('[seed] ERRO:',e.message);await prisma.$disconnect();process.exit(1);});