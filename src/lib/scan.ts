/** Tipi e funzioni condivise per Scan Detector, Scan Ricette e Costa Index. */

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
export type OpzioneCorrezione = { nome: string; descrizione: string; correttivi: CorrettivoOpzione[]; passaggi?: string[] };

export type SuggerimentoCottura = {
  ingrediente: string;
  cottura_consigliata: string;
  temperatura_consigliata?: number;
  motivo: string;
};

export const COSTA_INDEX_TABLE = 'costa_index_items';

export const COTTURA_DELTA: Record<string, { d: number; s: number; a: number; b: number; u: number }> = {
  '': { d: 0, s: 0, a: 0, b: 0, u: 0 },
  crudo: { d: 0, s: 0, a: 0.2, b: 0, u: 0 },
  vapore: { d: 0, s: 0, a: 0, b: 0, u: 0 },
  bollito: { d: 0, s: 0, a: 0, b: 0, u: 0.1 },
  griglia: { d: 0, s: 0, a: 0.1, b: 0.4, u: 0 },
  fritto: { d: 0, s: 0, a: 0, b: 0.15, u: 0.2 },
  forno: { d: 0, s: 0, a: 0, b: 0.1, u: 0.2 },
  caramellizzato: { d: 0.5, s: 0, a: 0, b: 0.1, u: 0 },
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
];

export const RADAR_LABELS = [
  { key: 'd', name: 'Dolce' },
  { key: 's', name: 'Salato' },
  { key: 'a', name: 'Acido' },
  { key: 'b', name: 'Amaro' },
  { key: 'u', name: 'Umami' },
] as const;

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
  const rawD = totalVirtualG > 0 ? scanResults.reduce((a, r) => a + eff(r).d * virtualWeight(r.grammi ?? 0), 0) / div : scanResults.reduce((a, r) => a + eff(r).d, 0) / n;
  const rawS = totalVirtualG > 0 ? scanResults.reduce((a, r) => a + eff(r).s * virtualWeight(r.grammi ?? 0), 0) / div : scanResults.reduce((a, r) => a + eff(r).s, 0) / n;
  const rawA = totalVirtualG > 0 ? scanResults.reduce((a, r) => a + eff(r).a * virtualWeight(r.grammi ?? 0), 0) / div : scanResults.reduce((a, r) => a + eff(r).a, 0) / n;
  const rawB = totalVirtualG > 0 ? scanResults.reduce((a, r) => a + eff(r).b * virtualWeight(r.grammi ?? 0), 0) / div : scanResults.reduce((a, r) => a + eff(r).b, 0) / n;
  const rawU = totalVirtualG > 0 ? scanResults.reduce((a, r) => a + eff(r).u * virtualWeight(r.grammi ?? 0), 0) / div : scanResults.reduce((a, r) => a + eff(r).u, 0) / n;
  const d = Math.min(5, rawD);
  const s = Math.min(5, rawS);
  const a = Math.min(5, rawA);
  const b = Math.min(5, rawB);
  const u = Math.min(5, rawU);
  const temp = totalVirtualG > 0 ? scanResults.reduce((a, r) => a + r.temp * virtualWeight(r.grammi ?? 0), 0) / div : scanResults.reduce((a, r) => a + r.temp, 0) / n;
  const melting = totalVirtualG > 0 ? scanResults.reduce((a, r) => a + r.melting * virtualWeight(r.grammi ?? 0), 0) / div : scanResults.reduce((a, r) => a + r.melting, 0) / n;
  const k = totalVirtualG > 0 ? scanResults.reduce((a, r) => a + r.k * virtualWeight(r.grammi ?? 0), 0) / div : scanResults.reduce((a, r) => a + r.k, 0) / n;
  const { S, M, loopEdonico } = soddisfazioneAdulto(d, s, a, b, u, temp, melting, 1, k);
  const asseX = Math.min((M / 12) * 100, 100);
  const asseY = Math.min(100, S);
  return { alimento: 'Piatto (ricetta)', magnitudo: M, soddisfazione: asseY, asseX, asseY, d, s, a, b, u, loopEdonico, temp, melting, k };
}

export function computeCorrectedFromResults(scanResults: ScanResult[], opzioni: OpzioneCorrezione[]): ScanResult[] {
  const eff = (r: ScanResult) => getEffectiveProfile(r);
  const baseVirtualG = scanResults.reduce((a, r) => a + virtualWeight(r.grammi ?? 0), 0);
  return opzioni
    .map((op) => {
      const correttiviVirtualG = op.correttivi.reduce((a, c) => a + virtualWeight(c.grammi), 0);
      const totalVirtualG = baseVirtualG + correttiviVirtualG;
      if (totalVirtualG <= 0) return null;
      const numD = scanResults.reduce((a, r) => a + eff(r).d * virtualWeight(r.grammi ?? 0), 0) + op.correttivi.reduce((a, c) => a + c.d * virtualWeight(c.grammi), 0);
      const numS = scanResults.reduce((a, r) => a + eff(r).s * virtualWeight(r.grammi ?? 0), 0) + op.correttivi.reduce((a, c) => a + c.s * virtualWeight(c.grammi), 0);
      const numA = scanResults.reduce((a, r) => a + eff(r).a * virtualWeight(r.grammi ?? 0), 0) + op.correttivi.reduce((a, c) => a + c.a * virtualWeight(c.grammi), 0);
      const numB = scanResults.reduce((a, r) => a + eff(r).b * virtualWeight(r.grammi ?? 0), 0) + op.correttivi.reduce((a, c) => a + c.b * virtualWeight(c.grammi), 0);
      const numU = scanResults.reduce((a, r) => a + eff(r).u * virtualWeight(r.grammi ?? 0), 0) + op.correttivi.reduce((a, c) => a + c.u * virtualWeight(c.grammi), 0);
      const dC = Math.min(5, numD / totalVirtualG);
      const sC = Math.min(5, numS / totalVirtualG);
      const aC = Math.min(5, numA / totalVirtualG);
      const bC = Math.min(5, numB / totalVirtualG);
      const uC = Math.min(5, numU / totalVirtualG);
      const tempC = (scanResults.reduce((a, r) => a + r.temp * virtualWeight(r.grammi ?? 0), 0) + 20 * correttiviVirtualG) / totalVirtualG;
      const meltingC = (scanResults.reduce((a, r) => a + r.melting * virtualWeight(r.grammi ?? 0), 0) + 0 * correttiviVirtualG) / totalVirtualG;
      const kC = (scanResults.reduce((a, r) => a + r.k * virtualWeight(r.grammi ?? 0), 0) + 0.3 * correttiviVirtualG) / totalVirtualG;
      const { S: SC, M: MC, loopEdonico: loopC } = soddisfazioneAdulto(dC, sC, aC, bC, uC, tempC, meltingC, 1, kC);
      const axeX = Math.min((MC / 12) * 100, 100);
      const axeY = Math.min(100, SC);
      return { alimento: `Corretto - ${op.nome}`, magnitudo: MC, soddisfazione: axeY, asseX: axeX, asseY: axeY, d: dC, s: sC, a: aC, b: bC, u: uC, loopEdonico: loopC, temp: tempC, melting: meltingC, k: kC };
    })
    .filter((r): r is ScanResult => r != null);
}
