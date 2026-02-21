-- Tabella per Costa Index (dati su Supabase, non in locale).
-- Esegui questo script nel SQL Editor di Supabase se la tabella non esiste.

CREATE TABLE IF NOT EXISTS costa_index_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  payload jsonb NOT NULL
);

-- Indice per ordinamento per data
CREATE INDEX IF NOT EXISTS costa_index_items_created_at_idx ON costa_index_items (created_at);
