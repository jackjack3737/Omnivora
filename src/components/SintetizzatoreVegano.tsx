'use client';

import { useState } from 'react';

type SintesiResponse = {
  nome_sintesi: string;
  vettori_target: { d: number; s: number; a: number; b: number; u: number; cg: number; melting: number; temp: number; k: number };
  ingredienti?: { nome: string; grammi: number }[];
  architettura: { componente: string; molecole: string[]; scopo: string }[];
  processo_termodinamico: string[];
};

export default function SintetizzatoreVegano() {
  const [piatto, setPiatto] = useState('');
  const [loading, setLoading] = useState(false);
  const [risultato, setRisultato] = useState<SintesiResponse | null>(null);
  const [errore, setErrore] = useState('');

  const handleSintesi = async () => {
    if (!piatto.trim()) return;
    setLoading(true);
    setErrore('');
    setRisultato(null);

    try {
      const res = await fetch('/api/sintetizzatore-vegano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ piatto_originale: piatto }),
      });
      if (!res.ok) throw new Error('Errore durante la sintesi molecolare');
      const data = await res.json();
      setRisultato(data);
    } catch (err: unknown) {
      setErrore(err instanceof Error ? err.message : 'Errore di connessione al Laboratorio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="border-b border-zinc-800 pb-4">
        <h1 className="text-3xl font-bold text-emerald-400 tracking-tight">Sintetizzatore Vegano</h1>
        <p className="text-zinc-500 text-sm mt-2 font-mono uppercase tracking-wider">Ingegneria Inversa Vettoriale / Plant-Based</p>
      </div>

      {/* INPUT AREA */}
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          value={piatto}
          onChange={(e) => setPiatto(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSintesi()}
          placeholder="Es. Foie Gras, Carbonara, Mozzarella di Bufala..."
          className="flex-1 bg-zinc-900 border border-zinc-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
        />
        <button
          onClick={handleSintesi}
          disabled={loading || !piatto.trim()}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-wider text-sm min-h-[44px]"
        >
          {loading ? 'Sintetizzo...' : 'Esegui'}
        </button>
      </div>

      {errore && (
        <div className="p-4 bg-red-900/20 border border-red-900 text-red-400 rounded-lg text-sm font-mono">
          [ERRORE DI SISTEMA]: {errore}
        </div>
      )}

      {/* LOADING STATE */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-12 h-12 border-4 border-zinc-800 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-emerald-500 font-mono text-sm animate-pulse">Destrutturazione vettoriale in corso...</p>
        </div>
      )}

      {/* RISULTATO SINTESI */}
      {risultato && !loading && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Titolo e Vettori Target */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">{risultato.nome_sintesi}</h2>
            <div className="flex flex-wrap gap-3 font-mono text-xs">
              {Object.entries(risultato.vettori_target).map(([key, val]) => (
                <div key={key} className="bg-black border border-zinc-700 px-3 py-1.5 rounded text-zinc-400">
                  <span className="text-emerald-400 font-bold uppercase mr-2">{key}:</span>
                  {typeof val === 'number' ? val.toFixed(1) : String(val)}
                </div>
              ))}
            </div>
          </div>

          {/* Architettura (Ingredienti / Struttura) */}
          <div>
            <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
              <span className="text-emerald-500">■</span> Architettura Strutturale
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {risultato.architettura?.map((arc, idx) => (
                <div key={idx} className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-lg">
                  <h4 className="font-bold text-emerald-400 mb-3 uppercase tracking-wide text-xs">{arc.componente}</h4>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {arc.molecole?.map((mol, i) => (
                      <span key={i} className="bg-zinc-800 text-zinc-300 text-[10px] px-2 py-1 rounded-sm uppercase tracking-wider">
                        {mol}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">{arc.scopo}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Lista ingredienti con grammi (prima della ricetta) */}
          {risultato.ingredienti && risultato.ingredienti.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
                <span className="text-amber-400">▸</span> Lista della spesa — tutti gli ingredienti con i grammi
              </h3>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <ul className="space-y-3">
                  {risultato.ingredienti.map((ing, idx) => (
                    <li key={idx} className="flex justify-between items-baseline gap-4 py-1 border-b border-zinc-800 last:border-0">
                      <span className="text-zinc-200">{ing.nome}</span>
                      <span className="font-mono font-semibold text-emerald-400 tabular-nums">{ing.grammi} g</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-zinc-500 mt-4">Pesa tutto prima di iniziare la ricetta.</p>
              </div>
            </div>
          )}

          {/* Processo Termodinamico (Ricetta) */}
          <div>
            <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
              <span className="text-blue-500">▶</span> Processo Termodinamico
            </h3>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <ol className="space-y-4">
                {risultato.processo_termodinamico?.map((step, idx) => (
                  <li key={idx} className="flex gap-4">
                    <span className="text-zinc-600 font-mono font-bold">{String(idx + 1).padStart(2, '0')}</span>
                    <p className="text-zinc-300 text-sm leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
