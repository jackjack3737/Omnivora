'use client';

import { useState, useEffect } from 'react';
import type { ScanResult } from '@/lib/scan';
import { dettaglioCalcolo, piccolaAnalisi } from '@/lib/scan';

export function TypewriterText({ text, className }: { text: string; className?: string }) {
  const [visibleLength, setVisibleLength] = useState(0);
  useEffect(() => {
    if (visibleLength >= text.length) return;
    const t = setTimeout(() => setVisibleLength((l) => Math.min(l + 2, text.length)), 24);
    return () => clearTimeout(t);
  }, [text, visibleLength]);
  useEffect(() => setVisibleLength(0), [text]);
  return (
    <span className={className}>
      {text.slice(0, visibleLength)}
      {visibleLength < text.length && <span className="animate-pulse">|</span>}
    </span>
  );
}

export function LaboratoryReport01({
  result,
  distanzaMolecolare,
}: {
  result: ScanResult;
  distanzaMolecolare: number | null;
}) {
  const det = dettaglioCalcolo(result);
  const analisi = piccolaAnalisi(result, det);
  return (
    <div className="mt-8 rounded-xl border border-zinc-700 bg-[#0a0a0b] overflow-hidden" style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace' }}>
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/60">
        <span className="text-zinc-400 text-sm tracking-widest">LABORATORY_REPORT_01</span>
      </div>
      <div className="p-4 text-xs text-zinc-300 space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="inline-flex items-center gap-2 rounded border border-zinc-700 bg-zinc-900/80 px-3 py-1.5" title="Soddisfazione finale (0–100): quanto il laboratorio valuta il campione">
            <span className="text-zinc-500">Soddisfazione S</span>
            <span className="text-[#eab308] tabular-nums">{result.soddisfazione.toFixed(0)}</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded border border-zinc-700 bg-zinc-900/80 px-3 py-1.5" title="Magnitudo: intensità complessiva dei sapori (ideale ≈ 7,5)">
            <span className="text-zinc-500">Magnitudo M</span>
            <span className="text-[#eab308] tabular-nums">{det.M.toFixed(2)}</span>
          </div>
          {distanzaMolecolare !== null && (
            <div className="inline-flex items-center gap-2 rounded border border-zinc-700 bg-zinc-900/80 px-3 py-1.5" title="Distanza tra i profili (d,s,a,b,u) di due campioni">
              <span className="text-zinc-500">Distanza D</span>
              <span className="text-[#eab308] tabular-nums">{distanzaMolecolare.toFixed(4)}</span>
            </div>
          )}
          <div className="inline-flex items-center gap-2 rounded border border-zinc-700 bg-zinc-900/80 px-3 py-1.5" title="Decadimento del sapore nel tempo (k alto = cala in fretta)">
            <span className="text-zinc-500">Decadimento k</span>
            <span className="text-[#eab308] tabular-nums">{(result.k ?? 0.3).toFixed(2)}</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded border border-zinc-700 bg-zinc-900/80 px-3 py-1.5" title="Soddisfazione base prima di penalità/bonus">
            <span className="text-zinc-500">S base</span>
            <span className="text-[#eab308] tabular-nums">{det.S_base.toFixed(2)}</span>
          </div>
        </div>
        <div className="rounded border border-zinc-700 bg-zinc-900/60 p-3 space-y-2">
          <p className="text-zinc-500 font-semibold uppercase tracking-wider">Analisi (Protocollo Omnivora)</p>
          <p className="text-zinc-200">{analisi.profilo}</p>
          <p className="text-zinc-200">{analisi.magnitudo}</p>
          {det.contrappeso && <p className="text-amber-300">• Teorema del Contrappeso applicato (−40%): S base × 0,6</p>}
          {det.bonusMelting && <p className="text-amber-300">• Bonus melting: +15 alla soddisfazione</p>}
          {det.loopEdonico && <p className="text-amber-400 font-medium">• Loop edonico rilevato (M &gt; 8, k &gt; 0,5)</p>}
          {analisi.correzioni.length > 0 && (
            <ul className="list-disc list-inside text-zinc-300">
              {analisi.correzioni.map((c, j) => (
                <li key={j}>{c}</li>
              ))}
            </ul>
          )}
          <p className="text-[#e4e4e7] pt-1 border-t border-zinc-700">{analisi.sintesi}</p>
        </div>
        {result.analisi_molecolare ? (
          <div className="rounded border border-zinc-700 bg-black/40 p-3 text-zinc-200 leading-relaxed">
            <p className="text-zinc-500 text-[10px] uppercase mb-1">Analisi molecolare (Gemini)</p>
            <TypewriterText text={result.analisi_molecolare} />
          </div>
        ) : (
          <p className="text-zinc-500 italic">Analisi molecolare (Gemini) non disponibile per questo campione.</p>
        )}
      </div>
      <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/40 text-[10px] text-zinc-500 text-center">
        Analisi basata su Modelli Psicotecnici del Bliss Point — Protocollo Omnivora 2026
      </div>
    </div>
  );
}
