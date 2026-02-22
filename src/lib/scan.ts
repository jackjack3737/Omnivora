/**
 * Re-export da @/lib/indicatori — unico file delle logiche/equazioni.
 * Mantiene compatibilità con import da '@/lib/scan'.
 */
export {
  type ScanResult,
  type CostaIndexItem,
  type CorrettivoOpzione,
  type Sostituzione,
  type OpzioneCorrezione,
  type SuggerimentoCottura,
  COSTA_INDEX_TABLE,
  COTTURA_DELTA,
  COTTURA_LABELS,
  RADAR_LABELS,
  getEffectiveProfile,
  soddisfazioneAdulto,
  dettaglioCalcolo,
  piccolaAnalisi,
  distanzaMolecolare,
  virtualWeight,
  computePiattoFromResults,
  applyOpzioneToResults,
  computeCorrectedFromResults,
  computeCostaIndex,
  getCostaIndexChartData,
  type CostaIndexEsito,
  type CostaIndexChartOptions,
  type CostaIndexChartData,
} from '@/lib/indicatori';
