/**
 * Fatigue Predictor – placeholder.
 * Inserire in seguito le costanti e la formula definitiva.
 */
export function calcolaFatigue(params: {
  proteine_g: number;
  carboidrati_g: number;
  grassi_g: number;
  /** Indici sensoriali del pasto (opzionale) */
  temperatura_servizio_ideale?: number;
  freschezza_balsamica?: number;
  croccantezza_suono?: number;
}): number {
  // TODO: sostituire con formula reale (es. modelli letteratura)
  const { proteine_g, carboidrati_g, grassi_g } = params;
  const placeholder = (proteine_g * 0.1 + carboidrati_g * 0.05 + (grassi_g ?? 0) * 0.08) * 0;
  return Math.round((placeholder + 0.5) * 100) / 100; // per ora valore placeholder fisso
}

/**
 * Glycogen Burn Rate – placeholder.
 * Inserire in seguito le costanti e la formula definitiva.
 */
export function calcolaGlycogen(params: {
  carboidrati_g: number;
  proteine_g?: number;
  grassi_g?: number;
}): number {
  // TODO: sostituire con formula reale (g/min o unità definite)
  const { carboidrati_g } = params;
  const placeholder = carboidrati_g * 0.01 * 0; // placeholder
  return Math.round((placeholder + 0.1) * 100) / 100;
}

/** Voce del piatto con indici sensoriali (per media pesata) */
export type VoceBiochimica = {
  grammi: number;
  temperatura_servizio_ideale: number;
  freschezza_balsamica: number;
  croccantezza_suono: number;
};

/**
 * MAG = media pesata degli indici biochimici/sensoriali degli ingredienti.
 * Per ogni ingrediente si considera un indice (media di T, F, C); poi media pesata per grammi.
 */
export function calcolaMAG(voci: VoceBiochimica[]): number {
  if (voci.length === 0) return 0;
  let sommaPesata = 0;
  let sommaGrammi = 0;
  for (const v of voci) {
    const indice =
      (Number(v.temperatura_servizio_ideale ?? 0) +
        Number(v.freschezza_balsamica ?? 0) +
        Number(v.croccantezza_suono ?? 0)) /
      3;
    sommaPesata += indice * v.grammi;
    sommaGrammi += v.grammi;
  }
  if (sommaGrammi === 0) return 0;
  return Math.round((sommaPesata / sommaGrammi) * 1000) / 1000;
}
