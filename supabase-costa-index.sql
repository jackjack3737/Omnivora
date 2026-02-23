-- Tabella per Costa Index (dati su Supabase, non in locale).
-- Esegui questo script nel SQL Editor di Supabase se la tabella non esiste.

CREATE TABLE IF NOT EXISTS costa_index_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  payload jsonb NOT NULL
);

-- Indice per ordinamento per data
CREATE INDEX IF NOT EXISTS costa_index_items_created_at_idx ON costa_index_items (created_at);

-- Policy RLS: consentire all'anon key di leggere, inserire e cancellare (Costa Index pubblico).
ALTER TABLE costa_index_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "costa_index_select" ON costa_index_items;
CREATE POLICY "costa_index_select" ON costa_index_items FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "costa_index_insert" ON costa_index_items;
CREATE POLICY "costa_index_insert" ON costa_index_items FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "costa_index_delete" ON costa_index_items;
CREATE POLICY "costa_index_delete" ON costa_index_items FOR DELETE TO anon USING (true);
