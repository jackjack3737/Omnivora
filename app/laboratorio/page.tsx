'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  calcolaFatigue,
  calcolaGlycogen,
  calcolaMAG,
  type VoceBiochimica,
} from '@/lib/biochimica';

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

export default function LaboratorioPage() {
  const router = useRouter();
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
      setPiatto([]);
      setDescrizionePasto('');
      router.push('/calendario');
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] p-6 sm:p-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <nav className="mb-6">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-[#fafafa] transition-colors"
          >
            ← Torna alla Home
          </Link>
        </nav>
        <h1 className="text-4xl font-black text-[#dc2626] mb-2 uppercase tracking-tighter">
          Omnivora
        </h1>
        <p className="text-zinc-500 mb-8 font-mono text-sm">/ Laboratorio · Ingredienti e pasti</p>

        <section className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 mb-6 shadow-xl">
          <h2 className="text-xl font-bold text-[#fafafa] border-b border-zinc-800 pb-2 mb-4">
            Cerca ingredienti
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nome ingrediente..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && cercaIngredienti()}
              className="flex-1 bg-[#09090b] border border-zinc-800 rounded-lg p-3 text-[#fafafa] placeholder-zinc-500 focus:border-[#dc2626] focus:ring-1 focus:ring-[#dc2626] outline-none"
            />
            <button
              type="button"
              onClick={cercaIngredienti}
              disabled={searching}
              className="bg-[#dc2626] hover:bg-red-700 text-white font-semibold px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {searching ? '...' : 'Cerca'}
            </button>
          </div>

          {message && (
            <p className={`mt-3 text-sm ${message.type === 'ok' ? 'text-emerald-400' : 'text-[#dc2626]'}`}>
              {message.text}
            </p>
          )}

          {risultati.length > 0 && (
            <ul className="mt-4 space-y-2 max-h-48 overflow-y-auto">
              {risultati.map((ing) => (
                <IngredienteRow
                  key={ing.id}
                  ing={ing}
                  onAggiungi={(grammi) => aggiungiAlPiatto(ing, grammi)}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-[#fafafa] border-b border-zinc-800 pb-2 mb-4">
            Il tuo piatto
          </h2>

          <input
            type="text"
            placeholder="Descrizione pasto (es. Pranzo)"
            value={descrizionePasto}
            onChange={(e) => setDescrizionePasto(e.target.value)}
            className="w-full mb-4 bg-[#09090b] border border-zinc-800 rounded-lg p-3 text-[#fafafa] placeholder-zinc-500 focus:border-[#dc2626] outline-none"
          />

          {piatto.length === 0 ? (
            <p className="text-zinc-500 text-sm">Aggiungi ingredienti dalla ricerca sopra.</p>
          ) : (
            <>
              <ul className="space-y-2 mb-4">
                {piatto.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between gap-2 py-2 border-b border-zinc-800 last:border-0"
                  >
                    <span className="text-[#fafafa]">{v.nome}</span>
                    <span className="text-zinc-500 text-sm">{v.grammi} g</span>
                    <span className="text-zinc-500 text-xs">
                      P {v.proteine.toFixed(1)} C {v.carboidrati.toFixed(1)} G {v.grassi.toFixed(1)}
                    </span>
                    <button
                      type="button"
                      onClick={() => rimuoviDaPiatto(v.id)}
                      className="text-[#dc2626] hover:underline text-sm"
                    >
                      Rimuovi
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-4 py-3 border-t border-zinc-800 text-[#dc2626] font-mono text-sm">
                <span>Totale P: {totali.proteine.toFixed(1)} g</span>
                <span>Totale C: {totali.carboidrati.toFixed(1)} g</span>
                <span>Totale G: {totali.grassi.toFixed(1)} g</span>
              </div>
              <div className="flex flex-wrap gap-4 py-2 text-zinc-400 font-mono text-xs">
                <span>T°: {mediaPesata('temperatura_servizio_ideale')}</span>
                <span>Freschezza: {mediaPesata('freschezza_balsamica')}</span>
                <span>Croccantezza: {mediaPesata('croccantezza_suono')}</span>
                <span>MAG: {MAG}</span>
                <span>Fatigue: {calcolaFatigue({ proteine_g: totali.proteine, carboidrati_g: totali.carboidrati, grassi_g: totali.grassi })}</span>
                <span>Glycogen: {calcolaGlycogen({ carboidrati_g: totali.carboidrati })}</span>
              </div>
              <button
                type="button"
                onClick={salvaPasto}
                disabled={saving}
                className="w-full mt-4 bg-[#dc2626] hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Salvataggio...' : 'Registra pasto'}
              </button>
            </>
          )}
        </section>
      </div>
    </div>
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
