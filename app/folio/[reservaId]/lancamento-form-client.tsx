'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SETORES = [
  { value: 'frigobar', label: 'Frigobar' },
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'passeios', label: 'Passeios' },
  { value: 'outros', label: 'Outros' },
];

export default function LancamentoFormClient({ folioId }: { folioId: string }) {
  const router = useRouter();
  const [setor, setSetor] = useState('frigobar');
  const [descricao, setDescricao] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [valorUnitario, setValorUnitario] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/folios/${folioId}/lancamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setor,
          descricao,
          quantidade: parseInt(quantidade, 10) || 1,
          valorUnitario: Number(valorUnitario),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao lançar');
      setDescricao('');
      setQuantidade('1');
      setValorUnitario('');
      setMsg({ tipo: 'ok', texto: 'Lançamento registrado.' });
      router.refresh();
    } catch (err: any) {
      setMsg({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs text-fg-muted">
          Setor
          <select
            value={setor}
            onChange={(e) => setSetor(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
          >
            {SETORES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-fg-muted sm:col-span-2">
          Descrição
          <Input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex: Água mineral 500ml"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-fg-muted">
          Qtd
          <Input
            type="number"
            min={1}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />
        </label>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs text-fg-muted sm:col-span-2">
          Valor unitário (R$)
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={valorUnitario}
            onChange={(e) => setValorUnitario(e.target.value)}
            placeholder="0,00"
            required
          />
        </label>
        <div className="flex items-end sm:col-span-2">
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Lançando…' : 'Lançar consumo'}
          </Button>
        </div>
      </div>
      {msg && (
        <p className={`text-xs ${msg.tipo === 'ok' ? 'text-brand' : 'text-red-500'}`}>{msg.texto}</p>
      )}
    </form>
  );
}
