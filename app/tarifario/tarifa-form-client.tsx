'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Option = { id: string; nome: string };

export default function TarifaForm({
  unidadeId,
  tipos,
  temporadas,
}: {
  unidadeId?: string;
  tipos: Option[];
  temporadas: Option[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!unidadeId) return;
    setLoading(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      unidadeId,
      tipoDeQuartoId: fd.get('tipoDeQuartoId'),
      temporadaId: fd.get('temporadaId') || null,
      nome: fd.get('nome'),
      precoBase: Number(fd.get('precoBase')),
      precoFimSemana: fd.get('precoFimSemana') ? Number(fd.get('precoFimSemana')) : null,
      minimoNoites: Number(fd.get('minimoNoites') || 1),
      maximoNoites: fd.get('maximoNoites') ? Number(fd.get('maximoNoites')) : null,
    };
    const res = await fetch('/api/tarifas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setMsg(err.error || 'Falha ao criar tarifa.');
      return;
    }
    setMsg('Tarifa criada com sucesso.');
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <Card>
      <CardBody>
        <CardTitle className="mb-4">Nova tarifa</CardTitle>
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-muted">Nome</label>
            <Input name="nome" required placeholder="Ex: Alta temporada — Verão" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-muted">Tipo de quarto</label>
            <select name="tipoDeQuartoId" required className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg">
              <option value="">Selecione</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-muted">Temporada (opcional)</label>
            <select name="temporadaId" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg">
              <option value="">Sem temporada</option>
              {temporadas.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-muted">Preço base (R$)</label>
            <Input name="precoBase" type="number" step="0.01" required placeholder="0,00" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-muted">Preço fim de semana (R$)</label>
            <Input name="precoFimSemana" type="number" step="0.01" placeholder="0,00" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-muted">Mínimo de noites</label>
            <Input name="minimoNoites" type="number" min="1" defaultValue={1} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-muted">Máximo de noites</label>
            <Input name="maximoNoites" type="number" min="1" placeholder="Sem limite" />
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <Button variant="primary" size="md" type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Criar tarifa'}
            </Button>
            {msg && <span className="text-xs text-fg-muted">{msg}</span>}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
