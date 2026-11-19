'use client';

import { useState } from 'react';
import { Card, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Unidade = { id: string; nome: string; cidade: string | null; estado: string | null };
type Tipo = { id: string; nome: string; unidadeId: string; capacidadeAdultos: number };

type QuartoLivre = {
  id: string;
  numero: string;
  andar: number | null;
  tipo: string;
  capacidade: number;
};

type Conflito = { quartoId: string; numero: string; motivo: string };

export function DisponibilidadeBusca({ unidades, tipos }: { unidades: Unidade[]; tipos: Tipo[] }) {
  const [unidadeId, setUnidadeId] = useState(unidades[0]?.id ?? '');
  const [tipoDeQuartoId, setTipoDeQuartoId] = useState('');
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [loading, setLoading] = useState(false);
  const [quartos, setQuartos] = useState<QuartoLivre[] | null>(null);
  const [conflitos, setConflitos] = useState<Conflito[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const tiposFiltrados = tipos.filter((t) => t.unidadeId === unidadeId);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setQuartos(null);
    setConflitos([]);
    if (!unidadeId || !checkin || !checkout) {
      setErro('Preencha unidade, check-in e check-out.');
      return;
    }
    if (new Date(checkout) <= new Date(checkin)) {
      setErro('Check-out deve ser depois do check-in.');
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ unidadeId, checkin, checkout });
      if (tipoDeQuartoId) params.set('tipoDeQuartoId', tipoDeQuartoId);
      const res = await fetch(`/api/disponibilidade?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Falha ao consultar disponibilidade');
      setQuartos(data.quartos ?? []);
      setConflitos(data.conflitos ?? []);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <CardTitle>Buscar disponibilidade</CardTitle>
          <form onSubmit={buscar} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs text-fg-muted">
              Unidade
              <select
                value={unidadeId}
                onChange={(e) => { setUnidadeId(e.target.value); setTipoDeQuartoId(''); }}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg"
              >
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>{u.nome}{u.cidade ? ` — ${u.cidade}` : ''}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-fg-muted">
              Tipo de quarto
              <select
                value={tipoDeQuartoId}
                onChange={(e) => setTipoDeQuartoId(e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg"
              >
                <option value="">Todos</option>
                {tiposFiltrados.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome} ({t.capacidadeAdultos} adultos)</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-fg-muted">
              Check-in
              <Input type="date" value={checkin} onChange={(e) => setCheckin(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-fg-muted">
              Check-out
              <Input type="date" value={checkout} onChange={(e) => setCheckout(e.target.value)} />
            </label>
            <div className="md:col-span-4 flex items-center justify-between">
              {erro ? <p className="text-sm text-red-500">{erro}</p> : <span />}
              <Button type="submit" disabled={loading}>{loading ? 'Consultando…' : 'Buscar quartos livres'}</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {conflitos.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-600">⚠ Alerta de overbooking</p>
          <p className="mt-1 text-xs text-fg-muted">Os quartos abaixo têm conflito no período selecionado e foram excluídos da lista:</p>
          <ul className="mt-2 space-y-1 text-xs text-fg">
            {conflitos.map((c) => (
              <li key={c.quartoId}>Quarto {c.numero} — {c.motivo}</li>
            ))}
          </ul>
        </div>
      )}

      {quartos !== null && (
        <Card>
          <CardBody>
            <CardTitle>{quartos.length} quarto(s) disponível(is)</CardTitle>
            {quartos.length === 0 ? (
              <p className="mt-3 text-sm text-fg-muted">
                Nenhum quarto livre nesse período. Ajuste as datas ou o tipo de quarto.
              </p>
            ) : (
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                    <th className="py-2">Quarto</th>
                    <th className="py-2">Andar</th>
                    <th className="py-2">Tipo</th>
                    <th className="py-2">Capacidade</th>
                  </tr>
                </thead>
                <tbody>
                  {quartos.map((q) => (
                    <tr key={q.id} className="border-b border-border/60 transition-colors duration-150 hover:bg-white/5">
                      <td className="py-2 font-medium text-fg">{q.numero}</td>
                      <td className="py-2 text-fg-muted">{q.andar ?? '—'}</td>
                      <td className="py-2 text-fg-muted">{q.tipo}</td>
                      <td className="py-2 text-fg-muted">{q.capacidade} adultos</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
