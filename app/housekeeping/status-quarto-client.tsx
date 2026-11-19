'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody } from '@/components/ui/card';

const OPCOES = [
  { v: 'limpo', label: 'Limpo' },
  { v: 'sujo', label: 'Sujo' },
  { v: 'em_limpeza', label: 'Em limpeza' },
  { v: 'inspecao', label: 'Inspeção' },
  { v: 'manutencao', label: 'Manutenção' },
];

const COR: Record<string, string> = {
  limpo: 'bg-emerald-500/10 text-emerald-600',
  sujo: 'bg-amber-500/10 text-amber-600',
  em_limpeza: 'bg-sky-500/10 text-sky-600',
  inspecao: 'bg-violet-500/10 text-violet-600',
  manutencao: 'bg-rose-500/10 text-rose-600',
};

export function StatusQuartoClient({
  quartoId, numero, tipo, andar, statusAtual, atualizadoEm,
}: {
  quartoId: string; numero: string; tipo: string; andar: number | null;
  statusAtual: string; atualizadoEm: string | null;
}) {
  const [status, setStatus] = useState(statusAtual);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  async function atualizar(novo: string) {
    setErro(null);
    const prev = status;
    setStatus(novo);
    try {
      const res = await fetch(`/api/housekeeping/quartos/${quartoId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novo }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar');
      start(() => router.refresh());
    } catch (e: any) {
      setStatus(prev);
      setErro(e.message || 'Erro');
    }
  }

  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-fg">Quarto {numero}</p>
            <p className="text-xs text-fg-muted">
              {tipo}{andar != null ? ` · ${andar}º andar` : ''}
            </p>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COR[status] || 'bg-brand/10 text-brand'}`}>
            {OPCOES.find((o) => o.v === status)?.label || status}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {OPCOES.map((o) => (
            <button
              key={o.v}
              type="button"
              disabled={pending || o.v === status}
              onClick={() => atualizar(o.v)}
              className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-fg transition-all duration-150 hover:bg-white/5 disabled:opacity-40"
            >
              {o.label}
            </button>
          ))}
        </div>
        {atualizadoEm && (
          <p className="mt-2 text-[11px] text-fg-muted">
            Atualizado em {new Date(atualizadoEm).toLocaleString('pt-BR')}
          </p>
        )}
        {erro && <p className="mt-2 text-xs text-rose-600">{erro}</p>}
      </CardBody>
    </Card>
  );
}
