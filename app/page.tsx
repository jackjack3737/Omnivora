'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  calcolaFatigue,
  calcolaGlycogen,
  calcolaMAG,
  type VoceBiochimica,
} from '@/lib/biochimica';
import {
  type ScanResult,
  type CostaIndexItem,
  type OpzioneCorrezione,
  type SuggerimentoCottura,
  COSTA_INDEX_TABLE,
  COTTURA_LABELS,
  getEffectiveProfile,
  soddisfazioneAdulto,
  dettaglioCalcolo,
  piccolaAnalisi,
  distanzaMolecolare,
  virtualWeight,
  computePiattoFromResults,
  computeCorrectedFromResults,
  computeCostaIndex,
} from '@/lib/scan';
import { RadarChartPentagon } from '@/components/RadarChart';
import { LaboratoryReport01 } from '@/components/LaboratoryReport';
import { AddToCostaIndexButton } from '@/components/AddToCostaIndexButton';
import { itemColor, CostaIndexRadarMulti, CostaIndexSystemicChart } from '@/components/CostaIndexCharts';

type TabId = 'sintetizzatore' | 'ottimizzatore' | 'svuota-frigo' | 'radar-km0' | 'scan-detector' | 'costa-index';

type Microelementi = {
  ingrediente_id?: string;
  id?: string;
  temperatura_servizio_ideale?: number;
  freschezza_balsamica?: number;
  croccantezza_suono?: number;
  [key: string]: unknown;
};

type Ingrediente = {
  id: string;
  nome: string;
  proteine: number;
  carboidrati: number;
  grassi: number;
  temperatura_servizio_ideale?: number;
  freschezza_balsamica?: number;
  croccantezza_suono?: number;
  [key: string]: unknown;
};

type VocePiatto = {
  id: string;
  nome: string;
  grammi: number;
  proteine: number;
  carboidrati: number;
  grassi: number;
  temperatura_servizio_ideale: number;
  freschezza_balsamica: number;
  croccantezza_suono: number;
};

function toNum(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  return 0;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'scan-detector', label: 'Scan Detector' },
  { id: 'costa-index', label: 'Costa Index' },
  { id: 'ottimizzatore', label: 'Ottimizzatore Ricette' },
  { id: 'sintetizzatore', label: 'Sintetizzatore Vegano' },
  { id: 'svuota-frigo', label: 'Svuota Frigo' },
  { id: 'radar-km0', label: 'Radar Km 0' },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('ottimizzatore');

  const [query, setQuery] = useState('');
  const [risultati, setRisultati] = useState<Ingrediente[]>([]);
  const [searching, setSearching] = useState(false);
  const [piatto, setPiatto] = useState<VocePiatto[]>([]);
  const [descrizionePasto, setDescrizionePasto] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const cercaIngredienti = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    setMessage(null);

    const { data: dataIng, error: errIng } = await supabase
      .from('matrice_ingredienti')
      .select('*')
      .ilike('nome', `%${query.trim()}%`);

    if (errIng) {
      setSearching(false);
      setMessage({ type: 'err', text: errIng.message });
      setRisultati([]);
      return;
    }

    const ingredienti = (dataIng ?? []) as Ingrediente[];
    const ids = ingredienti.map((i) => i.id).filter(Boolean);

    if (ids.length === 0) {
      setRisultati(ingredienti);
      setSearching(false);
      return;
    }

    const { data: dataMicro } = await supabase
      .from('matrice_microelementi')
      .select('*')
      .in('ingrediente_id', ids);

    const microList = (dataMicro ?? []) as Microelementi[];
    const microByIngId: Record<string, Microelementi> = {};
    for (const m of microList) {
      const kid = (m.ingrediente_id ?? m.id) as string;
      if (kid) microByIngId[kid] = m;
    }

    const merged: Ingrediente[] = ingredienti.map((ing) => {
      const micro = microByIngId[ing.id];
      return {
        ...ing,
        temperatura_servizio_ideale:
          ing.temperatura_servizio_ideale ?? micro?.temperatura_servizio_ideale,
        freschezza_balsamica: ing.freschezza_balsamica ?? micro?.freschezza_balsamica,
        croccantezza_suono: ing.croccantezza_suono ?? micro?.croccantezza_suono,
      };
    });

    setRisultati(merged);
    setSearching(false);
  }, [query]);

  const aggiungiAlPiatto = (ing: Ingrediente, grammi: number) => {
    if (grammi <= 0) return;
    const factor = grammi / 100;
    setPiatto((prev) => [
      ...prev,
      {
        id: `${ing.id}-${Date.now()}`,
        nome: ing.nome,
        grammi,
        proteine: (ing.proteine ?? 0) * factor,
        carboidrati: (ing.carboidrati ?? 0) * factor,
        grassi: (ing.grassi ?? 0) * factor,
        temperatura_servizio_ideale: toNum(ing.temperatura_servizio_ideale),
        freschezza_balsamica: toNum(ing.freschezza_balsamica),
        croccantezza_suono: toNum(ing.croccantezza_suono),
      },
    ]);
  };

  const rimuoviDaPiatto = (id: string) => {
    setPiatto((prev) => prev.filter((v) => v.id !== id));
  };

  const totali = piatto.reduce(
    (acc, v) => ({
      proteine: acc.proteine + v.proteine,
      carboidrati: acc.carboidrati + v.carboidrati,
      grassi: acc.grassi + v.grassi,
    }),
    { proteine: 0, carboidrati: 0, grassi: 0 }
  );

  const vociBiochimiche: VoceBiochimica[] = piatto.map((v) => ({
    grammi: v.grammi,
    temperatura_servizio_ideale: v.temperatura_servizio_ideale,
    freschezza_balsamica: v.freschezza_balsamica,
    croccantezza_suono: v.croccantezza_suono,
  }));

  const MAG = calcolaMAG(vociBiochimiche);
  const sommaGrammi = piatto.reduce((s, v) => s + v.grammi, 0);
  const mediaPesata = (key: keyof VoceBiochimica) => {
    if (sommaGrammi === 0 || key === 'grammi') return 0;
    const sum = piatto.reduce((s, v) => s + v[key] * v.grammi, 0);
    return Math.round((sum / sommaGrammi) * 1000) / 1000;
  };

  const salvaPasto = async () => {
    setSaving(true);
    setMessage(null);

    const fatigue = calcolaFatigue({
      proteine_g: totali.proteine,
      carboidrati_g: totali.carboidrati,
      grassi_g: totali.grassi,
      temperatura_servizio_ideale: mediaPesata('temperatura_servizio_ideale'),
      freschezza_balsamica: mediaPesata('freschezza_balsamica'),
      croccantezza_suono: mediaPesata('croccantezza_suono'),
    });

    const glycogen = calcolaGlycogen({
      carboidrati_g: totali.carboidrati,
      proteine_g: totali.proteine,
      grassi_g: totali.grassi,
    });

    const dati_biochimici = {
      temperatura_servizio_ideale: mediaPesata('temperatura_servizio_ideale'),
      freschezza_balsamica: mediaPesata('freschezza_balsamica'),
      croccantezza_suono: mediaPesata('croccantezza_suono'),
      fatigue,
      glycogen,
      MAG,
      ingredienti: piatto.map((v) => ({
        nome: v.nome,
        grammi: v.grammi,
        proteine: v.proteine,
        carboidrati: v.carboidrati,
        grassi: v.grassi,
        temperatura_servizio_ideale: v.temperatura_servizio_ideale,
        freschezza_balsamica: v.freschezza_balsamica,
        croccantezza_suono: v.croccantezza_suono,
      })),
    };

    const { error } = await supabase.from('storico_pasti').insert({
      data_ora: new Date().toISOString(),
      descrizione: descrizionePasto.trim() || 'Pasto',
      proteine_totali: Math.round(totali.proteine * 10) / 10,
      carboidrati_totali: Math.round(totali.carboidrati * 10) / 10,
      grassi_totali: Math.round(totali.grassi * 10) / 10,
      dati_biochimici,
    });

    setSaving(false);
    if (error) {
      setMessage({ type: 'err', text: error.message });
    } else {
      setMessage({ type: 'ok', text: 'Pasto salvato nello storico.' });
      setPiatto([]);
      setDescrizionePasto('');
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] font-sans">
      <div className="max-w-4xl mx-auto p-6 sm:p-8">
        <h1 className="text-4xl font-black text-[#dc2626] mb-2 uppercase tracking-tighter">
          Omnivora
        </h1>
        <p className="text-zinc-500 mb-6 font-mono text-sm">Suite di Laboratorio</p>

        <nav
          className="flex flex-wrap gap-1 border-b border-zinc-800 mb-6"
          role="tablist"
        >
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-3 font-semibold text-sm transition-colors border-b-2 -mb-px ${
                activeTab === id
                  ? 'text-[#dc2626] border-[#dc2626] bg-zinc-900/50'
                  : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:border-zinc-700'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {activeTab === 'sintetizzatore' && <TabSintetizzatoreVegano />}
        {activeTab === 'ottimizzatore' && <TabOttimizzatoreRicette />}
        {activeTab === 'svuota-frigo' && <TabSvuotaFrigo />}
        {activeTab === 'radar-km0' && <TabRadarKm0 />}
        {activeTab === 'scan-detector' && <TabScanDetector />}
        {activeTab === 'costa-index' && <TabCostaIndex />}
      </div>
    </div>
  );
}

function TabSintetizzatoreVegano() {
  const [carneSelezionata, setCarneSelezionata] = useState('');
  const carni = ['Pollo', 'Manzo', 'Maiale', 'Agnello', 'Tacchino', 'Salsiccia'];

  return (
    <section className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 shadow-xl">
      <h2 className="text-xl font-bold text-[#fafafa] border-b border-zinc-800 pb-2 mb-4">
        Sintetizzatore Vegano
      </h2>
      <p className="text-zinc-500 text-sm mb-6">
        Scegli la carne da replicare con ingredienti vegetali. Combinazioni e analisi saranno disponibili qui.
      </p>
      <label className="block text-sm font-medium text-zinc-400 mb-2">
        Scegli la carne da replicare
      </label>
      <select
        value={carneSelezionata}
        onChange={(e) => setCarneSelezionata(e.target.value)}
        className="w-full max-w-xs bg-[#09090b] border border-zinc-800 rounded-lg p-3 text-[#fafafa] focus:border-[#dc2626] focus:ring-1 focus:ring-[#dc2626] outline-none"
      >
        <option value="">— Seleziona —</option>
        {carni.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      {carneSelezionata && (
        <p className="mt-4 text-zinc-400 text-sm">
          Replica di <span className="text-[#dc2626]">{carneSelezionata}</span> in arrivo.
        </p>
      )}
    </section>
  );
}

function TabSvuotaFrigo() {
  const [ingredienti, setIngredienti] = useState<string[]>(['', '', '']);

  const addField = () => setIngredienti((prev) => [...prev, '']);
  const removeField = (i: number) => setIngredienti((prev) => prev.filter((_, idx) => idx !== i));
  const updateField = (i: number, v: string) => {
    setIngredienti((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  };

  return (
    <section className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 shadow-xl">
      <h2 className="text-xl font-bold text-[#fafafa] border-b border-zinc-800 pb-2 mb-4">
        Svuota Frigo
      </h2>
      <p className="text-zinc-500 text-sm mb-6">
        Inserisci gli ingredienti che hai in frigo: ti suggeriremo ricette e combinazioni.
      </p>
      <div className="space-y-3">
        {ingredienti.map((val, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              placeholder={`Ingrediente ${i + 1}`}
              value={val}
              onChange={(e) => updateField(i, e.target.value)}
              className="flex-1 bg-[#09090b] border border-zinc-800 rounded-lg p-3 text-[#fafafa] placeholder-zinc-500 focus:border-[#dc2626] outline-none"
            />
            <button
              type="button"
              onClick={() => removeField(i)}
              className="text-zinc-500 hover:text-[#dc2626] px-2"
              aria-label="Rimuovi"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addField}
          className="text-sm text-[#dc2626] hover:underline"
        >
          + Aggiungi altro ingrediente
        </button>
      </div>
    </section>
  );
}

function TabRadarKm0() {
  return (
    <section className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 shadow-xl">
      <h2 className="text-xl font-bold text-[#fafafa] border-b border-zinc-800 pb-2 mb-4">
        Radar Km 0
      </h2>
      <p className="text-zinc-500 text-sm mb-6">
        Scopri produttori e ingredienti a chilometro zero vicino a te. Mappa e filtri in arrivo.
      </p>
      <div className="border border-dashed border-zinc-700 rounded-lg p-8 text-center text-zinc-500">
        <p className="font-mono text-sm">In arrivo</p>
        <p className="text-xs mt-2">Geolocalizzazione e filtri Km 0</p>
      </div>
    </section>
  );
}


function TabScanDetector() {
  const [alimento, setAlimento] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [legendaAperta, setLegendaAperta] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const radarResult = results.length === 0
    ? null
    : selectedIndex !== null && selectedIndex >= 0 && selectedIndex < results.length
      ? results[selectedIndex]
      : results[results.length - 1];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const marginX = 0.05;
      const marginY = 0.12;
      const chartW = w * (1 - 2 * marginX);
      const chartH = h * (1 - 2 * marginY);
      const left = w * marginX;
      const right = w * (1 - marginX);
      const top = h * marginY;
      const bottom = h * (1 - marginY);

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = Math.max(5, 6 * dpr);
      ctx.setLineDash([6 * dpr, 4 * dpr]);
      ctx.beginPath();
      for (let m = 0; m <= 12; m += 0.1) {
        const yVal = 100 * Math.exp(-Math.pow(m - 7.5, 2) / 4.5);
        const x = left + (m / 12) * chartW;
        const yy = bottom - (yVal / 100) * chartH;
        if (m === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(161, 161, 170, 0.4)';
      ctx.lineWidth = 1;
      ctx.font = `${10 * dpr}px sans-serif`;
      ctx.fillStyle = '#a1a1aa';

      for (let m = 0; m <= 12; m += 2) {
        const x = left + (m / 12) * chartW;
        ctx.beginPath();
        ctx.moveTo(x, bottom);
        ctx.lineTo(x, bottom + 6);
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(String(m), x, bottom + 8);
      }
      for (let v = 0; v <= 100; v += 25) {
        const yy = bottom - (v / 100) * chartH;
        ctx.beginPath();
        ctx.moveTo(left - 6, yy);
        ctx.lineTo(left, yy);
        ctx.stroke();
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(v), left - 8, yy);
      }

      ctx.fillStyle = '#a1a1aa';
      ctx.font = `${Math.round(11 * dpr)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('Magnitudo', (left + right) / 2, bottom + 20);

      ctx.save();
      ctx.translate(left - 28, (top + bottom) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Soddisfazione', 0, 0);
      ctx.restore();
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = alimento.trim();
    if (!trimmed) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alimento: trimmed }),
      });
      let data: {
        error?: string;
        d?: number;
        s?: number;
        a?: number;
        b?: number;
        u?: number;
        temp?: number;
        melting?: number;
        oscore?: number;
        k?: number;
        analisi_molecolare?: string;
      };
      try {
        data = await res.json();
      } catch {
        setError(res.status === 404 ? 'API /api/scan non trovata. Riavvia il server.' : `Errore ${res.status}`);
        return;
      }
      if (!res.ok) {
        setError(data.error || `Errore ${res.status}`);
        return;
      }
      const d = data.d ?? 0;
      const s = data.s ?? 0;
      const a = data.a ?? 0;
      const b = data.b ?? 0;
      const u = data.u ?? 0;
      const temp = data.temp ?? 20;
      const melting = data.melting ?? 0;
      const oscore = data.oscore ?? 1;
      const k = data.k ?? 0.3;
      const { S, M, loopEdonico } = soddisfazioneAdulto(d, s, a, b, u, temp, melting, oscore, k);
      const asseX = Math.min((M / 12) * 100, 100);
      const asseY = Math.min(100, S);
      const newResult: ScanResult = {
        alimento: trimmed,
        magnitudo: M,
        soddisfazione: asseY,
        asseX,
        asseY,
        d,
        s,
        a,
        b,
        u,
        loopEdonico,
        temp,
        melting,
        k,
        analisi_molecolare: data.analisi_molecolare ?? undefined,
      };
      setResults((prev) => [...prev, newResult]);
      setSelectedIndex(null);
    } catch {
      setError('Errore di connessione');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 shadow-xl">
      <h2 className="text-xl font-bold text-[#fafafa] border-b border-zinc-800 pb-2 mb-4">
        Scan Detector
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 mb-6">
        <input
          type="text"
          placeholder="Nome alimento..."
          value={alimento}
          onChange={(e) => setAlimento(e.target.value)}
          disabled={isLoading}
          className="flex-1 min-w-0 bg-[#09090b] border border-zinc-800 rounded-lg p-3 text-[#fafafa] placeholder-zinc-500 focus:border-[#dc2626] outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="bg-[#dc2626] hover:bg-red-700 text-white font-semibold px-4 rounded-lg transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Analisi neurale in corso...' : 'Analizza'}
        </button>
        <button
          type="button"
          onClick={() => { setResults([]); setSelectedIndex(null); }}
          className="bg-zinc-700 hover:bg-zinc-600 text-white font-medium px-3 py-2 rounded-lg transition-colors text-sm"
        >
          Pulisci Grafico
        </button>
      </form>
      {error && (
        <p className="text-[#dc2626] text-sm mb-4">{error}</p>
      )}
      {results.length > 0 && (
        <div className="space-y-4 mb-6">
          {results.map((r, i) => {
            const det = dettaglioCalcolo(r);
            const analisi = piccolaAnalisi(r, det);
            return (
              <div key={`res-${i}`} className="bg-[#09090b] border border-zinc-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-zinc-500 mb-2">{r.alimento}</h3>
                <p className="text-[#fafafa]"><span className="text-zinc-500">Sapori:</span> dolce {r.d.toFixed(1)}, salato {r.s.toFixed(1)}, acido {r.a.toFixed(1)}, amaro {r.b.toFixed(1)}, umami {r.u.toFixed(1)} · <span className="text-zinc-500">Magnitudo M</span> = {det.M.toFixed(2)} · <span className="text-zinc-500">Soddisfazione S</span> = {r.soddisfazione.toFixed(0)}/100</p>
                <div className="mt-3 pt-3 border-t border-zinc-800 text-xs text-zinc-400 space-y-2">
                  <p className="font-medium text-zinc-500">Analisi</p>
                  <p>{analisi.profilo}</p>
                  <p>{analisi.magnitudo}</p>
                  {analisi.correzioni.length > 0 && (
                    <ul className="list-disc list-inside space-y-1">
                      {analisi.correzioni.map((c, j) => (
                        <li key={j}>{c}</li>
                      ))}
                    </ul>
                  )}
                  <p className="text-[#e4e4e7]">{analisi.sintesi}</p>
                </div>
                {i === results.length - 1 && results.length >= 2 && (
                  <p className="text-[#fafafa] mt-2 text-sm">
                    <span className="text-zinc-500">Distanza molecolare rispetto al precedente:</span>{' '}
                    {distanzaMolecolare(results[i - 1], r).toFixed(3)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0" style={{ paddingLeft: 28, paddingBottom: 28 }}>
          <div
            className="relative w-full rounded-xl overflow-hidden"
            style={{
              height: 260,
              backgroundColor: '#000000',
              border: '1px solid #52525b',
            }}
          >
            <canvas
              ref={canvasRef}
              className="block w-full h-full"
              style={{ width: '100%', height: 260, position: 'relative', zIndex: 5 }}
              aria-label="Curva di Gauss"
            />
            {results.map((r, i) => {
              const leftPct = 5 + (r.asseX / 100) * 90;
              const bottomPct = 12 + (r.asseY / 100) * 76;
              const inRedZone = r.magnitudo > 8;
              const hackedTexture = r.melting > 4;
              const hackedTemp = r.temp < 6;
              return (
                <button
                  type="button"
                  key={`${r.alimento}-${i}`}
                  onClick={() => setSelectedIndex(i)}
                  style={{
                    position: 'absolute',
                    left: `${leftPct}%`,
                    bottom: `${bottomPct}%`,
                    transform: 'translate(-50%, 50%)',
                    zIndex: 20,
                    padding: 0,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                  aria-label={`Seleziona ${r.alimento} nel radar`}
                >
                  <div
                    className={inRedZone ? 'scan-detector-red-aura' : ''}
                    style={{
                      width: 16,
                      height: 16,
                      backgroundColor: selectedIndex === i ? '#f97316' : '#dc2626',
                      borderRadius: '50%',
                      boxShadow: inRedZone ? undefined : (selectedIndex === i ? '0 0 14px #f97316' : '0 0 12px rgba(220,38,38,0.8)'),
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      left: '50%',
                      bottom: '100%',
                      transform: 'translateX(-50%)',
                      marginBottom: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#ffffff',
                      textShadow: '0 0 4px #000, 0 1px 2px #000',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                    }}
                  >
                    {r.alimento}
                  </span>
                  {(hackedTexture || hackedTemp) && (
                    <span
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '100%',
                        transform: 'translateX(-50%)',
                        marginTop: 4,
                        fontSize: 9,
                        fontWeight: 600,
                        color: '#fbbf24',
                        textShadow: '0 0 2px #000',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                      }}
                    >
                      {hackedTexture && hackedTemp ? 'HACKED BY TEXTURE + TEMPERATURE' : hackedTexture ? 'HACKED BY TEXTURE' : 'HACKED BY TEMPERATURE'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900/80 overflow-hidden">
            <button
              type="button"
              onClick={() => setLegendaAperta((v) => !v)}
              className="w-full p-4 text-left flex items-center justify-between text-[#fafafa] font-semibold hover:bg-zinc-800/50 transition-colors"
            >
              Legenda
              <span className="text-zinc-500 text-sm font-normal">{legendaAperta ? 'Nascondi legenda' : 'Mostra legenda'}</span>
            </button>
            {legendaAperta && (
              <div className="px-4 pb-4 pt-0" style={{ fontSize: 12, color: '#d4d4d8' }}>
                <ul className="space-y-2 list-none mb-4">
                  <li>
                    <strong className="text-[#eab308]">Curva gialla:</strong> curva di Gauss teorica della soddisfazione in funzione della magnitudo (picco intorno a M ≈ 7,5).
                  </li>
                  <li>
                    <strong className="text-[#fafafa]">Magnitudo (asse X, 0–12):</strong> modulo del vettore sapore, cioè M = √(d² + s² + a² + b² + u²). Misura l’intensità complessiva dei cinque sapori (dolce, salato, acido, amaro, umami) su scala 0–5 ciascuno. Più M è alto, più il profilo è “carico”.
                  </li>
                  <li>
                    <strong className="text-[#fafafa]">Soddisfazione (asse Y, 0–100):</strong> indice calcolato dalla formula adulto: parte da 100·e^(-(M-7,5)²/4,5) e viene poi corretta da penalità (es. Teorema del Contrappeso −40% se stucchevole) e bonus (es. melting &gt; 4). Non è il “quanto piace” grezzo, ma la soddisfazione corretta per il laboratorio.
                  </li>
                </ul>
                <p>
                  <strong className="text-[#fafafa]">Perché alcuni prodotti risultano così in basso pur piacendo?</strong>{' '}
                  Piacciono per <em>texture</em> (melting) e temperatura, non per equilibrio dei sapori. La formula applica il <strong>Teorema del Contrappeso</strong>: quando dolce/salato/umami dominano e acido+amaro sono bassi, la soddisfazione viene penalizzata del 40% (effetto “stucchevole”). L’ordinata non misura il picco di piacere momentaneo, ma la soddisfazione corretta da queste regole: quindi un prodotto che “attacca” con texture e temperatura può piacere molto e finire comunque in basso sul grafico.
                </p>
              </div>
            )}
          </div>
        </div>

        <div
          className="flex-shrink-0 w-full lg:w-80 rounded-xl overflow-hidden flex flex-col items-center justify-center"
          style={{
            minHeight: 260,
            backgroundColor: '#000000',
            border: '1px solid #52525b',
          }}
        >
          {radarResult ? (
            <>
              <RadarChartPentagon
                d={radarResult.d}
                s={radarResult.s}
                a={radarResult.a}
                b={radarResult.b}
                u={radarResult.u}
                alimento={radarResult.alimento}
              />
              {radarResult.loopEdonico && (
                <p className="text-amber-400 text-xs font-medium mt-2 px-2 text-center">⚠️ LOOP EDONICO DETECTED</p>
              )}
              {radarResult.loopEdonico && (radarResult.melting > 4 || radarResult.temp < 6) && (
                <p className="text-zinc-400 text-xs mt-2 px-2 text-center italic">
                  Questo prodotto piace non per equilibrio, ma perché attiva il Loop Edonico tramite{' '}
                  {radarResult.melting > 4 && radarResult.temp < 6
                    ? 'Texture e Temperatura'
                    : radarResult.melting > 4
                      ? 'Texture'
                      : 'Temperatura'}
                  .
                </p>
              )}
            </>
          ) : (
            <p className="text-zinc-500 text-sm px-4 text-center">
              Analizza un alimento per vedere il Pentagono dei Sapori
            </p>
          )}
        </div>
      </div>

      {radarResult && (
        <>
          <div className="mt-4 flex justify-center">
            <AddToCostaIndexButton result={radarResult} />
          </div>
          <LaboratoryReport01
            result={radarResult}
            distanzaMolecolare={
              results.length >= 2
                ? distanzaMolecolare(results[results.length - 2], results[results.length - 1])
                : null
            }
          />
        </>
      )}
    </section>
  );
}

function TabCostaIndex() {
  const [items, setItems] = useState<CostaIndexItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [alimento, setAlimento] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [suggerimentiDb, setSuggerimentiDb] = useState<{ id: string; nome: string }[]>([]);
  const [suggerimentiOpen, setSuggerimentiOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggerimenti = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setSuggerimentiDb([]);
      return;
    }
    const { data } = await supabase
      .from('matrice_ingredienti')
      .select('id, nome')
      .ilike('nome', `%${trimmed}%`)
      .limit(20);
    setSuggerimentiDb((data ?? []).map((r: { id: string; nome: string }) => ({ id: r.id, nome: r.nome })));
    setSuggerimentiOpen(true);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!alimento.trim()) {
      setSuggerimentiDb([]);
      setSuggerimentiOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => { fetchSuggerimenti(alimento); }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [alimento, fetchSuggerimenti]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const { data, error } = await supabase
      .from(COSTA_INDEX_TABLE)
      .select('id, payload')
      .order('created_at', { ascending: true });
    if (error) {
      setItems([]);
      setFetchError(error.message || 'Errore caricamento Costa Index');
    } else {
      setItems((data ?? []).map((row: { id: string; payload: ScanResult }) => ({ id: row.id, ...row.payload })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleScanAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = alimento.trim();
    if (!trimmed) return;
    setScanLoading(true);
    setScanError(null);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alimento: trimmed }),
      });
      const rawText = await res.text();
      let data: {
        error?: string;
        d?: number; s?: number; a?: number; b?: number; u?: number;
        temp?: number; melting?: number; oscore?: number; k?: number;
        analisi_molecolare?: string;
      };
      try {
        data = rawText ? (JSON.parse(rawText) as typeof data) : {};
      } catch {
        setScanError(res.ok ? 'Risposta API non valida' : (rawText || `Errore ${res.status}`).slice(0, 200));
        return;
      }
      if (!res.ok) {
        setScanError(data.error || rawText.slice(0, 150) || `Errore ${res.status}`);
        return;
      }
      const d = Number(data.d ?? 0);
      const s = Number(data.s ?? 0);
      const a = Number(data.a ?? 0);
      const b = Number(data.b ?? 0);
      const u = Number(data.u ?? 0);
      const temp = data.temp !== undefined ? Number(data.temp) : 20;
      const melting = data.melting !== undefined ? Number(data.melting) : 0;
      const oscore = data.oscore !== undefined ? Number(data.oscore) : 1;
      const k = data.k !== undefined ? Number(data.k) : 0.3;
      const { S, M, loopEdonico } = soddisfazioneAdulto(d, s, a, b, u, temp, melting, oscore, k);
      const asseX = Math.min((M / 12) * 100, 100);
      const asseY = Math.min(100, S);
      const newResult: ScanResult = {
        alimento: trimmed,
        magnitudo: M,
        soddisfazione: asseY,
        asseX,
        asseY,
        d, s, a, b, u,
        loopEdonico,
        temp,
        melting,
        k,
        analisi_molecolare: typeof data.analisi_molecolare === 'string' ? data.analisi_molecolare : undefined,
      };
      const { error } = await supabase.from(COSTA_INDEX_TABLE).insert({ payload: newResult });
      if (error) throw error;
      setAlimento('');
      await fetchItems();
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Errore di connessione o salvataggio');
    } finally {
      setScanLoading(false);
    }
  };

  const focusedItem = items.length > 0 && focusedIndex >= 0 && focusedIndex < items.length ? items[focusedIndex]! : items[0] ?? null;
  const costaEsito = computeCostaIndex(focusedItem);
  const costaIndex = costaEsito?.costaIndex ?? 0;
  const gaugeColor = costaIndex < 50 ? '#ef4444' : costaIndex < 75 ? '#eab308' : '#22c55e';

  const removeItem = async (index: number) => {
    const item = items[index];
    if (!item) return;
    const id = item.id;
    const { error } = await supabase.from(COSTA_INDEX_TABLE).delete().eq('id', id);
    if (error) return;
    const next = items.filter((_, i) => i !== index);
    setItems(next);
    if (focusedIndex >= next.length && next.length > 0) setFocusedIndex(next.length - 1);
    else if (focusedIndex === index && next.length > 0) setFocusedIndex(Math.max(0, index - 1));
    else if (next.length === 0) setFocusedIndex(0);
  };

  const svgW = 400;
  const svgH = 220;
  const marginX = 0.08;
  const marginY = 0.14;
  const chartW = svgW * (1 - 2 * marginX);
  const chartH = svgH * (1 - 2 * marginY);
  const left = svgW * marginX;
  const right = svgW * (1 - marginX);
  const top = svgH * marginY;
  const bottom = svgH * (1 - marginY);

  return (
    <section className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 shadow-xl">
      <h2 className="text-xl font-bold text-[#fafafa] border-b border-zinc-800 pb-2 mb-4">
        Costa Index — Plancia di bio-hacking
      </h2>
      <p className="text-zinc-500 text-sm mb-4">
        Dati salvati su Supabase. Tutti i grafici mostrano tutti gli alimenti; clicca in legenda per mettere a fuoco uno.
      </p>

      <form onSubmit={handleScanAndAdd} className="flex flex-wrap gap-2 mb-6">
        <div className="flex-1 min-w-[200px] relative">
          <input
            type="text"
            placeholder="Nome alimento (es. ostriche)..."
            value={alimento}
            onChange={(e) => setAlimento(e.target.value)}
            onFocus={() => suggerimentiDb.length > 0 && setSuggerimentiOpen(true)}
            onBlur={() => setTimeout(() => setSuggerimentiOpen(false), 180)}
            disabled={scanLoading}
            className="w-full bg-[#09090b] border border-zinc-800 rounded-lg p-3 text-[#fafafa] placeholder-zinc-500 focus:border-emerald-600 outline-none disabled:opacity-60"
          />
          {suggerimentiOpen && suggerimentiDb.length > 0 && (
            <ul
              className="absolute left-0 right-0 top-full mt-1 z-20 max-h-60 overflow-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl"
              role="listbox"
            >
              {suggerimentiDb.map((row) => (
                <li
                  key={row.id}
                  role="option"
                  onMouseDown={(e) => { e.preventDefault(); setAlimento(row.nome); setSuggerimentiOpen(false); }}
                  className="px-3 py-2 text-sm text-[#fafafa] hover:bg-zinc-800 cursor-pointer border-b border-zinc-800 last:border-0"
                >
                  {row.nome}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="submit"
          disabled={scanLoading}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-3 rounded-lg transition-colors disabled:opacity-50"
        >
          {scanLoading ? 'Analisi in corso…' : 'Analizza e aggiungi'}
        </button>
      </form>
      {scanError && (
        <p className="text-red-400 text-sm mb-4">{scanError}</p>
      )}

      {fetchError && (
        <div className="rounded-xl border border-amber-800 bg-amber-950/40 p-4 mb-4 text-amber-200 text-sm">
          <p className="font-medium">Errore Costa Index</p>
          <p className="mt-1">{fetchError}</p>
          <p className="mt-2 text-amber-300/80 text-xs">
            Verifica: variabili Supabase su Vercel (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY), tabella costa_index_items creata in Supabase e policy RLS consentite per anon.
          </p>
          <button type="button" onClick={() => fetchItems()} className="mt-2 px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-600 text-white text-xs font-medium">
            Riprova
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900/40 p-8 text-center text-zinc-500">
          Caricamento…
        </div>
      ) : items.length === 0 && !fetchError ? (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900/40 p-8 text-center text-zinc-500">
          Nessun alimento in Costa Index. Inserisci un alimento nella casella sopra e clicca &quot;Analizza e aggiungi&quot; (analisi con Gemini).
        </div>
      ) : items.length === 0 ? null : (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0 space-y-6">
            {/* Gauge Costa Index */}
            <div className="flex flex-col items-center">
              <span className="text-sm text-zinc-500 mb-1">Costa Index (elemento in focus)</span>
              <div
                className="relative w-40 h-40 rounded-full border-8 flex items-center justify-center text-2xl font-bold tabular-nums"
                style={{
                  borderColor: gaugeColor,
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  color: gaugeColor,
                }}
              >
                {costaIndex}
              </div>
              <p className="text-xs text-zinc-500 mt-1">0–100 · Rosso &lt; 50 · Giallo 50–74 · Verde ≥ 75</p>
            </div>

            {/* Laboratory report */}
            {focusedItem && (
              <LaboratoryReport01 result={focusedItem} distanzaMolecolare={null} />
            )}

            {/* Grafico 1: Gauss */}
            <div className="rounded-xl border border-zinc-700 overflow-hidden bg-black">
              <p className="text-xs text-zinc-500 px-3 py-2 border-b border-zinc-700">Curva di Gauss (Soddisfazione) — tutti i pallini</p>
              <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto" style={{ display: 'block' }} xmlns="http://www.w3.org/2000/svg">
                <rect width={svgW} height={svgH} fill="#000000" />
                {/* Curva di Gauss base */}
                <path
                  fill="none"
                  stroke="#eab308"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  d={Array.from({ length: 121 }, (_, i) => {
                    const m = (i / 120) * 12;
                    const yVal = 100 * Math.exp(-Math.pow(m - 7.5, 2) / 4.5);
                    const x = left + (m / 12) * chartW;
                    const yy = bottom - (yVal / 100) * chartH;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${yy}`;
                  }).join(' ')}
                />
                {/* Griglia e assi */}
                {[0, 2, 4, 6, 8, 10, 12].map((m) => {
                  const x = left + (m / 12) * chartW;
                  return <line key={m} x1={x} y1={bottom} x2={x} y2={bottom + 6} stroke="#52525b" strokeWidth="1" />;
                })}
                {[0, 25, 50, 75, 100].map((v) => {
                  const yy = bottom - (v / 100) * chartH;
                  return <line key={v} x1={left - 6} y1={yy} x2={left} y2={yy} stroke="#52525b" strokeWidth="1" />;
                })}
                <text x={(left + right) / 2} y={bottom + 20} textAnchor="middle" fill="#a1a1aa" fontSize="11">Magnitudo</text>
                <text x={left - 30} y={(top + bottom) / 2} textAnchor="middle" fill="#a1a1aa" fontSize="11" transform={`rotate(-90, ${left - 30}, ${(top + bottom) / 2})`}>Soddisfazione</text>
                {/* Pallini per ogni alimento */}
                {items.map((r, i) => {
                  const isFocused = i === focusedIndex;
                  const opacity = isFocused ? 1 : 0.3;
                  const color = itemColor(i, items.length);
                  const x = left + (r.asseX / 100) * chartW;
                  const y = bottom - (r.asseY / 100) * chartH;
                  return (
                    <g key={i}>
                      <circle cx={x} cy={y} r={isFocused ? 8 : 5} fill={color} stroke="#fff" strokeWidth={isFocused ? 2 : 0} opacity={opacity} />
                      <text x={x} y={y - 12} textAnchor="middle" fill={color} fontSize={isFocused ? 10 : 8} opacity={opacity}>{r.alimento}</text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Grafico 2: Radar multiplo */}
            <div className="rounded-xl border border-zinc-700 overflow-hidden bg-black">
              <p className="text-xs text-zinc-500 px-3 py-2 border-b border-zinc-700">Radar (Pentagono) — fantasma 3.0 + tutti i poligoni</p>
              <CostaIndexRadarMulti items={items} focusedIndex={focusedIndex} itemColor={itemColor} />
            </div>

            {/* Grafico 3: Decadimento P(t) = P0 * e^(-kt) */}
            <div className="rounded-xl border border-zinc-700 overflow-hidden bg-black">
              <p className="text-xs text-zinc-500 px-3 py-2 border-b border-zinc-700">Spettro Sistemico (0–120 min) — Sapore, Glicogeno, Fatica, Finestra Anabolica</p>
              <CostaIndexSystemicChart item={focusedItem} />
            </div>
          </div>

          {/* Legenda */}
          <div className="w-full lg:w-56 flex-shrink-0 rounded-xl border border-zinc-700 bg-zinc-900/60 p-4 h-fit">
            <h3 className="text-sm font-semibold text-[#fafafa] mb-3">Legenda</h3>
            <ul className="space-y-2">
              {items.map((r, i) => {
                const isFocused = i === focusedIndex;
                const color = itemColor(i, items.length);
                return (
                  <li
                    key={r.id}
                    className="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer hover:bg-zinc-800/80 transition-colors"
                    style={{ opacity: isFocused ? 1 : 0.7 }}
                    onClick={() => setFocusedIndex(i)}
                  >
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-sm text-[#fafafa] truncate flex-1 min-w-0" title={r.alimento}>{r.alimento}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeItem(i); }}
                      className="text-zinc-500 hover:text-red-400 text-lg leading-none px-1"
                      aria-label="Rimuovi"
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}


type RigaIngrediente = { ingrediente: string; grammi: number; cottura: string };

const RIGHE_INIZIALI_OTTIMIZZATORE = 5;

function TabOttimizzatoreRicette() {
  const [ricetta, setRicetta] = useState('');
  const [righe, setRighe] = useState<RigaIngrediente[]>(() =>
    Array.from({ length: RIGHE_INIZIALI_OTTIMIZZATORE }, () => ({ ingrediente: '', grammi: 0, cottura: '' }))
  );
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [piattoResult, setPiattoResult] = useState<ScanResult | null>(null);
  const [opzioniCorrezione, setOpzioniCorrezione] = useState<OpzioneCorrezione[]>([]);
  const [suggerimentiCotture, setSuggerimentiCotture] = useState<SuggerimentoCottura[]>([]);
  const [piattoCorrettoResults, setPiattoCorrettoResults] = useState<ScanResult[]>([]);
  const [selectedGraphIndex, setSelectedGraphIndex] = useState<number>(0);
  const [graphZoom, setGraphZoom] = useState(1);
  const [graphPanX, setGraphPanX] = useState(0);
  const [graphPanY, setGraphPanY] = useState(0);
  const panStartRef = useRef<{ x: number; y: number; startPanX: number; startPanY: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [legendaAperta, setLegendaAperta] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ricetteGenerate, setRicetteGenerate] = useState<Record<number, string[]>>({});
  const [generaLoading, setGeneraLoading] = useState<number | null>(null);
  const [suggerimentiDbOtt, setSuggerimentiDbOtt] = useState<{ id: string; nome: string }[]>([]);
  const [suggerimentiRigaIndex, setSuggerimentiRigaIndex] = useState<number | null>(null);
  const debounceOttRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggerimentiOttimizzatore = useCallback(async (q: string, rowIndex: number) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setSuggerimentiDbOtt([]);
      setSuggerimentiRigaIndex(null);
      return;
    }
    const { data } = await supabase
      .from('matrice_ingredienti')
      .select('id, nome')
      .ilike('nome', `%${trimmed}%`)
      .limit(20);
    setSuggerimentiDbOtt((data ?? []).map((r: { id: string; nome: string }) => ({ id: r.id, nome: r.nome })));
    setSuggerimentiRigaIndex(rowIndex);
  }, []);

  /** Mostriamo tutte le opzioni; segnaliamo quando il miglioramento è insufficiente (S < 15 o S non migliora). */
  const SOGLIA_SODDISFAZIONE_MIN = 15;
  const allOptionIndices = useMemo((): number[] => {
    return piattoCorrettoResults.map((_, i: number) => i);
  }, [piattoCorrettoResults.length]);

  const graphPoints = useMemo(() => {
    const base = piattoResult ? [piattoResult] : [];
    return [...base, ...piattoCorrettoResults] as ScanResult[];
  }, [piattoResult, piattoCorrettoResults]);
  const radarResult = graphPoints[selectedGraphIndex] ?? piattoResult;

  useEffect(() => {
    if (results.length === 0) return;
    setPiattoResult(computePiattoFromResults(results));
    if (opzioniCorrezione.length > 0) setPiattoCorrettoResults(computeCorrectedFromResults(results, opzioniCorrezione));
  }, [results, opzioniCorrezione]);

  useEffect(() => {
    if (graphPoints.length > 0 && selectedGraphIndex >= graphPoints.length) {
      setSelectedGraphIndex(graphPoints.length - 1);
    }
  }, [graphPoints.length, selectedGraphIndex]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (panStartRef.current == null) return;
      setGraphPanX(panStartRef.current.startPanX + e.clientX - panStartRef.current.x);
      setGraphPanY(panStartRef.current.startPanY + e.clientY - panStartRef.current.y);
    };
    const onUp = () => {
      panStartRef.current = null;
      setIsPanning(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const handleGraphPanStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    panStartRef.current = { x: e.clientX, y: e.clientY, startPanX: graphPanX, startPanY: graphPanY };
    setIsPanning(true);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const marginX = 0.05;
      const marginY = 0.12;
      const chartW = w * (1 - 2 * marginX);
      const chartH = h * (1 - 2 * marginY);
      const left = w * marginX;
      const right = w * (1 - marginX);
      const top = h * marginY;
      const bottom = h * (1 - marginY);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = Math.max(5, 6 * dpr);
      ctx.setLineDash([6 * dpr, 4 * dpr]);
      ctx.beginPath();
      for (let m = 0; m <= 12; m += 0.1) {
        const yVal = 100 * Math.exp(-Math.pow(m - 7.5, 2) / 4.5);
        const x = left + (m / 12) * chartW;
        const yy = bottom - (yVal / 100) * chartH;
        if (m === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(161, 161, 170, 0.4)';
      ctx.lineWidth = 1;
      ctx.font = `${10 * dpr}px sans-serif`;
      ctx.fillStyle = '#a1a1aa';
      for (let m = 0; m <= 12; m += 2) {
        const x = left + (m / 12) * chartW;
        ctx.beginPath();
        ctx.moveTo(x, bottom);
        ctx.lineTo(x, bottom + 6);
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(String(m), x, bottom + 8);
      }
      for (let v = 0; v <= 100; v += 25) {
        const yy = bottom - (v / 100) * chartH;
        ctx.beginPath();
        ctx.moveTo(left - 6, yy);
        ctx.lineTo(left, yy);
        ctx.stroke();
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(v), left - 8, yy);
      }
      ctx.fillStyle = '#a1a1aa';
      ctx.font = `${Math.round(11 * dpr)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('Magnitudo', (left + right) / 2, bottom + 20);
      ctx.save();
      ctx.translate(left - 28, (top + bottom) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Soddisfazione', 0, 0);
      ctx.restore();
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  const buildRicettaFromRighe = useCallback(() => {
    return righe
      .filter((r) => r.ingrediente.trim())
      .map((r) => `${r.grammi || 0}g ${r.ingrediente.trim()}${r.cottura ? ` ${r.cottura}` : ''}`)
      .join(', ');
  }, [righe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = buildRicettaFromRighe();
    if (!trimmed) return;
    setRicetta(trimmed);
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/scan-ricetta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ricetta: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error || `Errore ${res.status}`);
        return;
      }
      const ing = (data as { ingredienti?: Array<{ nome: string; grammi?: number; d?: number; s?: number; a?: number; b?: number; u?: number; temp?: number; melting?: number; k?: number; analisi_molecolare?: string }> }).ingredienti ?? [];
      const opzioni = (data as { opzioni_correzione?: OpzioneCorrezione[] }).opzioni_correzione ?? [];
      const suggCotture = (data as { suggerimenti_cotture?: SuggerimentoCottura[] }).suggerimenti_cotture ?? [];
      const scanResults: ScanResult[] = ing.map((i) => {
        const d = i.d ?? 0;
        const s = i.s ?? 0;
        const a = i.a ?? 0;
        const b = i.b ?? 0;
        const u = i.u ?? 0;
        const temp = i.temp ?? 20;
        const melting = i.melting ?? 0;
        const k = i.k ?? 0.3;
        const { S, M, loopEdonico } = soddisfazioneAdulto(d, s, a, b, u, temp, melting, 1, k);
        const asseX = Math.min((M / 12) * 100, 100);
        const asseY = Math.min(100, S);
        return {
          alimento: i.nome,
          magnitudo: M,
          soddisfazione: asseY,
          asseX,
          asseY,
          d, s, a, b, u,
          loopEdonico,
          temp,
          melting,
          k,
          analisi_molecolare: i.analisi_molecolare,
          grammi: i.grammi != null ? i.grammi : undefined,
        };
      });
      setResults(scanResults);
      setOpzioniCorrezione(opzioni);
      setSuggerimentiCotture(suggCotture);
      setRicetteGenerate({});
      setGeneraLoading(null);
      if (scanResults.length > 0) {
        setPiattoResult(computePiattoFromResults(scanResults));
        setPiattoCorrettoResults(computeCorrectedFromResults(scanResults, opzioni));
        setSelectedGraphIndex(0);
      } else {
        setPiattoResult(null);
        setPiattoCorrettoResults([]);
      }
    } catch {
      setError('Errore di connessione');
    } finally {
      setIsLoading(false);
    }
  };

  const updateRiga = useCallback((index: number, field: keyof RigaIngrediente, value: string | number) => {
    setRighe((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, [field]: value };
      return next;
    });
  }, []);
  const aggiungiRiga = useCallback(() => setRighe((prev) => [...prev, { ingrediente: '', grammi: 0, cottura: '' }]), []);
  const rimuoviRiga = useCallback((index: number) => {
    setRighe((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <section className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 shadow-xl">
      <h2 className="text-xl font-bold text-[#fafafa] border-b border-zinc-800 pb-2 mb-4">
        Ottimizzatore Ricette
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 mb-6">
        <div className="space-y-3">
          <p className="text-zinc-500 text-sm mb-3">Inserisci ingrediente, quantità in grammi e tipo di cottura. Poi clicca Analizza.</p>
          {righe.map((riga, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 p-3 bg-[#09090b] border border-zinc-800 rounded-lg">
              <div className="flex-1 min-w-[120px] relative">
                <input
                  type="text"
                  placeholder="Ingrediente (es. ostriche)"
                  value={riga.ingrediente}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateRiga(i, 'ingrediente', v);
                    if (debounceOttRef.current) clearTimeout(debounceOttRef.current);
                    if (!v.trim()) {
                      setSuggerimentiDbOtt([]);
                      setSuggerimentiRigaIndex(null);
                      return;
                    }
                    debounceOttRef.current = setTimeout(() => { fetchSuggerimentiOttimizzatore(v, i); }, 300);
                  }}
                  onFocus={() => suggerimentiRigaIndex === i && suggerimentiDbOtt.length > 0 && setSuggerimentiRigaIndex(i)}
                  onBlur={() => setTimeout(() => setSuggerimentiRigaIndex(null), 180)}
                  disabled={isLoading}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-[#fafafa] placeholder-zinc-500 focus:border-[#dc2626] outline-none"
                />
                {suggerimentiRigaIndex === i && suggerimentiDbOtt.length > 0 && (
                  <ul
                    className="absolute left-0 right-0 top-full mt-1 z-20 max-h-48 overflow-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl"
                    role="listbox"
                  >
                    {suggerimentiDbOtt.map((row) => (
                      <li
                        key={row.id}
                        role="option"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          updateRiga(i, 'ingrediente', row.nome);
                          setSuggerimentiRigaIndex(null);
                        }}
                        className="px-3 py-2 text-sm text-[#fafafa] hover:bg-zinc-800 cursor-pointer border-b border-zinc-800 last:border-0"
                      >
                        {row.nome}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <input
                type="number"
                placeholder="g"
                min={0}
                value={riga.grammi || ''}
                onChange={(e) => updateRiga(i, 'grammi', e.target.value === '' ? 0 : Number(e.target.value))}
                disabled={isLoading}
                className="w-20 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-[#fafafa] placeholder-zinc-500 focus:border-[#dc2626] outline-none"
              />
              <span className="text-zinc-500 text-sm">g</span>
              <select
                value={riga.cottura}
                onChange={(e) => updateRiga(i, 'cottura', e.target.value)}
                disabled={isLoading}
                className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-[#fafafa] focus:border-[#dc2626] outline-none min-w-[140px]"
              >
                {COTTURA_LABELS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {righe.length > 1 && (
                <button
                  type="button"
                  onClick={() => rimuoviRiga(i)}
                  className="text-zinc-500 hover:text-red-400 p-1"
                  aria-label="Rimuovi riga"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={aggiungiRiga}
            className="flex items-center gap-1 text-sm text-[#dc2626] hover:underline"
          >
            + Aggiungi altro ingrediente
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isLoading}
            className="bg-[#dc2626] hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Analisi ricetta in corso...' : 'Analizza ricetta'}
          </button>
          <button
            type="button"
            onClick={() => {
              setResults([]);
              setPiattoResult(null);
              setOpzioniCorrezione([]);
              setSuggerimentiCotture([]);
              setPiattoCorrettoResults([]);
              setRicetteGenerate({});
              setGeneraLoading(null);
              setSelectedGraphIndex(0);
              setRicetta('');
              setRighe(Array.from({ length: RIGHE_INIZIALI_OTTIMIZZATORE }, () => ({ ingrediente: '', grammi: 0, cottura: '' })));
            }}
            className="bg-zinc-700 hover:bg-zinc-600 text-white font-medium px-3 py-2 rounded-lg transition-colors text-sm"
          >
            Pulisci
          </button>
        </div>
      </form>
      {isLoading && (
        <div className="mb-4 rounded-lg overflow-hidden bg-zinc-800/80 border border-zinc-700">
          <div className="h-2 bg-zinc-900 overflow-hidden">
            <div className="h-full w-[40%] bg-[#dc2626] rounded-full loading-bar-indeterminate" />
          </div>
          <p className="text-xs text-zinc-400 px-3 py-2">Analisi ricetta in corso…</p>
        </div>
      )}
      {error && <p className="text-[#dc2626] text-sm mb-4">{error}</p>}
      {results.length > 0 && (
        <div className="space-y-4 mb-6">
          {results.map((r, i) => {
            const det = dettaglioCalcolo(r);
            const analisi = piccolaAnalisi(r, det);
            return (
              <div key={`res-${i}`} className="bg-[#09090b] border border-zinc-800 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2">
                  <h3 className="text-sm font-medium text-zinc-500">{r.alimento}</h3>
                  <label className="flex items-center gap-1 text-xs text-zinc-400">
                    <span>Dose (g):</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={r.grammi ?? 0}
                      onChange={(e) => {
                        const v = Math.max(0, Number(e.target.value) || 0);
                        setResults((prev) => prev.map((x, j) => (j === i ? { ...x, grammi: v } : x)));
                      }}
                      className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 text-[#fafafa] text-xs focus:border-[#dc2626] outline-none"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-xs text-zinc-400">
                    <span>T (°C):</span>
                    <input
                      type="number"
                      min={-20}
                      max={100}
                      step={5}
                      value={r.temp}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (!Number.isNaN(v)) setResults((prev) => prev.map((x, j) => (j === i ? { ...x, temp: Math.max(-20, Math.min(100, v)) } : x)));
                      }}
                      className="w-14 bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 text-[#fafafa] text-xs focus:border-[#dc2626] outline-none"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-xs text-zinc-400">
                    <span>Cottura:</span>
                    <select
                      value={r.cottura ?? ''}
                      onChange={(e) => setResults((prev) => prev.map((x, j) => (j === i ? { ...x, cottura: e.target.value || undefined } : x)))}
                      className="bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 text-[#fafafa] text-xs focus:border-[#dc2626] outline-none"
                    >
                      {COTTURA_LABELS.map((opt) => (
                        <option key={opt.value || 'none'} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                {(() => {
                  const ef = getEffectiveProfile(r);
                  const hasCottura = (r.cottura ?? '') !== '';
                  const M = Math.sqrt(ef.d*ef.d+ef.s*ef.s+ef.a*ef.a+ef.b*ef.b+ef.u*ef.u);
                  return (
                    <div className="space-y-1">
                      <p className="text-[#fafafa]">
                        <span className="text-zinc-500">Sapori (0–5):</span> dolce {ef.d.toFixed(1)}, salato {ef.s.toFixed(1)}, acido {ef.a.toFixed(1)}, amaro {ef.b.toFixed(1)}, umami {ef.u.toFixed(1)}
                        {hasCottura && <span className="text-zinc-500 text-xs ml-1">· con cottura</span>}
                      </p>
                      <p className="text-[#fafafa]">
                        <span className="text-zinc-500">Magnitudo M</span> (intensità complessiva) = {M.toFixed(2)} · <span className="text-zinc-500">Soddisfazione S</span> (0–100) = {r.soddisfazione.toFixed(0)}
                      </p>
                      <p className="text-xs text-zinc-500">Ideale: M vicino a 7,5 e S alto. M troppo bassa = piatto poco “carico”; M troppo alta = rischio saturazione.</p>
                    </div>
                  );
                })()}
                <div className="mt-3 pt-3 border-t border-zinc-800 text-xs text-zinc-400 space-y-2">
                  <p className="font-medium text-zinc-500">Analisi</p>
                  <p>{analisi.profilo}</p>
                  <p>{analisi.magnitudo}</p>
                  {analisi.correzioni.length > 0 && (
                    <ul className="list-disc list-inside space-y-1">
                      {analisi.correzioni.map((c, j) => (
                        <li key={j}>{c}</li>
                      ))}
                    </ul>
                  )}
                  <p className="text-[#e4e4e7]">{analisi.sintesi}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {(allOptionIndices.length > 0 || opzioniCorrezione.length > 0) && (
        <div className="mb-6 space-y-3">
          <h3 className="text-sm font-semibold text-[#fafafa]">Correzioni per bilanciare il piatto</h3>
          <p className="text-xs text-zinc-400">Scegli un&apos;opzione (sostituzioni e/o aggiunte). Clicca sulla card per vedere il risultato sul grafico. Delta = differenza rispetto al piatto originale. Ideale: M ≈ 7,5, S alta.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {allOptionIndices.map((opzioneIndex, displayIdx) => {
              const op = opzioniCorrezione[opzioneIndex];
              const corretto = piattoCorrettoResults[opzioneIndex];
              if (!op) return null;
              const miglioraS = piattoResult && corretto && (corretto.soddisfazione >= (piattoResult.soddisfazione ?? 0));
              return (
                <div
                  key={opzioneIndex}
                  className="rounded-lg border border-emerald-700/50 bg-emerald-950/20 p-3 cursor-pointer hover:border-emerald-600/60 transition-colors"
                  onClick={() => setSelectedGraphIndex(displayIdx + 1)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedGraphIndex(displayIdx + 1); } }}
                >
                  <p className="font-medium text-emerald-200">{op.nome}</p>
                  <p className="text-xs text-zinc-400 mt-1">{op.descrizione}</p>
                  {(op.modifiche_grammi?.length ?? 0) > 0 && (
                    <>
                      <p className="text-xs text-zinc-500 mt-2">Modifica quantità:</p>
                      <ul className="text-xs text-zinc-300 list-disc list-inside">
                        {op.modifiche_grammi!.map((m, i) => {
                          const orig = results.find((r) => r.alimento.trim().toLowerCase() === m.nome.trim().toLowerCase());
                          const origG = orig?.grammi ?? 0;
                          return <li key={i}>{m.nome}: {origG} g → {m.grammi} g</li>;
                        })}
                      </ul>
                    </>
                  )}
                  {(op.sostituzioni?.length ?? 0) > 0 && (
                    <>
                      <p className="text-xs text-zinc-500 mt-2">Sostituisci:</p>
                      <ul className="text-xs text-zinc-300 list-disc list-inside">
                        {op.sostituzioni!.map((s, i) => (
                          <li key={i}>{s.da} → {s.nome} {s.grammi > 0 && `(${s.grammi} g)`}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {(op.correttivi?.length ?? 0) > 0 && (
                    <>
                      <p className="text-xs text-zinc-500 mt-2">Aggiungi:</p>
                      <ul className="text-xs text-zinc-300 list-disc list-inside">
                        {op.correttivi!.map((c, i) => (
                          <li key={i}>{c.nome} {c.grammi > 0 && `(${c.grammi} g)`}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {corretto && piattoResult && (
                    <>
                      <p className="text-xs mt-2 text-emerald-300">
                        Risultato: <strong>Magnitudo M</strong> = {corretto.magnitudo.toFixed(2)} · <strong>Soddisfazione S</strong> = {corretto.soddisfazione.toFixed(0)}/100
                        {miglioraS && <span className="ml-1 text-emerald-400 font-medium">↑ migliora S</span>}
                      </p>
                      <p className="text-xs mt-1 text-zinc-400">
                        Delta vs originale: <strong className={corretto.magnitudo >= (piattoResult.magnitudo ?? 0) ? 'text-emerald-400' : 'text-red-400'}>ΔM = {(corretto.magnitudo - (piattoResult.magnitudo ?? 0)) >= 0 ? '+' : ''}{(corretto.magnitudo - (piattoResult.magnitudo ?? 0)).toFixed(2)}</strong>
                        {' · '}
                        <strong className={corretto.soddisfazione >= (piattoResult.soddisfazione ?? 0) ? 'text-emerald-400' : 'text-red-400'}>ΔS = {(corretto.soddisfazione - (piattoResult.soddisfazione ?? 0)) >= 0 ? '+' : ''}{(corretto.soddisfazione - (piattoResult.soddisfazione ?? 0)).toFixed(0)}</strong>
                      </p>
                      {(corretto.soddisfazione < SOGLIA_SODDISFAZIONE_MIN || !miglioraS) && (
                        <span className="block text-amber-400/90 text-xs mt-0.5">Miglioramento insufficiente (S &lt; {SOGLIA_SODDISFAZIONE_MIN} o S non aumenta).</span>
                      )}
                      <span className="block text-zinc-500 text-xs mt-0.5">Ideale: M ≈ 7,5, S alto.</span>
                    </>
                  )}
                  {corretto && !piattoResult && (
                    <p className="text-xs mt-2 text-emerald-300">
                      Risultato: <strong>M</strong> = {corretto.magnitudo.toFixed(2)} · <strong>S</strong> = {corretto.soddisfazione.toFixed(0)}/100
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {suggerimentiCotture.length > 0 && (
        <div className="mb-6 p-4 rounded-lg border border-zinc-700 bg-zinc-900/40">
          <h3 className="text-sm font-semibold text-zinc-400 mb-2">Cotture (opzionale)</h3>
          <p className="text-xs text-zinc-500 mb-3">Se vuoi, puoi anche modificare cottura o temperatura degli ingredienti già in ricetta.</p>
          <ul className="space-y-2">
            {suggerimentiCotture.map((s, idx) => {
              const labelCottura = (COTTURA_LABELS.find((c) => (c.value || '').toLowerCase() === (s.cottura_consigliata || '').toLowerCase())?.label ?? s.cottura_consigliata) || '—';
              const idxIng = results.findIndex((r) => r.alimento.trim().toLowerCase() === s.ingrediente.trim().toLowerCase());
              return (
                <li key={idx} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-[#fafafa]">{s.ingrediente}</span>
                  <span className="text-zinc-400">
                    → Cottura: <strong className="text-zinc-300">{labelCottura}</strong>
                    {s.temperatura_consigliata != null && (
                      <> · T: <strong className="text-zinc-300">{s.temperatura_consigliata} °C</strong></>
                    )}
                  </span>
                  <span className="text-zinc-500 text-xs">({s.motivo})</span>
                  {idxIng >= 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setResults((prev) => prev.map((x, j) =>
                          j !== idxIng ? x : {
                            ...x,
                            cottura: s.cottura_consigliata || undefined,
                            temp: s.temperatura_consigliata ?? x.temp,
                          }
                        ));
                      }}
                      className="text-xs px-2 py-1 rounded bg-zinc-600 hover:bg-zinc-500 text-zinc-200"
                    >
                      Applica
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div className="mt-8 flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0" style={{ paddingLeft: 28, paddingBottom: 28 }}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-zinc-500">Zoom e spostamento grafico</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGraphZoom((z) => Math.max(0.5, z - 0.25))}
                disabled={graphZoom <= 0.5}
                className="w-8 h-8 rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed text-[#fafafa] font-bold text-lg leading-none flex items-center justify-center"
                aria-label="Riduci zoom"
              >
                −
              </button>
              <span className="text-xs text-zinc-400 tabular-nums min-w-[3ch]">{Math.round(graphZoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setGraphZoom((z) => Math.min(4, z + 0.25))}
                disabled={graphZoom >= 4}
                className="w-8 h-8 rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed text-[#fafafa] font-bold text-lg leading-none flex items-center justify-center"
                aria-label="Aumenta zoom"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => { setGraphZoom(1); setGraphPanX(0); setGraphPanY(0); }}
                className="text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
              >
                Reset vista
              </button>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mb-1">Trascina il grafico per spostarlo (click su area vuota e trascina).</p>
          {graphPoints.length > 0 && (
            <div
              className={`mb-3 px-4 py-2 rounded-lg flex items-center gap-2 border ${
                selectedGraphIndex >= 1
                  ? 'bg-emerald-950/40 border-emerald-600 text-emerald-100'
                  : 'bg-zinc-800/90 border-zinc-600'
              }`}
            >
              <span className="text-sm font-medium shrink-0">
                {selectedGraphIndex >= 1 ? 'Hai selezionato: correzione per bilanciare il piatto — ' : 'Stai guardando: '}
              </span>
              <span className="font-semibold truncate text-[#fafafa]" title={graphPoints[selectedGraphIndex]?.alimento ?? ''}>
                {graphPoints[selectedGraphIndex]?.alimento ?? '—'}
              </span>
              <span className="text-zinc-500 text-xs shrink-0">
                {selectedGraphIndex === 0 ? '(ricetta base)' : '(pallino verde = correzione selezionata)'}
              </span>
            </div>
          )}
          <div className="rounded-xl border border-zinc-700" style={{ height: 260, overflow: 'hidden', position: 'relative' }}>
            <div
              role="presentation"
              onMouseDown={handleGraphPanStart}
              style={{
                transform: `translate(${graphPanX}px, ${graphPanY}px) scale(${graphZoom})`,
                transformOrigin: 'center center',
                width: '100%',
                height: 260,
                position: 'relative',
                backgroundColor: '#000000',
                cursor: isPanning ? 'grabbing' : 'grab',
              }}
            >
              <canvas ref={canvasRef} className="block w-full h-full" style={{ width: '100%', height: 260, position: 'relative', zIndex: 5 }} aria-label="Curva di Gauss" />
              {graphPoints.map((r: ScanResult, i: number) => {
              const leftPct = 5 + (r.asseX / 100) * 90;
              const bottomPct = 12 + (r.asseY / 100) * 76;
              const inRedZone = r.magnitudo > 8;
              const hackedTexture = r.melting > 4;
              const hackedTemp = r.temp < 6;
              const isOriginal = i === 0;
              const isSelected = selectedGraphIndex === i;
              const color = isOriginal ? '#3b82f6' : '#22c55e';
              const selectedColor = isOriginal ? '#f97316' : '#10b981';
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => setSelectedGraphIndex(i)}
                  style={{ position: 'absolute', left: `${leftPct}%`, bottom: `${bottomPct}%`, transform: 'translate(-50%, 50%)', zIndex: 20, padding: 0, border: 'none', background: 'none', cursor: 'pointer', outline: 'none' }}
                  aria-label={`Seleziona ${r.alimento} nel radar`}
                >
                  <div
                    className={inRedZone ? 'scan-detector-red-aura' : ''}
                    style={{
                      width: 16,
                      height: 16,
                      backgroundColor: isSelected ? selectedColor : color,
                      borderRadius: '50%',
                      boxShadow: inRedZone ? undefined : (isSelected ? `0 0 14px ${selectedColor}` : `0 0 12px ${color}80`),
                    }}
                  />
                  <span style={{ position: 'absolute', left: '50%', bottom: '100%', transform: 'translateX(-50%)', marginBottom: 4, fontSize: 11, fontWeight: 700, color: '#ffffff', textShadow: '0 0 4px #000, 0 1px 2px #000', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                    {r.alimento}
                  </span>
                  {(hackedTexture || hackedTemp) && (
                    <span style={{ position: 'absolute', left: '50%', top: '100%', transform: 'translateX(-50%)', marginTop: 2, fontSize: 9, color: '#a1a1aa', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                      {hackedTexture && hackedTemp ? 'HACKED BY TEXTURE + TEMPERATURE' : hackedTexture ? 'HACKED BY TEXTURE' : 'HACKED BY TEMPERATURE'}
                    </span>
                  )}
                </button>
              );
            })}
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900/80 overflow-hidden">
            <button type="button" onClick={() => setLegendaAperta((v) => !v)} className="w-full p-4 text-left flex items-center justify-between text-[#fafafa] font-semibold hover:bg-zinc-800/50 transition-colors">
              Legenda
              <span className="text-zinc-500 text-sm font-normal">{legendaAperta ? 'Nascondi legenda' : 'Mostra legenda'}</span>
            </button>
            {legendaAperta && (
              <div className="px-4 pb-4 pt-0" style={{ fontSize: 12, color: '#d4d4d8' }}>
                <ul className="space-y-2 list-none mb-4">
                  <li><strong className="text-[#eab308]">Curva gialla:</strong> curva di Gauss teorica della soddisfazione in funzione della magnitudo (picco intorno a M ≈ 7,5).</li>
                  <li><strong className="text-[#fafafa]">Magnitudo (asse X, 0–12):</strong> modulo del vettore sapore. <strong className="text-[#fafafa]">Soddisfazione (asse Y, 0–100):</strong> indice corretto da Contrappeso e bonus.</li>
                </ul>
              </div>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 w-full lg:w-80 rounded-xl overflow-hidden flex flex-col items-center justify-center" style={{ minHeight: 260, backgroundColor: '#000000', border: '1px solid #52525b' }}>
          {radarResult ? (
            <>
              <RadarChartPentagon d={radarResult.d} s={radarResult.s} a={radarResult.a} b={radarResult.b} u={radarResult.u} alimento={radarResult.alimento} />
              {radarResult.loopEdonico && <p className="text-amber-400 text-xs font-medium mt-2 px-2 text-center">⚠️ LOOP EDONICO DETECTED</p>}
            </>
          ) : (
            <p className="text-zinc-500 text-sm px-4 text-center">Analizza una ricetta per vedere il Pentagono dei Sapori</p>
          )}
        </div>
      </div>
      {radarResult && (
        <LaboratoryReport01
          result={radarResult}
          distanzaMolecolare={null}
        />
      )}
      {selectedGraphIndex >= 1 && allOptionIndices[selectedGraphIndex - 1] !== undefined && (() => {
        const opzioneIndex = allOptionIndices[selectedGraphIndex - 1];
        const op = opzioniCorrezione[opzioneIndex];
        if (!op) return null;
        const passaggi = ricetteGenerate[opzioneIndex] ?? [];
        const loading = generaLoading === opzioneIndex;
        const getGrammiEffettivi = (r: ScanResult) => {
          const mod = op.modifiche_grammi?.find((m) => m.nome.trim().toLowerCase() === r.alimento.trim().toLowerCase());
          return mod != null ? mod.grammi : (r.grammi ?? 0);
        };
        const ingredientiEffettivi = results.map((r) => ({ nome: r.alimento, grammi: getGrammiEffettivi(r) }));
        const totaleG = ingredientiEffettivi.reduce((a, x) => a + x.grammi, 0) + op.correttivi.reduce((a, c) => a + c.grammi, 0);
        return (
          <div className="mt-8 p-5 rounded-xl border border-emerald-700/50 bg-emerald-950/20 space-y-4">
            <h3 className="text-base font-semibold text-emerald-200">
              Ricetta dettagliata — {op.nome}
            </h3>
            <div>
              <h4 className="text-sm font-medium text-emerald-300 mb-2">Ingredienti e grammature</h4>
              <ul className="space-y-1 text-sm">
                {ingredientiEffettivi.map((x, i) => {
                  const origResult = results.find((r) => r.alimento.trim().toLowerCase() === x.nome.trim().toLowerCase());
                  const orig = origResult?.grammi ?? 0;
                  const modificato = op.modifiche_grammi?.some((m) => m.nome.trim().toLowerCase() === x.nome.trim().toLowerCase());
                  return (
                    <li key={i} className="text-[#fafafa]">
                      {x.nome}: <span className="text-emerald-300 tabular-nums">{x.grammi} g</span>
                      {modificato && orig !== x.grammi && <span className="text-zinc-500 text-xs ml-1">(era {orig} g)</span>}
                    </li>
                  );
                })}
                {op.correttivi.map((c, i) => (
                  <li key={`c-${i}`} className="text-[#fafafa]">
                    <span className="text-emerald-400">+ {c.nome}:</span> <span className="text-emerald-300 tabular-nums">{c.grammi} g</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-zinc-400 mt-2">
                Totale: <span className="tabular-nums font-medium text-zinc-300">{totaleG} g</span>
              </p>
            </div>
            {passaggi.length > 0 ? (
              <div>
                <h4 className="text-sm font-medium text-emerald-300 mb-2">Procedura</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-200 leading-relaxed">
                  {passaggi.map((step, i) => (
                    <li key={i} className="pl-1">{step}</li>
                  ))}
                </ol>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setGeneraLoading(opzioneIndex);
                    try {
                      const res = await fetch('/api/scan-ricetta-genera', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          ricetta: ricetta.trim(),
                          nome_opzione: op.nome,
                          ingredienti: ingredientiEffettivi,
                          correttivi: op.correttivi.map((c) => ({ nome: c.nome, grammi: c.grammi })),
                        }),
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error((data as { error?: string }).error || `Errore ${res.status}`);
                      const list = (data as { passaggi?: string[] }).passaggi ?? [];
                      setRicetteGenerate((prev) => ({ ...prev, [opzioneIndex]: list }));
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Errore generazione ricetta');
                    } finally {
                      setGeneraLoading(null);
                    }
                  }}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white"
                >
                  {loading ? 'Generazione in corso…' : 'Genera ricetta'}
                </button>
                <p className="text-xs text-zinc-500 mt-2 italic">Ricetta molto dettagliata con pesi, tempi di cottura e temperature (generata on demand).</p>
              </div>
            )}
          </div>
        );
      })()}
    </section>
  );
}


function IngredienteRow({
  ing,
  onAggiungi,
}: {
  ing: Ingrediente;
  onAggiungi: (grammi: number) => void;
}) {
  const [grammi, setGrammi] = useState(100);
  const t = toNum(ing.temperatura_servizio_ideale);
  const f = toNum(ing.freschezza_balsamica);
  const c = toNum(ing.croccantezza_suono);

  return (
    <li className="flex flex-wrap items-center gap-2 py-2 border-b border-zinc-800 last:border-0">
      <span className="flex-1 min-w-0 text-[#fafafa] truncate">{ing.nome}</span>
      <span className="text-zinc-500 text-xs">
        P{(ing.proteine ?? 0).toFixed(0)} C{(ing.carboidrati ?? 0).toFixed(0)} G
        {(ing.grassi ?? 0).toFixed(0)}/100g
      </span>
      {(t !== 0 || f !== 0 || c !== 0) && (
        <span className="text-zinc-500 text-xs">
          T°{t} Fr{f} Cr{c}
        </span>
      )}
      <input
        type="number"
        min={1}
        value={grammi}
        onChange={(e) => setGrammi(Number(e.target.value) || 0)}
        className="w-20 bg-[#09090b] border border-zinc-800 rounded px-2 py-1 text-sm text-[#fafafa] focus:border-[#dc2626] outline-none"
      />
      <span className="text-zinc-500 text-sm">g</span>
      <button
        type="button"
        onClick={() => onAggiungi(grammi)}
        className="bg-[#dc2626] hover:bg-red-700 text-white text-sm font-medium px-3 py-1 rounded transition-colors"
      >
        Aggiungi
      </button>
    </li>
  );
}
