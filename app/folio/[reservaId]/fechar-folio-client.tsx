'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const METODOS = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao_credito', label: 'Cartão de crédito' },
  { value: 'cartao_debito', label: 'Cartão de débito' },
  { value: 'pix', label: 'PIX' },
  { value: 'transferencia', label: 'Transferência' },
];

type Linha = { metodo: string; valor: string };

export default function FecharFolioClient({
  folioId,
  saldo,
}: {
  folioId: string;
  saldo: number;
}) {
  const router = useRouter();
  const [linhas, setLinhas] = useState<Linha[]>([{ metodo: 'dinheiro', valor: saldo.toFixed(2) }]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const totalInformado = linhas.reduce((acc, l) => acc + (Number(l.valor) || 0), 0);
  const restante = Number((saldo - totalInformado).toFixed(2));

  function atualizar(i: number, patch: Partial<Linha>) {
    setLinhas((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function adicionar() {
    setLinhas((prev) => [...prev, { metodo: 'pix', valor: '' }]);
  }
  function remover(i: number) {
    setLinhas((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (restante > 0.01) {
      setMsg({ tipo: 'erro', texto: `Faltam R$ ${restante.toFixed(2)} para cobrir o saldo.` });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/folios/${folioId}/fechar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pagamentos: linhas.map((l) => ({ metodo: l.metodo, valor: Number(l.valor) })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao fechar folio');
      setMsg({ tipo: 'ok', texto: 'Folio fechado. Recibo enviado por e-mail.' });
      router.refresh();
    } catch (err: any) {
      setMsg({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-2">
        {linhas.map((l, i) => (
          <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1 text-xs text-fg-muted">
              Forma de pagamento
              <select
                value={l.metodo}
                onChange={(e) => atualizar(i, { metodo: e.target.value })}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
              >
                {METODOS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex w-full flex-col gap-1 text-xs text-fg-muted sm:w-40">
              Valor (R$)
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={l.valor}
                onChange={(e) => atualizar(i, { valor: e.target.value })}
                required
              />
            </label>
            {linhas.length > 1 && (
              <button
                type="button"
                onClick={() => remover(i)}
                className="rounded-md border border-border px-3 py-2 text-xs text-fg-muted transition-colors duration-150 hover:bg-white/5"
              >
                Remover
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={adicionar}
          className="rounded-md border border-border px-3 py-2 text-xs text-fg-muted transition-colors duration-150 hover:bg-white/5"
        >
          + Adicionar forma
        </button>
        <span className="text-xs text-fg-muted">
          Total informado: <strong className="text-fg">R$ {totalInformado.toFixed(2)}</strong>
          {restante > 0.01 && (
            <>
              {' '}· Falta: <strong className="text-red-500">R$ {restante.toFixed(2)}</strong>
            </>
          )}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading || saldo <= 0}>
          {loading ? 'Fechando…' : 'Fechar conta e gerar recibo'}
        </Button>
        {saldo <= 0 && <span className="text-xs text-fg-muted">Nada a cobrar.</span>}
      </div>

      {msg && (
        <p className={`text-xs ${msg.tipo === 'ok' ? 'text-brand' : 'text-red-500'}`}>{msg.texto}</p>
      )}
    </form>
  );
}
