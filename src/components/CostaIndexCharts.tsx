'use client';

import type { ScanResult } from '@/lib/scan';
import { getEffectiveProfile, RADAR_LABELS, getCostaIndexChartData } from '@/lib/scan';

export function itemColor(index: number, total: number): string {
  const hue = total > 0 ? (index * 137.5) % 360 : 0;
  return `hsl(${hue}, 72%, 55%)`;
}

export function CostaIndexRadarMulti({
  items,
  focusedIndex,
  itemColor: itemColorFn,
}: {
  items: ScanResult[];
  focusedIndex: number;
  itemColor: (index: number, total: number) => string;
}) {
  const cx = 110;
  const cy = 100;
  const R = 72;
  const angleStep = (2 * Math.PI) / 5;
  const startAngle = -Math.PI / 2;
  const angles = RADAR_LABELS.map((_, i) => startAngle + i * angleStep);
  const ghostVal = 3;

  const axisEndPoints = angles.map((rad) => ({
    x: cx + R * Math.cos(rad),
    y: cy + R * Math.sin(rad),
  }));
  const ghostPoints = angles.map((rad) => {
    const r = (ghostVal / 5) * R;
    return `${cx + r * Math.cos(rad)},${cy + r * Math.sin(rad)}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[320px] h-auto mx-auto block" style={{ display: 'block' }} xmlns="http://www.w3.org/2000/svg">
      {axisEndPoints.map((end, i) => (
        <line key={RADAR_LABELS[i].key} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#52525b" strokeWidth="1" />
      ))}
      <polygon points={ghostPoints} fill="rgba(255,255,255,0.08)" stroke="#71717a" strokeWidth="1" strokeDasharray="3 2" />
      {items.map((r, i) => {
        const eff = getEffectiveProfile(r);
        const values = [eff.d, eff.s, eff.a, eff.b, eff.u];
        const pts = angles.map((rad, j) => {
          const v = Math.min(5, Math.max(0, values[j]));
          const radius = (v / 5) * R;
          return `${cx + radius * Math.cos(rad)},${cy + radius * Math.sin(rad)}`;
        }).join(' ');
        const isFocused = i === focusedIndex;
        const opacity = isFocused ? 0.85 : 0.3;
        const color = itemColorFn(i, items.length);
        return (
          <polygon
            key={i}
            points={pts}
            fill={color}
            fillOpacity={opacity * 0.5}
            stroke={color}
            strokeWidth={isFocused ? 2.5 : 1}
            strokeOpacity={opacity}
          />
        );
      })}
      {RADAR_LABELS.map((lab, i) => {
        const rad = angles[i];
        const lx = cx + (R + 14) * Math.cos(rad);
        const ly = cy + (R + 14) * Math.sin(rad);
        return <text key={lab.key} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="#a1a1aa" fontSize="10">{lab.name}</text>;
      })}
    </svg>
  );
}

export function CostaIndexSystemicChart({ item }: { item: ScanResult | null }) {
  if (!item) return <div className="h-full flex items-center justify-center text-zinc-500 py-8">Nessun dato in focus</div>;

  const w = 400;
  const h = 220;
  const marginL = 36;
  const marginR = 12;
  const marginT = 40;
  const marginB = 28;
  const chartW = w - marginL - marginR;
  const chartH = h - marginT - marginB;
  const tMax = 120;
  const yMax = 100;

  const toX = (t: number) => marginL + (t / tMax) * chartW;
  const toY = (v: number) => marginT + chartH - (Math.min(yMax, Math.max(0, v)) / yMax) * chartH;

  const chart = getCostaIndexChartData(item, { tMax, step: 2, toX, toY });
  const { ptsEbbrezza, ptsContoFatica, ptsGBR, ptsSensory, ptsWindow, R_gly, R_hep, R_dop, Conto } = chart;

  return (
    <div className="flex flex-col">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" style={{ display: 'block' }} xmlns="http://www.w3.org/2000/svg">
        <rect width={w} height={h} fill="#000000" />
        <line x1={marginL} y1={marginT} x2={marginL} y2={marginT + chartH} stroke="#52525b" strokeWidth="1" />
        <line x1={marginL} y1={marginT + chartH} x2={marginL + chartW} y2={marginT + chartH} stroke="#52525b" strokeWidth="1" />
        {[0, 30, 60, 90, 120].map((t) => (
          <g key={`x-${t}`}>
            <line x1={toX(t)} y1={marginT + chartH} x2={toX(t)} y2={marginT + chartH + 4} stroke="#52525b" strokeWidth="1" />
            <text x={toX(t)} y={marginT + chartH + 14} textAnchor="middle" fill="#a1a1aa" fontSize="9">{t}</text>
          </g>
        ))}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={`y-${v}`}>
            <line x1={marginL - 4} y1={toY(v)} x2={marginL} y2={toY(v)} stroke="#52525b" strokeWidth="1" />
            <text x={marginL - 6} y={toY(v)} textAnchor="end" dominantBaseline="middle" fill="#a1a1aa" fontSize="9">{v}</text>
          </g>
        ))}
        <text x={marginL + chartW / 2} y={h - 2} textAnchor="middle" fill="#a1a1aa" fontSize="9">Tempo (Minuti post-ingestione)</text>
        <text x={10} y={marginT + chartH / 2} textAnchor="middle" fill="#a1a1aa" fontSize="9" transform={`rotate(-90, 10, ${marginT + chartH / 2})`}>Intensità %</text>
        <polyline points={ptsWindow.trim()} fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
        <polyline points={ptsContoFatica.trim()} fill="none" stroke="#ef4444" strokeWidth="2" opacity="0.8" />
        <polyline points={ptsGBR.trim()} fill="none" stroke="#3b82f6" strokeWidth="2" opacity="0.8" />
        <polyline points={ptsSensory.trim()} fill="none" stroke="#a855f7" strokeWidth="2.5" opacity="0.9" />
        <polyline points={ptsEbbrezza.trim()} fill="none" stroke="#eab308" strokeWidth="2.5" />
        <g transform={`translate(${marginL + 5}, 10)`}>
          <circle cx="0" cy="0" r="3" fill="#eab308" /><text x="6" y="3" fill="#eab308" fontSize="8" fontWeight="bold">Ebbrezza Neurale</text>
          <circle cx="95" cy="0" r="3" fill="#3b82f6" /><text x="101" y="3" fill="#3b82f6" fontSize="8" fontWeight="bold">GBR (Glicemia)</text>
          <circle cx="185" cy="0" r="3" fill="#ef4444" /><text x="191" y="3" fill="#ef4444" fontSize="8" fontWeight="bold">Il Conto (Fatica)</text>
          <circle cx="0" cy="14" r="3" fill="#a855f7" /><text x="6" y="17" fill="#a855f7" fontSize="8" fontWeight="bold">Stress Sensoriale</text>
          <circle cx="90" cy="14" r="3" fill="#22c55e" /><text x="96" y="17" fill="#22c55e" fontSize="8" fontWeight="bold">Metabolic Window</text>
        </g>
      </svg>
      <div className="mt-4 p-4 bg-zinc-900/60 border border-zinc-700 rounded-b-xl text-xs text-zinc-300 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <p className="font-bold text-zinc-400 uppercase tracking-wider">Legenda — Spettro Sistemico (0–120 min)</p>
          <span className="text-zinc-500 font-mono">Conto: {Conto.toFixed(2)}x</span>
        </div>
        <p className="text-zinc-500 italic border-b border-zinc-800 pb-2">
          L&apos;asse orizzontale è il tempo dopo l&apos;ingestione (minuti). L&apos;asse verticale è l&apos;intensità percentuale (0–100%) di ogni fenomeno. Ogni curva mostra come quel fattore evolve nel tempo.
        </p>
        <p className="leading-relaxed">
          <strong className="text-[#eab308] mr-1">Ebbrezza Neurale (giallo):</strong>{' '}
          Il potere inebriante del campione: quanto è forte il reward dopaminergico al primo morso. La curva mostra il decadimento nel tempo (P(t) = P0 · e^(-k·t)). Più è alta e più scende in fretta, più il cervello cerca il prossimo morso senza registrare sazietà.
        </p>
        <p className="leading-relaxed">
          <strong className="text-[#3b82f6] mr-1">GBR — Glicemia / Attrito Glicemico (blu):</strong>{' '}
          Modella il picco insulinico legato allo squilibrio dolce vs amaro (R_gly). Sale verso i 30 min e poi scende: se il picco è alto, segue letargia e calo energetico. Profilo bilanciato = curva più bassa e assorbimento più graduale.
        </p>
        <p className="leading-relaxed">
          <strong className="text-[#ef4444] mr-1">Il Conto — Fatica epatica/digestiva (rosso):</strong>{' '}
          La resistenza termodinamica del corpo: carico da umami × sale × grassi (R_hep). La curva sale nel tempo (food coma). Se supera l&apos;ebbrezza in intensità, sei in debito biologico: il pasto ti “costa” più di quanto ti dà in piacere duraturo.
        </p>
        <p className="leading-relaxed">
          <strong className="text-[#a855f7] mr-1">Stress sensoriale (viola):</strong>{' '}
          Densità osmotica e shock termico (acido + sale, temperatura vs texture). Alta quando sale e acido sono elevati: stress sulle mucose e rischio disidratazione recettoriale. Decade nel tempo.
        </p>
        <p className="leading-relaxed">
          <strong className="text-[#22c55e] mr-1">Metabolic Window (verde, tratteggiata):</strong>{' '}
          La finestra teorica in cui l&apos;organismo è più recettivo ai nutrienti (glicogeno, proteine, riparazione tissutale). Decade con costante tempo ~45 min: dopo l&apos;ingestione hai una finestra in cui ciò che mangi viene utilizzato in modo più efficiente; oltre quella, il “conto” metabolico e la fatica digestiva tendono a dominare. Allineare il pasto a questa curva significa massimizzare il rapporto beneficio/costo.
        </p>
        <p className="leading-relaxed pt-1 border-t border-zinc-700">
          <strong className="text-zinc-400">Debito di Sazietà (R_dop):</strong>{' '}
          {R_dop > 0.5 ? 'Loop edonico rilevato: magnitudo alta e decadimento rapido (k elevato); il cervello non registra sazietà e spinge a ripetere.' : 'Sapore persistente; sazietà meccanica e neurale favorita.'}
        </p>
      </div>
    </div>
  );
}
