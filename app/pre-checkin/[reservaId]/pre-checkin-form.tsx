'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function PreCheckinForm({ reservaId }: { reservaId: string }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [telefone, setTelefone] = useState('');
  const [obs, setObs] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    setDrawing(true);
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    const ctx = c.getContext('2d')!;
    ctx.beginPath();
    ctx.moveTo(e.clientX - r.left, e.clientY - r.top);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    const ctx = c.getContext('2d')!;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';
    ctx.lineTo(e.clientX - r.left, e.clientY - r.top);
    ctx.stroke();
  }
  function end() { setDrawing(false); }
  function limpar() {
    const c = canvasRef.current!;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!docFile) { setErro('Anexe a foto do documento.'); return; }
    const c = canvasRef.current!;
    const assinatura = c.toDataURL('image/png');
    if (assinatura.length < 2000) { setErro('Assine no quadro antes de enviar.'); return; }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('documento', docFile);
      fd.append('assinatura', assinatura);
      fd.append('telefone', telefone);
      fd.append('observacoes', obs);
      const res = await fetch(`/api/reservas/${reservaId}/pre-checkin`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Falha ao enviar');
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardBody className="space-y-4">
          <CardTitle>Documento com foto</CardTitle>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-fg-muted file:mr-3 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm file:text-fg hover:file:bg-white/5"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input placeholder="Telefone / WhatsApp" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            <Input placeholder="Observações (opcional)" value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <CardTitle>Assinatura digital</CardTitle>
          <p className="text-xs text-fg-muted">Assine com o dedo (mobile) ou mouse (desktop).</p>
          <canvas
            ref={canvasRef}
            width={640}
            height={180}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            className="w-full touch-none rounded-md border border-border bg-surface"
          />
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={limpar}>Limpar</Button>
          </div>
        </CardBody>
      </Card>

      {erro && <p className="text-sm text-red-500">{erro}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>{loading ? 'Enviando…' : 'Concluir pré-check-in'}</Button>
      </div>
    </form>
  );
}
