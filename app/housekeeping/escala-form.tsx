'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function EscalaForm({
  unidadeId, camareiras, quartos,
}: {
  unidadeId?: string;
  camareiras: { id: string; name: string }[];
  quartos: { id: string; numero: string }[];
}) {
  const [camareiraId, setCamareiraId] = useState('');
  const [turno, setTurno] = useState('manha');
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function toggle(id: string) {
    setSelecionados((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null); setMsg(null);
    if (!unidadeId || !camareiraId) { setErro('Selecione unidade e camareira.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/escalas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unidadeId, camareiraId, turno, quartosAtribuidos: selecionados }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao criar escala');
      setMsg('Escala criada.');
      setSelecionados([]);
      router.refresh();
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardTitle>Nova escala</CardTitle>
      <CardBody>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs text-fg-muted">Camareira</label>
            <select
              value={camareiraId}
              onChange={(e) => setCamareiraId(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg"
            >
              <option value="">Selecione…</option>
              {camareiras.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-fg-muted">Turno</label>
            <select
              value={turno}
              onChange={(e) => setTurno(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg"
            >
              <option value="manha">Manhã</option>
              <option value="tarde">Tarde</option>
              <option value="noite">Noite</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-fg-muted">Quartos atribuídos</label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {quartos.length === 0 && <p className="text-xs text-fg-muted">Sem quartos.</p>}
              {quartos.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => toggle(q.id)}
                  className={`rounded-md border px-2 py-1 text-xs transition-all duration-150 ${
                    selecionados.includes(q.id)
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-border bg-surface text-fg hover:bg-white/5'
                  }`}
                >
                  {q.numero}
                </button>
              ))}
            </div>
          </div>
          {erro && <p className="text-xs text-rose-600">{erro}</p>}
          {msg && <p className="text-xs text-emerald-600">{msg}</p>}
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? 'Salvando…' : 'Criar escala'}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
