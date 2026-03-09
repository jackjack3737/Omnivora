/**
 * Indicatori Omnivora — unico file per tipi, costanti, equazioni e logica:
 * Scan/ricette/sapori, biochimica (fatigue, glicogeno, MAG), Costa Index (Ebbrezza vs Conto).
 */

// ─── Tipi Scan / Ricette / Costa Index ─────────────────────────────────────

export type ScanResult = {
  alimento: string;
  magnitudo: number;
  soddisfazione: number;
  asseX: number;
  asseY: number;
  d: number;
  s: number;
  a: number;
  b: number;
  u: number;
  /** Carico glicemico (0.0–5.0), disaccoppiato dal sapore dolce percepito. */
  cg?: number;
  loopEdonico: boolean;
  temp: number;
  melting: number;
  k: number;
  analisi_molecolare?: string;
  grammi?: number;
  cottura?: string;
};

export type CostaIndexItem = ScanResult & { id: string };

export type CorrettivoOpzione = { nome: string; grammi: number; d: number; s: number; a: number; b: number; u: number };
/** Sostituzione: ingrediente "da" sostituito con "nome" (stesso ruolo, profilo migliore). */
export type Sostituzione = { da: string; nome: string; grammi: number; d: number; s: number; a: number; b: number; u: number };
/** Modifica grammi: cambia la quantità di un ingrediente già presente nella ricetta (nome deve coincidere). */
export type ModificaGrammi = { nome: string; grammi: number };
export type OpzioneCorrezione = {
  nome: string;
  descrizione: string;
  correttivi: CorrettivoOpzione[];
  /** Quando presente, si applicano sostituzioni (rimuovi "da", aggiungi "nome") poi eventuali correttivi. */
  sostituzioni?: Sostituzione[];
  /** Grammi suggeriti per ingredienti già in ricetta: si applicano per nome prima di sostituzioni/correttivi. */
  modifiche_grammi?: ModificaGrammi[];
  passaggi?: string[];
};

export type SuggerimentoCottura = {
  ingrediente: string;
  cottura_consigliata: string;
  temperatura_consigliata?: number;
  motivo: string;
};

// ─── Tipi Biochimica ──────────────────────────────────────────────────────

export type VoceBiochimica = {
  grammi: number;
  temperatura_servizio_ideale: number;
  freschezza_balsamica: number;
  croccantezza_suono: number;
};

// ─── Costanti ──────────────────────────────────────────────────────────────

export const COSTA_INDEX_TABLE = 'costa_index_items';

/** Delta (d,s,a,b,u) applicati al profilo in base alla cottura: modifica dolce, salato, acido, amaro, umami. */
export const COTTURA_DELTA: Record<string, { d: number; s: number; a: number; b: number; u: number }> = {
  '': { d: 0, s: 0, a: 0, b: 0, u: 0 },
  crudo: { d: 0, s: 0, a: 0.2, b: 0, u: 0 },
  vapore: { d: 0, s: 0, a: 0, b: 0, u: 0 },
  bollito: { d: 0, s: 0, a: 0, b: 0, u: 0.1 },
  griglia: { d: 0, s: 0, a: 0.1, b: 0.4, u: 0 },
  fritto: { d: 0, s: 0, a: 0, b: 0.15, u: 0.2 },
  forno: { d: 0, s: 0, a: 0, b: 0.1, u: 0.2 },
  caramellizzato: { d: 0.5, s: 0, a: 0, b: 0.1, u: 0 },
  affumicato: { d: 0, s: 0.1, a: 0, b: 0.35, u: 0.3 },
  brasato: { d: 0.1, s: 0.1, a: 0, b: 0.15, u: 0.4 },
  stufato: { d: 0.05, s: 0.1, a: 0.1, b: 0.1, u: 0.35 },
  saltato: { d: 0, s: 0.05, a: 0.15, b: 0.25, u: 0.2 },
  cartoccio: { d: 0, s: 0, a: 0.05, b: 0.05, u: 0.15 },
  marinato: { d: 0, s: 0.05, a: 0.4, b: 0.1, u: 0.1 },
  scottato: { d: 0, s: 0, a: 0, b: 0.3, u: 0.25 },
  confit: { d: 0.1, s: 0.05, a: 0, b: 0.1, u: 0.35 },
  padella: { d: 0, s: 0.05, a: 0.1, b: 0.2, u: 0.2 },
  wok: { d: 0, s: 0.1, a: 0.15, b: 0.3, u: 0.25 },
  glassato: { d: 0.4, s: 0.05, a: 0.1, b: 0.1, u: 0.1 },
  pickle: { d: 0, s: 0.1, a: 0.5, b: 0.15, u: 0.05 },
};

export const COTTURA_LABELS: { value: string; label: string }[] = [
  { value: '', label: '—' },
  { value: 'crudo', label: 'Crudo' },
  { value: 'vapore', label: 'Al vapore' },
  { value: 'bollito', label: 'Bollito' },
  { value: 'griglia', label: 'Griglia' },
  { value: 'fritto', label: 'Fritto' },
  { value: 'forno', label: 'Forno' },
  { value: 'caramellizzato', label: 'Caramellizzato' },
  { value: 'affumicato', label: 'Affumicato' },
  { value: 'brasato', label: 'Brasato' },
  { value: 'stufato', label: 'Stufato' },
  { value: 'saltato', label: 'Saltato in padella' },
  { value: 'cartoccio', label: 'Al cartoccio' },
  { value: 'marinato', label: 'Marinato' },
  { value: 'scottato', label: 'Scottato' },
  { value: 'confit', label: 'Confit' },
  { value: 'padella', label: 'Padella' },
  { value: 'wok', label: 'Wok' },
  { value: 'glassato', label: 'Glassato' },
  { value: 'pickle', label: 'Sotto aceto / Pickle' },
];

export const RADAR_LABELS = [
  { key: 'd', name: 'Dolce' },
  { key: 's', name: 'Salato' },
  { key: 'a', name: 'Acido' },
  { key: 'b', name: 'Amaro' },
  { key: 'u', name: 'Umami' },
] as const;

// ─── Equazioni Scan / Sapori ──────────────────────────────────────────────

export function getEffectiveProfile(r: ScanResult): { d: number; s: number; a: number; b: number; u: number } {
  const delta = COTTURA_DELTA[r.cottura ?? ''] ?? COTTURA_DELTA[''];
  return {
    d: Math.min(5, Math.max(0, r.d + delta.d)),
    s: Math.min(5, Math.max(0, r.s + delta.s)),
    a: Math.min(5, Math.max(0, r.a + delta.a)),
    b: Math.min(5, Math.max(0, r.b + delta.b)),
    u: Math.min(5, Math.max(0, r.u + delta.u)),
  };
}

export function soddisfazioneAdulto(
  d: number,
  s: number,
  a: number,
  b: number,
  u: number,
  temp: number = 20,
  melting: number = 0,
  oscore: number = 1,
  k: number = 0.3
): { S: number; M: number; loopEdonico: boolean } {
  const M = Math.sqrt(d * d + s * s + a * a + b * b + u * u);
  let S = 100 * Math.exp(-Math.pow(M - 7.5, 2) / 4.5);
  const loopEdonico = M > 8 && k > 0.5;
  if (temp >= 6) {
    const maxDsu = Math.max(d, s, u);
    if (a + b < maxDsu / 2) S *= 0.6;
  }
  if (melting > 4) S += 15 * oscore;
  S = Math.min(100, Math.max(0, S * oscore));
  return { S, M, loopEdonico };
}

export function dettaglioCalcolo(r: ScanResult): {
  M: number;
  S_base: number;
  contrappeso: boolean;
  bonusMelting: boolean;
  S_finale: number;
  loopEdonico: boolean;
} {
  const M = r.magnitudo;
  const S_base = 100 * Math.exp(-Math.pow(M - 7.5, 2) / 4.5);
  const maxDsu = Math.max(r.d, r.s, r.u);
  const contrappeso = r.temp >= 6 && r.a + r.b < maxDsu / 2;
  const bonusMelting = r.melting > 4;
  let S = S_base;
  if (contrappeso) S *= 0.6;
  if (bonusMelting) S += 15;
  S = Math.min(100, Math.max(0, S));
  return { M: r.magnitudo, S_base, contrappeso, bonusMelting, S_finale: r.soddisfazione, loopEdonico: r.loopEdonico };
}

export function piccolaAnalisi(
  r: ScanResult,
  det: { M: number; S_base: number; contrappeso: boolean; bonusMelting: boolean; S_finale: number; loopEdonico: boolean }
): { profilo: string; magnitudo: string; correzioni: string[]; sintesi: string } {
  const nomi = ['dolce', 'salato', 'acido', 'amaro', 'umami'] as const;
  const vals = [r.d, r.s, r.a, r.b, r.u] as const;
  const maxVal = Math.max(...vals);
  const dominanti = vals.map((v, i) => (v >= maxVal * 0.7 ? nomi[i] : null)).filter(Boolean) as string[];
  const bassi = vals.map((v, i) => (v < 1.5 ? nomi[i] : null)).filter(Boolean) as string[];
  const profilo =
    dominanti.length >= 2
      ? `Profilo dominato da ${dominanti.join(' e ')}.`
      : dominanti.length === 1
        ? `${dominanti[0].charAt(0).toUpperCase() + dominanti[0].slice(1)} in evidenza.`
        : 'Profilo piuttosto bilanciato.';
  const profiloExtra =
    bassi.length >= 2 ? ` Acido e amaro contenuti.` : bassi.length === 1 ? ` ${bassi[0].charAt(0).toUpperCase() + bassi[0].slice(1)} poco presente.` : '';

  let magnitudo: string;
  if (det.M < 5.5) magnitudo = `Magnitudo ${det.M.toFixed(1)}: sotto il picco ideale (7,5) — profilo tenue, poca "carica" sensoriale.`;
  else if (det.M <= 8) magnitudo = `Magnitudo ${det.M.toFixed(1)}: intorno al picco di soddisfazione teorico; l'intensità complessiva è in zona favorevole.`;
  else magnitudo = `Magnitudo ${det.M.toFixed(1)}: oltre il picco — profilo molto carico, rischio di saturazione.`;

  const correzioni: string[] = [];
  if (det.contrappeso) correzioni.push('Teorema del Contrappeso applicato (−40%): dolce/salato/umami dominano e acido+amaro sono bassi → il modello lo classifica come potenzialmente stucchevole.');
  if (det.bonusMelting) correzioni.push('Bonus texture (melting elevato): +15 punti alla soddisfazione.');
  if (det.loopEdonico) correzioni.push('Rilevato loop edonico: alta magnitudo e decadimento rapido — il prodotto "attacca" ma non mantiene.');

  const sintesi = `Soddisfazione finale: ${det.S_finale.toFixed(0)}. ${det.S_finale >= 60 ? 'Il laboratorio lo considera ben posizionato.' : det.S_finale >= 35 ? 'Risultato intermedio: appagante ma con correzioni (contrappeso o distanza dal picco).' : 'Punteggio basso: dominano correzioni e distanza dal picco ideale.'}`;

  return { profilo: profilo + profiloExtra, magnitudo, correzioni, sintesi };
}

export function distanzaMolecolare(
  r1: { d: number; s: number; a: number; b: number; u: number },
  r2: { d: number; s: number; a: number; b: number; u: number }
): number {
  return Math.sqrt(
    Math.pow(r1.d - r2.d, 2) + Math.pow(r1.s - r2.s, 2) + Math.pow(r1.a - r2.a, 2) + Math.pow(r1.b - r2.b, 2) + Math.pow(r1.u - r2.u, 2)
  );
}

export function virtualWeight(grammi: number): number {
  const g = grammi ?? 0;
  return g <= 30 ? g * 15 : g;
}

export function computePiattoFromResults(scanResults: ScanResult[]): ScanResult | null {
  if (scanResults.length === 0) return null;
  const n = scanResults.length;
  const eff = (r: ScanResult) => getEffectiveProfile(r);
  const totalVirtualG = scanResults.reduce((a, r) => a + virtualWeight(r.grammi ?? 0), 0);
  const div = totalVirtualG > 0 ? totalVirtualG : n;
  // 1. Calcolo Medie Ponderate
  const avgD =
    totalVirtualG > 0
      ? scanResults.reduce((acc, r) => acc + eff(r).d * virtualWeight(r.grammi ?? 0), 0) / div
      : scanResults.reduce((acc, r) => acc + eff(r).d, 0) / n;
  const avgS =
    totalVirtualG > 0
      ? scanResults.reduce((acc, r) => acc + eff(r).s * virtualWeight(r.grammi ?? 0), 0) / div
      : scanResults.reduce((acc, r) => acc + eff(r).s, 0) / n;
  const avgA =
    totalVirtualG > 0
      ? scanResults.reduce((acc, r) => acc + eff(r).a * virtualWeight(r.grammi ?? 0), 0) / div
      : scanResults.reduce((acc, r) => acc + eff(r).a, 0) / n;
  const avgB =
    totalVirtualG > 0
      ? scanResults.reduce((acc, r) => acc + eff(r).b * virtualWeight(r.grammi ?? 0), 0) / div
      : scanResults.reduce((acc, r) => acc + eff(r).b, 0) / n;
  const avgU =
    totalVirtualG > 0
      ? scanResults.reduce((acc, r) => acc + eff(r).u * virtualWeight(r.grammi ?? 0), 0) / div
      : scanResults.reduce((acc, r) => acc + eff(r).u, 0) / n;

  // 2. Estrazione Picchi di Saturazione (il sapore più forte presente nel piatto)
  const maxD = Math.max(...scanResults.map((r) => eff(r).d));
  const maxS = Math.max(...scanResults.map((r) => eff(r).s));
  const maxA = Math.max(...scanResults.map((r) => eff(r).a));
  const maxB = Math.max(...scanResults.map((r) => eff(r).b));
  const maxU = Math.max(...scanResults.map((r) => eff(r).u));

  // 3. Modello di Fusione (Media + 40% del Picco)
  const d = Math.min(5, avgD + maxD * 0.4);
  const s = Math.min(5, avgS + maxS * 0.4);
  const a = Math.min(5, avgA + maxA * 0.4);
  const b = Math.min(5, avgB + maxB * 0.4);
  const u = Math.min(5, avgU + maxU * 0.4);
  const temp = totalVirtualG > 0 ? scanResults.reduce((a, r) => a + r.temp * virtualWeight(r.grammi ?? 0), 0) / div : scanResults.reduce((a, r) => a + r.temp, 0) / n;
  const melting = totalVirtualG > 0 ? scanResults.reduce((a, r) => a + r.melting * virtualWeight(r.grammi ?? 0), 0) / div : scanResults.reduce((a, r) => a + r.melting, 0) / n;
  const k = totalVirtualG > 0 ? scanResults.reduce((a, r) => a + r.k * virtualWeight(r.grammi ?? 0), 0) / div : scanResults.reduce((a, r) => a + r.k, 0) / n;
  const { S, M, loopEdonico } = soddisfazioneAdulto(d, s, a, b, u, temp, melting, 1, k);
  const asseX = Math.min((M / 12) * 100, 100);
  const asseY = Math.min(100, S);
  return { alimento: 'Piatto (ricetta)', magnitudo: M, soddisfazione: asseY, asseX, asseY, d, s, a, b, u, loopEdonico, temp, melting, k };
}

/** Da un profilo (nome, grammi, d,s,a,b,u) costruisce un ScanResult con temp/melting/k di default. */
function scanResultFromProfile(nome: string, grammi: number, d: number, s: number, a: number, b: number, u: number): ScanResult {
  const { S, M, loopEdonico } = soddisfazioneAdulto(d, s, a, b, u, 20, 0, 1, 0.3);
  const asseX = Math.min((M / 12) * 100, 100);
  const asseY = Math.min(100, S);
  return {
    alimento: nome,
    magnitudo: M,
    soddisfazione: asseY,
    asseX,
    asseY,
    d, s, a, b, u,
    loopEdonico,
    temp: 20,
    melting: 0,
    k: 0.3,
    grammi,
  };
}

/** Applica un'opzione: prima modifiche_grammi (aggiorna quantità ingredienti esistenti), poi sostituzioni, poi correttivi. */
export function applyOpzioneToResults(scanResults: ScanResult[], opzione: OpzioneCorrezione): ScanResult[] {
  let list = scanResults.map((r) => ({ ...r }));
  const norm = (s: string) => s.trim().toLowerCase();
  for (const m of opzione.modifiche_grammi ?? []) {
    const name = norm(m.nome);
    for (const r of list) {
      if (norm(r.alimento) === name) {
        r.grammi = Math.max(0, m.grammi);
        break;
      }
    }
  }
  for (const s of opzione.sostituzioni ?? []) {
    list = list.filter((r) => norm(r.alimento) !== norm(s.da));
    list.push(scanResultFromProfile(s.nome, s.grammi, s.d, s.s, s.a, s.b, s.u));
  }
  for (const c of opzione.correttivi ?? []) {
    list.push(scanResultFromProfile(c.nome, c.grammi, c.d, c.s, c.a, c.b, c.u));
  }
  return list;
}

export function computeCorrectedFromResults(scanResults: ScanResult[], opzioni: OpzioneCorrezione[]): ScanResult[] {
  return opzioni
    .map((op) => {
      const modified = applyOpzioneToResults(scanResults, op);
      const piatto = computePiattoFromResults(modified);
      if (!piatto) return null;
      return { ...piatto, alimento: `Corretto - ${op.nome}` };
    })
    .filter((r): r is ScanResult => r != null);
}

// ─── Equazioni Biochimica ─────────────────────────────────────────────────

export function calcolaFatigue(params: {
  proteine_g: number;
  carboidrati_g: number;
  grassi_g: number;
  temperatura_servizio_ideale?: number;
  freschezza_balsamica?: number;
  croccantezza_suono?: number;
}): number {
  const { proteine_g, carboidrati_g, grassi_g } = params;
  const placeholder = (proteine_g * 0.1 + carboidrati_g * 0.05 + (grassi_g ?? 0) * 0.08) * 0;
  return Math.round((placeholder + 0.5) * 100) / 100;
}

export function calcolaGlycogen(params: {
  carboidrati_g: number;
  proteine_g?: number;
  grassi_g?: number;
}): number {
  const { carboidrati_g } = params;
  const placeholder = carboidrati_g * 0.01 * 0;
  return Math.round((placeholder + 0.1) * 100) / 100;
}

export function calcolaMAG(voci: VoceBiochimica[]): number {
  if (voci.length === 0) return 0;
  let sommaPesata = 0;
  let sommaGrammi = 0;
  for (const v of voci) {
    const indice =
      (Number(v.temperatura_servizio_ideale ?? 0) + Number(v.freschezza_balsamica ?? 0) + Number(v.croccantezza_suono ?? 0)) / 3;
    sommaPesata += indice * v.grammi;
    sommaGrammi += v.grammi;
  }
  if (sommaGrammi === 0) return 0;
  return Math.round((sommaPesata / sommaGrammi) * 1000) / 1000;
}

// ─── Costa Index: Ebbrezza vs Conto ─────────────────────────────────────────

function getMagnitudoFromItem(item: ScanResult): number {
  const d = item.d ?? 0;
  const s = item.s ?? 0;
  const a = item.a ?? 0;
  const b = item.b ?? 0;
  const u = item.u ?? 0;
  const fromItem = item.magnitudo ?? 0;
  if (fromItem > 0) return fromItem;
  return Math.sqrt(d * d + s * s + a * a + b * b + u * u);
}

/** Esito del calcolo Costa Index (tachimetro + grafico). */
export type CostaIndexEsito = {
  costaIndex: number;
  Eb: number;
  Conto: number;
  R_gly: number;
  R_hep: number;
  R_dop: number;
  magnitudo: number;
};

/**
 * Costa Index: Ebbrezza Neurale / Conto Metabolico.
 * Numeratore Eb = piacere che stordisce; denominatore Conto = costo metabolico.
 */
export function computeCostaIndex(item: ScanResult | null): CostaIndexEsito | null {
  if (!item) return null;
  const d = item.d ?? 0;
  const s = item.s ?? 0;
  const cg = item.cg ?? 0;
  const b = item.b ?? 0;
  const u = item.u ?? 0;
  const temp = item.temp ?? 20;
  const melting = item.melting ?? 0;
  const k = item.k ?? 0.3;
  const magnitudo = getMagnitudoFromItem(item);

  const Eb = magnitudo * 1.5 + melting * 2 + Math.abs(37 - temp) / 10;
  const R_gly = Math.max(0, Math.max(d, cg) - b * 2) / 2;
  const R_hep = (u * s * melting) / 40;
  const R_dop = Math.max(0, magnitudo - 5) * k;
  const Conto = 1.0 + R_gly + R_hep + R_dop;
  // Normalizziamo l'Ebbrezza: un alimento base naturale ha Eb ~ 10.
  // Moltiplichiamo per 10 per scalare in base 100, poi dividiamo per il Conto.
  // Per evitare che i cibi iper-hackerati superino 100, mettiamo il cap.
  const baseScore = (Eb / 10) * 100;
  const costaIndex = Math.round(Math.max(0, Math.min(100, baseScore / Conto)));

  return { costaIndex, Eb, Conto, R_gly, R_hep, R_dop, magnitudo };
}

/** Opzioni per il grafico sistemico Costa Index. */
export type CostaIndexChartOptions = {
  tMax?: number;
  step?: number;
  toX: (t: number) => number;
  toY: (v: number) => number;
};

/** Dati per il grafico Spettro Sistemico (curve + indicatori). */
export type CostaIndexChartData = {
  ptsEbbrezza: string;
  ptsContoFatica: string;
  ptsGBR: string;
  ptsSensory: string;
  ptsWindow: string;
  R_gly: number;
  R_hep: number;
  R_dop: number;
  Conto: number;
};

export function getCostaIndexChartData(item: ScanResult, options: CostaIndexChartOptions): CostaIndexChartData {
  const { tMax = 120, step = 2, toX, toY } = options;
  const d = item.d ?? 0;
  const s = item.s ?? 0;
  const a = item.a ?? 0;
  const b = item.b ?? 0;
  const u = item.u ?? 0;
  const cg = item.cg ?? 0;
  const temp = item.temp ?? 20;
  const melting = item.melting ?? 0;
  const k = item.k ?? 0.3;
  const magnitudo = getMagnitudoFromItem(item);

  const Eb = magnitudo * 1.5 + melting * 2 + Math.abs(37 - temp) / 10;
  const R_gly = Math.max(0, Math.max(d, cg) - b * 2) / 2;
  const R_hep = (u * s * melting) / 40;
  const R_dop = Math.max(0, magnitudo - 5) * k;
  const Conto = 1.0 + R_gly + R_hep + R_dop;

  // Calibrazione Visiva per il Grafico
  const EbNorm = Math.min(100, (Eb / 12) * 100); // 12 è considerata Ebbrezza massima visiva
  const ContoFaticaNorm = Math.min(100, (R_hep / 0.8) * 100); // Se R_hep arriva a 0.8, la fatica percepita è al 100%
  const Gmax = Math.min(100, R_gly * 80); // Il GBR satura il grafico molto in fretta
  const SensMax = Math.min(100, ((a + s) / 5) * 100); // Stress cellulare basato su densità osmotica

  let ptsEbbrezza = '';
  let ptsContoFatica = '';
  let ptsGBR = '';
  let ptsSensory = '';
  let ptsWindow = '';

  for (let t = 0; t <= tMax; t += step) {
    const ebbrezzaY = EbNorm * Math.exp(-k * t * 4);
    const sensoryY = SensMax * Math.exp(-t / 15);
    const gbrY = Gmax * (t / 30) * Math.exp(1 - t / 30);
    const contoFaticaY = ContoFaticaNorm * (1 - Math.exp(-t / 40));
    const windowY = 100 * Math.exp(-t / 45);
    ptsEbbrezza += `${toX(t)},${toY(ebbrezzaY)} `;
    ptsSensory += `${toX(t)},${toY(sensoryY)} `;
    ptsGBR += `${toX(t)},${toY(gbrY)} `;
    ptsContoFatica += `${toX(t)},${toY(contoFaticaY)} `;
    ptsWindow += `${toX(t)},${toY(windowY)} `;
  }

  return { ptsEbbrezza, ptsContoFatica, ptsGBR, ptsSensory, ptsWindow, R_gly, R_hep, R_dop, Conto };
}

// ─── IBS 2.0 — The Taste Engine (11 vettori) ──────────────────────────────────

/**
 * Vettore statico "DNA" di un ingrediente crudo nella tabella `ingredienti_unificati`.
 * Tutti i valori sono espressi su scala 0–100.
 *
 * Mappatura sui simboli della formula IBS:
 * - U  (Umami)        -> v_sapidita_u
 * - S  (Salato)       -> v_salinita_s
 * - A  (Acido)        -> v_acidita_a
 * - Am (Amaro)        -> v_amarezza_b
 * - D  (Dolce)        -> v_dolcezza_d
 * - G  (Grasso)       -> indice_grasso_texture
 * - Cr (Croccante)    -> croccantezza_suono
 * - W  (Umidità)      -> succulenza_umidita
 * - K  (Kokumi)       -> v_kokumi_k
 * - Amil (Amilaceo)   -> v_amilaceo_amil
 * - Ca (Calcio/Astr.) -> v_calcio_ca
 */
export type TasteVector11 = {
  v_sapidita_u: number;
  v_salinita_s: number;
  v_acidita_a: number;
  v_amarezza_b: number;
  v_dolcezza_d: number;
  indice_grasso_texture: number;
  croccantezza_suono: number;
  succulenza_umidita: number;
  v_kokumi_k: number;
  v_amilaceo_amil: number;
  v_calcio_ca: number;
};

/** ID logico di una tecnica di cottura (colonna in `composizione_piatti`). */
export type CookingTechniqueId = string;

/**
 * Trasformatore di cottura: per ogni tecnica possiamo sommare e/o moltiplicare i vettori.
 * I valori sono delta / moltiplicatori in scala 0–100; il clamping 0–100 è fatto dopo.
 */
export type CookingTechniqueTransform = {
  add?: Partial<TasteVector11>;
  mul?: Partial<TasteVector11>;
};

/**
 * Dizionario di base per `tecniche_cottura`.
 * Nota: è pensato come default lato client; in produzione i valori possono arrivare
 * anche da Supabase mantenendo la stessa semantica (add/mul su 0–100).
 */
export const TECNICHE_COTTURA_BASE: Record<CookingTechniqueId, CookingTechniqueTransform> = {
  crudo: {
    add: {},
    mul: {},
  },
  fritto: {
    add: {
      indice_grasso_texture: 40,
    },
    mul: {
      croccantezza_suono: 5,
    },
  },
  griglia: {
    add: {
      v_amarezza_b: 10,
      indice_grasso_texture: 10,
    },
    mul: {
      succulenza_umidita: 0.8,
    },
  },
  bollito: {
    mul: {
      croccantezza_suono: 0.4,
      succulenza_umidita: 1.1,
    },
  },
  forno: {
    add: {
      v_dolcezza_d: 5,
    },
    mul: {
      croccantezza_suono: 1.5,
    },
  },
};

function clampTaste(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

/**
 * Applica una tecnica di cottura a un vettore statico 0–100 restituendo il vettore trasformato.
 * Se la tecnica non è definita in `TECNICHE_COTTURA_BASE`, il vettore resta invariato.
 */
export function applyCookingTechniqueVector(
  base: TasteVector11,
  tecnica: CookingTechniqueId | null | undefined,
  overrides?: Record<CookingTechniqueId, CookingTechniqueTransform>
): TasteVector11 {
  const table = overrides ?? TECNICHE_COTTURA_BASE;
  const tf = tecnica ? table[tecnica] : undefined;
  if (!tf) return { ...base };

  const add = tf.add ?? {};
  const mul = tf.mul ?? {};

  const withMul = <K extends keyof TasteVector11>(key: K): number => {
    const raw = base[key] ?? 0;
    const m = (mul[key] ?? 1) as number;
    return raw * m;
  };
  const withAdd = <K extends keyof TasteVector11>(key: K, current: number): number => {
    const delta = (add[key] ?? 0) as number;
    return current + delta;
  };

  const out: TasteVector11 = {
    v_sapidita_u: 0,
    v_salinita_s: 0,
    v_acidita_a: 0,
    v_amarezza_b: 0,
    v_dolcezza_d: 0,
    indice_grasso_texture: 0,
    croccantezza_suono: 0,
    succulenza_umidita: 0,
    v_kokumi_k: 0,
    v_amilaceo_amil: 0,
    v_calcio_ca: 0,
  };

  (Object.keys(out) as (keyof TasteVector11)[]).forEach((key) => {
    const afterMul = withMul(key);
    const afterAdd = withAdd(key, afterMul);
    out[key] = clampTaste(afterAdd);
  });

  return out;
}

/** Risultato del calcolo IBS 4.0 (motore neurogastronomico) per un vettore 11D. */
export type IBSResult = {
  /** Magnitudo assoluta pre-normalizzazione (rDop * cDyn * fReset). */
  ibsRaw: number;
  /** Valore normalizzato 0–100. */
  ibsPercent: number;
  /** I tre pilastri IBS 4.0: Drive dopaminergico, Contrasto dinamico, Clearance recettoriale. */
  components: {
    drive: number;
    contrasto: number;
    reset: number;
  };
};

/**
 * Calcola l’IBS 4.0 (motore neurogastronomico) per un vettore 11D già eventualmente
 * trasformato dalla tecnica di cottura.
 *
 * Segnale grezzo (U×S, D×Amil, G×K) → modulazione sazietà (burden vs cleansers) →
 * segnale netto → sigmoide (midpoint 60, steepness 0.035) → IBS 0–100.
 */
export function calcolaIBS(vec: TasteVector11): IBSResult {
  const U = clampTaste(vec.v_sapidita_u);
  const S = clampTaste(vec.v_salinita_s);
  const K = clampTaste(vec.v_kokumi_k);
  const G = clampTaste(vec.indice_grasso_texture);
  const A = clampTaste(vec.v_acidita_a);
  const Am = clampTaste(vec.v_amarezza_b);
  const D = clampTaste(vec.v_dolcezza_d);
  const Amil = clampTaste(vec.v_amilaceo_amil);
  const Cr = clampTaste(vec.croccantezza_suono);
  const W = clampTaste(vec.succulenza_umidita);
  const Ca = clampTaste(vec.v_calcio_ca);

  const rawSavory = (U * S) / 100;
  const rawComfort = (D * Amil) / 100;
  const rawFat = G * (1 + K / 100);
  const rawSignal = rawSavory + rawComfort + rawFat;

  const burden = G + (D > 50 ? D - 50 : 0);
  const cleansers = A + Am + Ca;
  const stucchevolezza = Math.max(0, burden - cleansers);
  const sssMultiplier = Math.max(0.3, 1 - stucchevolezza / 100);

  const glycogenBurnRate = D * 1.5 + Amil - G * 0.5;
  const fatiguePredictor = Math.max(0, glycogenBurnRate - U * 2);
  const metabolicWindow = Math.max(0.2, 1 - fatiguePredictor / 150);

  const netSignal =
    rawSignal * sssMultiplier * metabolicWindow - fatiguePredictor / 3;
  const finalSignal = Math.max(0, netSignal);

  const midpoint = 60;
  const steepness = 0.035;
  const ibsPercent =
    100 / (1 + Math.exp(-steepness * (finalSignal - midpoint)));

  return {
    ibsRaw: finalSignal,
    ibsPercent: Math.min(100, Math.max(0, ibsPercent)),
    components: {
      drive: rawSignal,
      contrasto: sssMultiplier,
      reset: finalSignal,
    },
  };
}

