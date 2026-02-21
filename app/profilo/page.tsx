'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ProfiloPage() {
  const router = useRouter();
  const [proteine, setProteine] = useState<number>(0);
  const [carboidrati, setCarboidrati] = useState<number>(0);
  const [grassi, setGrassi] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const salvaProfilo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.from('utenti_profili').insert({
      proteine_target: proteine,
      carboidrati_target: carboidrati,
      grassi_target: grassi,
      email: 'utente_test@omnivora.com',
    });

    setLoading(false);
    if (error) {
      setMessage({ type: 'err', text: error.message });
    } else {
      setMessage({ type: 'ok', text: 'Profilo salvato con successo.' });
      router.push('/laboratorio');
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] p-6 sm:p-8 font-sans">
      <div className="max-w-xl mx-auto">
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
        <p className="text-zinc-500 mb-8 font-mono text-sm">/ Profilo · Obiettivi macro</p>

        <form
          onSubmit={salvaProfilo}
          className="bg-zinc-900/80 border border-zinc-800 p-6 rounded-xl shadow-2xl"
        >
          <h2 className="text-xl font-bold mb-6 text-[#fafafa] border-b border-zinc-800 pb-2">
            Obiettivi macro giornalieri
          </h2>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Proteine target (g)
              </label>
              <input
                type="number"
                min={0}
                value={proteine || ''}
                onChange={(e) => setProteine(Number(e.target.value) || 0)}
                className="w-full bg-[#09090b] border border-zinc-800 rounded-lg p-3 text-[#fafafa] focus:border-[#dc2626] focus:ring-1 focus:ring-[#dc2626] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Carboidrati target (g)
              </label>
              <input
                type="number"
                min={0}
                value={carboidrati || ''}
                onChange={(e) => setCarboidrati(Number(e.target.value) || 0)}
                className="w-full bg-[#09090b] border border-zinc-800 rounded-lg p-3 text-[#fafafa] focus:border-[#dc2626] focus:ring-1 focus:ring-[#dc2626] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Grassi target (g)
              </label>
              <input
                type="number"
                min={0}
                value={grassi || ''}
                onChange={(e) => setGrassi(Number(e.target.value) || 0)}
                className="w-full bg-[#09090b] border border-zinc-800 rounded-lg p-3 text-[#fafafa] focus:border-[#dc2626] focus:ring-1 focus:ring-[#dc2626] outline-none"
              />
            </div>
          </div>

          {message && (
            <p
              className={`mt-4 text-sm ${
                message.type === 'ok' ? 'text-emerald-400' : 'text-[#dc2626]'
              }`}
            >
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-8 bg-[#dc2626] hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Salvataggio...' : 'Salva profilo'}
          </button>
        </form>
      </div>
    </div>
  );
}
