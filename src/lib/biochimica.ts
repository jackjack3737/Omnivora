/**
 * Re-export da @/lib/indicatori — unico file delle logiche/equazioni.
 * Mantiene compatibilità con import da '@/lib/biochimica'.
 */
export {
  type VoceBiochimica,
  calcolaFatigue,
  calcolaGlycogen,
  calcolaMAG,
} from '@/lib/indicatori';
