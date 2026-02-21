'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { COSTA_INDEX_TABLE } from '@/lib/scan';
import type { ScanResult } from '@/lib/scan';

export function AddToCostaIndexButton({ result }: { result: ScanResult }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const handleAdd = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.from(COSTA_INDEX_TABLE).insert({ payload: result });
      if (error) throw error;
      setMessage('Aggiunto a Costa Index');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Errore salvataggio');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        disabled={loading}
        onClick={handleAdd}
        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-medium"
      >
        {loading ? 'Salvataggio…' : 'Aggiungi a Costa Index'}
      </button>
      {message && <span className="text-xs text-zinc-400">{message}</span>}
    </div>
  );
}
