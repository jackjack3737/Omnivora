'use client';

import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { supabase } from '@/lib/supabase';

type IbsInput = {
  U: number;
  S: number;
  K: number;
  G: number;
  A: number;
  Am: number;
  D: number;
  Amil: number;
  Cr: number;
  W: number;
  Ca: number;
};

type IbsDashboardProps = {
  title?: string;
  input?: IbsInput;
};

/** Colonna DB ingredienti_unificati -> IbsInput: vettori statici, stessi valori ogni volta. */
const IBS_SELECT =
  'id, nome, v_sapidita_u, v_salinita_s, v_acidita_a, v_amarezza_b, v_dolcezza_d, indice_grasso_texture, croccantezza_suono, succulenza_umidita, v_kokumi_k, v_amilaceo_amil, v_calcio_ca';

function clamp(v: number, min = 0, max = 100): number {
  if (Number.isNaN(v)) return min;
  return Math.min(max, Math.max(min, v));
}

function toNum(x: unknown): number {
  if (typeof x === 'number' && !Number.isNaN(x)) return x;
  if (typeof x === 'string') return parseFloat(x) || 0;
  return 0;
}

/** Mappa una riga da ingredienti_unificati (vettori 0–100) a IbsInput. Valori identici al DB = IBS stabile. */
function dbRowToIbsInput(row: Record<string, unknown>): IbsInput {
  return {
    U: clamp(toNum(row.v_sapidita_u)),
    S: clamp(toNum(row.v_salinita_s)),
    K: clamp(toNum(row.v_kokumi_k)),
    G: clamp(toNum(row.indice_grasso_texture)),
    A: clamp(toNum(row.v_acidita_a)),
    Am: clamp(toNum(row.v_amarezza_b)),
    D: clamp(toNum(row.v_dolcezza_d)),
    Amil: clamp(toNum(row.v_amilaceo_amil)),
    Cr: clamp(toNum(row.croccantezza_suono)),
    W: clamp(toNum(row.succulenza_umidita)),
    Ca: clamp(toNum(row.v_calcio_ca)),
  };
}

const DEFAULT_IBS: IbsInput = {
  U: 70,
  S: 65,
  K: 30,
  G: 60,
  A: 35,
  Am: 25,
  D: 40,
  Amil: 55,
  Cr: 50,
  W: 60,
  Ca: 20,
};

export const IbsDashboard: React.FC<IbsDashboardProps> = ({
  title = 'Demo Piatto — IBS 2.0',
  input,
}) => {
  const [ciboDaAnalizzare, setCiboDaAnalizzare] = useState('');
  const [analisiResult, setAnalisiResult] = useState<IbsInput | null>(null);
  const [analisiSource, setAnalisiSource] = useState<'db' | 'gemini' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ibsInput: IbsInput = input ?? analisiResult ?? DEFAULT_IBS;

  const analizza = async () => {
    const testo = ciboDaAnalizzare.trim();
    if (!testo) {
      setError('Scrivi il cibo da analizzare.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      // 1) Fornello virtuale stabile: query diretta a Supabase. Stessi vettori = stesso IBS ogni volta.
      const { data: rows } = await supabase
        .from('ingredienti_unificati')
        .select(IBS_SELECT)
        .ilike('nome', `%${testo}%`)
        .limit(10);

      const list = (rows ?? []) as Record<string, unknown>[];
      const exact = list.find(
        (r) => (r.nome as string)?.toLowerCase() === testo.toLowerCase()
      );
      const row = exact ?? list[0];

      if (row) {
        setAnalisiResult(dbRowToIbsInput(row));
        setAnalisiSource('db');
        return;
      }

      // 2) Fallback: alimento/ricetta non in DB → stima vettori con Gemini (unica eccezione IA).
      const res = await fetch('/api/analizza-cibo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cibo: testo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Errore durante l’analisi');
        return;
      }
      setAnalisiResult({
        U: clamp(toNum(data.U)),
        S: clamp(toNum(data.S)),
        K: clamp(toNum(data.K)),
        G: clamp(toNum(data.G)),
        A: clamp(toNum(data.A)),
        Am: clamp(toNum(data.Am)),
        D: clamp(toNum(data.D)),
        Amil: clamp(toNum(data.Amil)),
        Cr: clamp(toNum(data.Cr)),
        W: clamp(toNum(data.W)),
        Ca: clamp(toNum(data.Ca)),
      });
      setAnalisiSource('gemini');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore di rete');
    } finally {
      setLoading(false);
    }
  };

  const {
    ibsFinal,
    rawSignal,
    sssMultiplier,
    netSignal,
    metabolicWindow,
    fatiguePredictor,
    glycogenBurnRate,
    isStucchevole,
    burden,
    cleansers,
    stucchevolezza,
  } = useMemo(() => {
    const U = clamp(ibsInput.U);
    const S = clamp(ibsInput.S);
    const K = clamp(ibsInput.K);
    const G = clamp(ibsInput.G);
    const A = clamp(ibsInput.A);
    const Am = clamp(ibsInput.Am);
    const D = clamp(ibsInput.D);
    const Amil = clamp(ibsInput.Amil);
    const Ca = clamp(ibsInput.Ca);

    const rawSavory = (U * S) / 100;
    const rawComfort = (D * Amil) / 100;
    const rawFat = G * (1 + K / 100);
    const rawSignalVal = rawSavory + rawComfort + rawFat;

    const burdenVal = G + (D > 50 ? D - 50 : 0);
    const cleansersVal = A + Am + Ca;
    const stucchevolezzaVal = Math.max(0, burdenVal - cleansersVal);
    const sssMultiplierVal = Math.max(0.3, 1 - stucchevolezzaVal / 100);

    const glycogenBurnRateVal = D * 1.5 + Amil - G * 0.5;
    const fatiguePredictorVal = Math.max(
      0,
      glycogenBurnRateVal - U * 2
    );
    const metabolicWindowVal = Math.max(
      0.2,
      1 - fatiguePredictorVal / 150
    );

    const netSignalVal =
      rawSignalVal * sssMultiplierVal * metabolicWindowVal -
      fatiguePredictorVal / 3;
    const finalSignalVal = Math.max(0, netSignalVal);

    const midpoint = 60;
    const steepness = 0.035;
    const ibsFinalVal =
      100 / (1 + Math.exp(-steepness * (finalSignalVal - midpoint)));

    return {
      ibsFinal: clamp(ibsFinalVal, 0, 100),
      rawSignal: rawSignalVal,
      sssMultiplier: sssMultiplierVal,
      netSignal: finalSignalVal,
      metabolicWindow: metabolicWindowVal,
      fatiguePredictor: fatiguePredictorVal,
      glycogenBurnRate: glycogenBurnRateVal,
      isStucchevole: stucchevolezzaVal > 50,
      burden: burdenVal,
      cleansers: cleansersVal,
      stucchevolezza: stucchevolezzaVal,
    };
  }, [ibsInput]);

  const barsData = useMemo(
    () => [
      {
        name: 'Segnale grezzo',
        value: Math.min(100, rawSignal / 2.5),
        color: '#ef4444',
      },
      {
        name: 'Clearance (SSS)',
        value: sssMultiplier * 100,
        color: '#22c55e',
      },
      {
        name: 'Segnale netto',
        value: Math.min(100, netSignal / 2.5),
        color: '#3b82f6',
      },
    ],
    [rawSignal, sssMultiplier, netSignal]
  );

  const fatLevel = clamp(ibsInput.G);
  const cutLevel = clamp(ibsInput.A + ibsInput.Am);

  const fatWidthPct = fatLevel;
  const cutLeftPct = cutLevel;

  const gaugeColor =
    ibsFinal < 40 ? '#ef4444' : ibsFinal < 70 ? '#eab308' : '#22c55e';

  return (
    <section className="w-full bg-[#121212] text-[#f9fafb] rounded-2xl border border-zinc-800 p-4 sm:p-6 lg:p-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            IBS 4.0 — Motore neurogastronomico · Fornello Virtuale
            {analisiSource === 'db' && (
              <span className="ml-1 text-emerald-400">· Vettori da database</span>
            )}
            {analisiSource === 'gemini' && (
              <span className="ml-1 text-amber-400">· Stima IA</span>
            )}
          </p>
        </div>
        <div className="text-xs text-zinc-500 font-mono">
          Segnale netto: <span className="text-zinc-200">{netSignal.toFixed(1)}</span>
          {' · '}
          Burden/Cleansers: <span className="text-zinc-200">{burden.toFixed(0)}</span> / <span className="text-zinc-200">{cleansers.toFixed(0)}</span>
          {' · '}
          Stucchevolezza: <span className="text-zinc-200">{stucchevolezza.toFixed(0)}</span>
        </div>
      </header>

      <div className="space-y-2">
        <label htmlFor="cibo-analisi" className="block text-sm font-medium text-zinc-300">
          Cibo da analizzare
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="cibo-analisi"
            type="text"
            value={ciboDaAnalizzare}
            onChange={(e) => setCiboDaAnalizzare(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                analizza();
              }
            }}
            placeholder="es. Pasta al pesto, Insalata di quinoa, Tiramisù..."
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-[#f9fafb] placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            disabled={loading}
          />
          <button
            type="button"
            onClick={analizza}
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[#121212] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
          >
            {loading ? 'Analisi in corso…' : 'Analizza'}
          </button>
        </div>
        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-[6px] border-zinc-800 flex items-center justify-center bg-[#020617] shadow-inner">
                <span
                  className="text-2xl sm:text-3xl font-black tabular-nums"
                  style={{ color: gaugeColor }}
                >
                  {ibsFinal.toFixed(1)}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-widest text-zinc-500">
                  IBS 4.0 — Punteggio Finale
                </p>
                <p className="text-sm text-zinc-300">
                  0–100 · <span className="text-red-400">Basso</span>,{' '}
                  <span className="text-amber-300">Medio</span>,{' '}
                  <span className="text-emerald-400">Alto</span>
                </p>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-4 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-500 relative overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-zinc-900/80"
                  style={{ width: `${100 - ibsFinal}%` }}
                />
                <div
                  className="absolute -top-1 w-0.5 h-6 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                  style={{ left: `${ibsFinal}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#050816] border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-xs uppercase tracking-widest text-zinc-500">
              I 3 Pilastri IBS 4.0
            </p>
            <p className="text-[10px] text-zinc-500 font-mono">
              Segnale grezzo · Clearance · Segnale netto (scala 0–100)
            </p>
          </div>
          <div className="w-full h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={{ stroke: '#4b5563' }}
                  tickLine={{ stroke: '#4b5563' }}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  axisLine={{ stroke: '#4b5563' }}
                  tickLine={{ stroke: '#4b5563' }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(55,65,81,0.4)' }}
                  contentStyle={{
                    backgroundColor: '#020617',
                    border: '1px solid #4b5563',
                    borderRadius: '0.5rem',
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="value">
                  {barsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="text-[11px] text-zinc-400 space-y-1">
            <li>
              <span className="text-red-400 font-semibold">Segnale grezzo</span>: (U×S + D×Amil)/100 + G×(1+K/100); spinta dopaminergica base.
            </li>
            <li>
              <span className="text-emerald-400 font-semibold">Clearance (SSS)</span>:
              burden (G + eccesso D) vs cleansers (A+Am+Ca); moltiplicatore 0.3–1.0.
            </li>
            <li>
              <span className="text-blue-400 font-semibold">Segnale netto</span>: grezzo × clearance; input alla sigmoide (midpoint 60, steepness 0.035).
            </li>
          </ul>
        </div>

        <div className="bg-[#050816] border border-zinc-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-zinc-500">
              Hacker-Meter — Tensione Grasso vs Taglio
            </p>
            <p className="text-[10px] text-zinc-500 font-mono">
              G: {fatLevel.toFixed(0)} · A+Am: {cutLevel.toFixed(0)}
            </p>
          </div>

          <div className="space-y-2">
            <div className="relative h-8 rounded-full bg-[#1f2933] overflow-hidden border border-zinc-700">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-700 via-red-500 to-red-400"
                style={{ width: `${fatWidthPct}%` }}
              />
              <div
                className="absolute inset-y-0 w-0.5 bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.8)]"
                style={{ left: `${cutLeftPct}%` }}
              />
              <div
                className="absolute -top-5 text-[10px] text-emerald-300 font-mono"
                style={{ left: `${cutLeftPct}%`, transform: 'translateX(-50%)' }}
              >
                Taglio A+Am
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>Basso</span>
              <span>Medio</span>
              <span>Alto</span>
            </div>
          </div>

          <div className="mt-2">
            {isStucchevole ? (
              <div className="flex items-center gap-2 text-xs text-red-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span className="animate-pulse">
                  RISCHIO STUCCHEVOLE! Grasso fuori controllo.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Piatto bilanciato: il taglio acido/amaro segue il grasso.</span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-zinc-400 mt-2">
            Se il grasso (G) supera di oltre 30 punti la somma Acido+Amaro, il sistema segnala
            una tensione verso la stucchevolezza: il palato viene saturato prima che arrivi
            sollievo dal taglio.
          </p>
        </div>

        <div className="bg-[#050816] border border-zinc-800 rounded-xl p-4 space-y-2">
          <p className="text-xs uppercase tracking-widest text-zinc-500">
            Impatto Energetico
          </p>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold tabular-nums ${
                fatiguePredictor > 80
                  ? 'text-amber-400'
                  : fatiguePredictor > 40
                    ? 'text-yellow-500'
                    : 'text-zinc-300'
              }`}
            >
              {fatiguePredictor.toFixed(1)}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              Fatigue Predictor
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Alto zucchero/amido senza supporto umami (U) aumenta il previsore di crollo;
            la Finestra Metabolica ({metabolicWindow.toFixed(2)}) modula il segnale prima della sigmoide.
          </p>
        </div>
      </div>
    </section>
  );
};

