 'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  type TasteVector11,
  type IBSResult,
  type CookingTechniqueId,
  TECNICHE_COTTURA_BASE,
  applyCookingTechniqueVector,
  calcolaIBS,
} from '@/lib/indicatori';
import { TasteEngineRadar11 } from '@/components/TasteEngineRadar11';

type IngredientRow = {
  id: string;
  nome: string;
} & TasteVector11;

export default function TasteEnginePage() {
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [technique, setTechnique] = useState<CookingTechniqueId>('crudo');

  const selectedIngredient = useMemo(
    () => ingredients.find((i) => i.id === selectedId) ?? ingredients[0] ?? null,
    [ingredients, selectedId]
  );

  const baseVector: TasteVector11 | null = selectedIngredient
    ? {
        v_sapidita_u: selectedIngredient.v_sapidita_u,
        v_salinita_s: selectedIngredient.v_salinita_s,
        v_acidita_a: selectedIngredient.v_acidita_a,
        v_amarezza_b: selectedIngredient.v_amarezza_b,
        v_dolcezza_d: selectedIngredient.v_dolcezza_d,
        indice_grasso_texture: selectedIngredient.indice_grasso_texture,
        croccantezza_suono: selectedIngredient.croccantezza_suono,
        succulenza_umidita: selectedIngredient.succulenza_umidita,
        v_kokumi_k: selectedIngredient.v_kokumi_k,
        v_amilaceo_amil: selectedIngredient.v_amilaceo_amil,
        v_calcio_ca: selectedIngredient.v_calcio_ca,
      }
    : null;

  const cookedVector: TasteVector11 | null =
    baseVector != null ? applyCookingTechniqueVector(baseVector, technique) : null;

  const ibs: IBSResult | null = cookedVector != null ? calcolaIBS(cookedVector) : null;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('ingredienti_unificati')
        .select(
          'id, nome, v_sapidita_u, v_salinita_s, v_acidita_a, v_amarezza_b, v_dolcezza_d, indice_grasso_texture, croccantezza_suono, succulenza_umidita, v_kokumi_k, v_amilaceo_amil, v_calcio_ca'
        )
        .order('nome', { ascending: true })
        .limit(120);

      setLoading(false);
      if (error) {
        setError(
          error.message ||
            'Errore nel caricare ingredienti_unificati. Verifica la tabella in Supabase.'
        );
        setIngredients([]);
        return;
      }

      const rows = (data ?? []) as IngredientRow[];
      setIngredients(rows);
      if (rows.length > 0) setSelectedId(rows[0]!.id);
    };

    void load();
  }, []);

  const techniqueOptions = useMemo(
    () => Object.keys(TECNICHE_COTTURA_BASE) as CookingTechniqueId[],
    []
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] font-sans p-6 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <nav className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-[#fafafa] transition-colors"
          >
            ← Torna alla Home
          </Link>
          <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">
            The Taste Engine · IBS 2.0
          </span>
        </nav>

        <header className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-black text-[#22c55e] tracking-tight uppercase">
            Taste Engine
          </h1>
          <p className="text-zinc-500 mt-1 font-mono text-xs sm:text-sm">
            Motore di Neurogastronomia Computazionale — 11 vettori + trasformatori di cottura
          </p>
        </header>

        <section className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 sm:p-6 shadow-xl mb-6">
          <h2 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-widest">
            Selezione ingrediente e tecnica di cottura
          </h2>

          {loading ? (
            <p className="text-zinc-500 text-sm">Caricamento ingrediente_unificati da Supabase…</p>
          ) : error ? (
            <div className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
              <p className="font-semibold mb-1">Errore Supabase</p>
              <p>{error}</p>
              <p className="text-xs text-red-200/80 mt-2">
                Verifica che la tabella <code className="font-mono">ingredienti_unificati</code>{' '}
                esista e contenga le colonne vettoriali richieste (v_sapidita_u, v_salinita_s,
                v_acidita_a, v_amarezza_b, v_dolcezza_d, indice_grasso_texture,
                croccantezza_suono, succulenza_umidita, v_kokumi_k, v_amilaceo_amil, v_calcio_ca).
              </p>
            </div>
          ) : ingredients.length === 0 ? (
            <p className="text-zinc-500 text-sm">
              Nessun ingrediente trovato in{' '}
              <code className="font-mono">ingredienti_unificati</code>. Inserisci qualche riga in
              Supabase per testare il motore.
            </p>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-widest">
                  Ingrediente (DNA statico)
                </label>
                <select
                  value={selectedIngredient?.id ?? ''}
                  onChange={(e) => setSelectedId(e.target.value || null)}
                  className="w-full bg-[#020617] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-[#fafafa] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-60">
                <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-widest">
                  Tecnica di cottura (trasformatore)
                </label>
                <select
                  value={technique}
                  onChange={(e) => setTechnique(e.target.value as CookingTechniqueId)}
                  className="w-full bg-[#020617] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-[#fafafa] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  {techniqueOptions.map((id) => (
                    <option key={id} value={id}>
                      {id || '—'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 sm:p-6 shadow-xl">
            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">
                  IBS 2.0 — Indice di Beatitudine Sensoriale
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Calcolato su vettore 11D dopo applicazione della tecnica di cottura selezionata.
                </p>
              </div>
            </div>

            {cookedVector && ibs ? (
              <div className="flex flex-col sm:flex-row gap-6 items-stretch">
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                  <div className="relative w-40 h-40 rounded-full border-[10px] border-[#22c55e]/60 flex items-center justify-center">
                    <span className="text-3xl font-black text-[#22c55e] tabular-nums">
                      {ibs.ibsPercent.toFixed(1)}
                    </span>
                    <span className="absolute bottom-4 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                      IBS %
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 font-mono">
                    Segnale netto: <span className="text-zinc-200">{ibs.ibsRaw.toFixed(1)}</span> ·{' '}
                    <span className="text-zinc-400">Sigmoide → IBS %</span>
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] w-full max-w-xs">
                    <MetricPill label="Segnale grezzo" value={ibs.components.drive} />
                    <MetricPill label="Clearance (SSS)" value={ibs.components.contrasto * 100} />
                    <MetricPill label="Segnale netto" value={ibs.components.reset} />
                  </div>
                </div>

                <div className="flex-1 border border-zinc-800 rounded-lg bg-[#020617] p-3 text-xs text-zinc-300">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">
                    IBS 4.0 — Sigmoide neurale
                  </p>
                  <ul className="space-y-1 leading-relaxed">
                    <li>
                      <span className="text-emerald-400 font-semibold">Segnale grezzo:</span>{' '}
                      (U×S + D×Amil)/100 + G×(1+K/100); spinta dopaminergica base.
                    </li>
                    <li>
                      <span className="text-emerald-400 font-semibold">Clearance (SSS):</span>{' '}
                      burden (G + eccesso D&gt;50) vs cleansers (A+Am+Ca); moltiplicatore 0.3–1.0.
                    </li>
                    <li>
                      <span className="text-emerald-400 font-semibold">Sigmoide:</span>{' '}
                      IBS = 100 / (1 + exp(−0.035×(netSignal−60))); nessun overflow a 100.
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-zinc-500 text-sm">
                Seleziona un ingrediente e una tecnica di cottura per calcolare l&apos;IBS 4.0.
              </p>
            )}
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 sm:p-6 shadow-xl">
            {cookedVector && selectedIngredient ? (
              <TasteEngineRadar11
                vector={cookedVector}
                title={`${selectedIngredient.nome} · ${technique || 'crudo'}`}
              />
            ) : (
              <p className="text-zinc-500 text-sm">
                Il radar 11D mostrerà la trasformazione del DNA sensoriale dopo la tecnica scelta.
              </p>
            )}
          </div>
        </section>

        {baseVector && cookedVector && (
          <section className="mt-6 bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 sm:p-6 shadow-xl">
            <h2 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-widest">
              Confronto vettori 0–100 — Crudo vs Dopo Cottura
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500">
                    <th className="text-left py-1 pr-4">Asse</th>
                    <th className="text-right py-1 px-2">Crudo</th>
                    <th className="text-right py-1 px-2">Cotto</th>
                    <th className="text-right py-1 px-2">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {VECTOR_ROWS.map((row) => {
                    const raw = baseVector[row.key];
                    const cooked = cookedVector[row.key];
                    const delta = cooked - raw;
                    return (
                      <tr key={row.key} className="border-b border-zinc-900">
                        <td className="py-1 pr-4 text-zinc-300">{row.label}</td>
                        <td className="py-1 px-2 text-right text-zinc-400 tabular-nums">
                          {raw.toFixed(0)}
                        </td>
                        <td className="py-1 px-2 text-right text-zinc-100 tabular-nums">
                          {cooked.toFixed(0)}
                        </td>
                        <td
                          className={
                            'py-1 px-2 text-right tabular-nums ' +
                            (delta > 0.5
                              ? 'text-emerald-400'
                              : delta < -0.5
                                ? 'text-red-400'
                                : 'text-zinc-500')
                          }
                        >
                          {delta >= 0 ? '+' : ''}
                          {delta.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

const VECTOR_ROWS: { key: keyof TasteVector11; label: string }[] = [
  { key: 'v_sapidita_u', label: 'Umami (v_sapidita_u)' },
  { key: 'v_salinita_s', label: 'Salato (v_salinita_s)' },
  { key: 'v_acidita_a', label: 'Acido (v_acidita_a)' },
  { key: 'v_amarezza_b', label: 'Amaro (v_amarezza_b)' },
  { key: 'v_dolcezza_d', label: 'Dolce (v_dolcezza_d)' },
  { key: 'indice_grasso_texture', label: 'Grasso / Texture' },
  { key: 'croccantezza_suono', label: 'Croccantezza / Suono' },
  { key: 'succulenza_umidita', label: 'Succulenza / Umidità' },
  { key: 'v_kokumi_k', label: 'Kokumi (profondità)' },
  { key: 'v_amilaceo_amil', label: 'Amilaceo / Amido' },
  { key: 'v_calcio_ca', label: 'Calcio / Astringenza' },
];

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-zinc-800 bg-zinc-900/70 px-2 py-1.5">
      <span className="text-[9px] uppercase tracking-widest text-zinc-500 truncate">
        {label}
      </span>
      <span className="text-xs font-semibold text-[#fafafa] tabular-nums">
        {value.toFixed(2)}
      </span>
    </div>
  );
}

