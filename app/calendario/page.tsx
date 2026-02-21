'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Pasto = {
  id?: string;
  created_at?: string;
  data_ora?: string;
  tipo_pasto?: string;
  descrizione?: string;
  proteine_totali?: number;
  carboidrati_totali?: number;
  grassi_totali?: number;
  [key: string]: unknown;
};

export default function CalendarioPage() {
  const [pasti, setPasti] = useState<Pasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const carica = async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('storico_pasti')
        .select('*')
        .order('created_at', { ascending: false });

      setLoading(false);
      if (err) {
        setError(err.message);
        return;
      }
      setPasti((data ?? []) as Pasto[]);
    };
    carica();
  }, []);

  const formatDate = (value: string | undefined) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <p className="text-zinc-500 mb-8 font-mono text-sm">/ Calendario · Storico pasti</p>

        <section className="bg-zinc-900/80 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
          <h2 className="text-xl font-bold px-6 py-4 text-[#fafafa] border-b border-zinc-800">
            Pasti in ordine cronologico
          </h2>

          {loading && (
            <div className="px-6 py-12 text-center text-zinc-500">Caricamento...</div>
          )}

          {error && (
            <div className="mx-6 mt-4 p-4 bg-red-950/50 border border-[#dc2626]/30 rounded-lg text-[#dc2626] text-sm">
              {error}
            </div>
          )}

          {!loading && !error && pasti.length === 0 && (
            <div className="px-6 py-12 text-center text-zinc-500">
              Nessun pasto registrato.
            </div>
          )}

          {!loading && !error && pasti.length > 0 && (
            <ul className="divide-y divide-zinc-800">
              {pasti.map((p) => (
                <li key={p.id ?? p.created_at ?? Math.random()} className="px-6 py-4 hover:bg-zinc-800/50 transition-colors">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-mono text-sm text-[#dc2626]">
                      {formatDate(p.data_ora ?? p.created_at)}
                    </span>
                    {p.tipo_pasto && (
                      <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                        {String(p.tipo_pasto)}
                      </span>
                    )}
                  </div>
                  {Boolean(p.descrizione || (p as Pasto).note) && (
                    <p className="mt-1 text-zinc-400 text-sm">
                      {String(p.descrizione ?? (p as Pasto).note ?? '')}
                    </p>
                  )}
                  {(p.proteine_totali != null || p.carboidrati_totali != null || p.grassi_totali != null) && (
                    <p className="mt-1 text-xs text-zinc-500">
                      P {p.proteine_totali ?? '—'} · C {p.carboidrati_totali ?? '—'} · G {p.grassi_totali ?? '—'} g
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
