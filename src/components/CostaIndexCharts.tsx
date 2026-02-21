'use client';

import type { ScanResult } from '@/lib/scan';
import { getEffectiveProfile, RADAR_LABELS } from '@/lib/scan';

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

  const d = item.d ?? 0;
  const s = item.s ?? 0;
  const a = item.a ?? 0;
  const b = item.b ?? 0;
  const u = item.u ?? 0;
  const temp = item.temp ?? 20;
  const melting = item.melting ?? 0;
  const k = item.k ?? 0.3;
  const magnitudo = (item.magnitudo ?? 0) > 0 ? item.magnitudo! : Math.sqrt(d * d + s * s + a * a + b * b + u * u);

  // Ebbrezza Neurale (il piacere che stordisce) — scala 0–100 per grafico
  const Eb = (magnitudo * 1.5) + (melting * 2) + (Math.abs(37 - temp) / 10);
  const EbNorm = Math.min(100, (Eb / 15) * 100);

  // Il Conto Metabolico (quanto ti costa)
  const R_gly = Math.max(0, d - (b * 2)) / 2;
  const R_hep = (u * s * melting) / 40;
  const R_dop = Math.max(0, magnitudo - 5) * k;
  const Conto = 1.0 + R_gly + R_hep + R_dop;
  const ContoFaticaNorm = Math.min(100, (R_hep / 2) * 100);

  const Gmax = Math.min(100, R_gly * 50);
  const SensMax = (Math.min(1, (a + s) / 10) / 1) * 100;

  let ptsEbbrezza = '';
  let ptsSensory = '';
  let ptsGBR = '';
  let ptsContoFatica = '';
  let ptsWindow = '';

  for (let t = 0; t <= tMax; t += 2) {
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
      <div className="mt-4 p-4 bg-zinc-900/60 border border-zinc-700 rounded-b-xl text-xs text-zinc-300 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <p className="font-bold text-zinc-400 uppercase tracking-wider">Ebbrezza vs Conto</p>
          <span className="text-zinc-500 font-mono">Conto: {Conto.toFixed(2)}x</span>
        </div>
        <p className="leading-relaxed">
          <strong className="text-[#eab308] mr-1">Ebbrezza Neurale:</strong>{' '}
          Potere inebriante del campione. Più è alto, più il reward dopaminergico è violento.
        </p>
        <p className="leading-relaxed">
          <strong className="text-[#ef4444] mr-1">Il Conto:</strong>{' '}
          La resistenza termodinamica del tuo corpo. Se supera l&apos;ebbrezza, sei in debito biologico.
        </p>
        <p className="leading-relaxed">
          <strong className="text-[#3b82f6] mr-1">Attrito Glicemico (R_gly):</strong>{' '}
          {R_gly > 0.5 ? 'Dolce non bilanciato da amaro: picco insulinico e letargia a 30 min.' : 'Profilo bilanciato; assorbimento più graduale.'}
        </p>
        <p className="leading-relaxed">
          <strong className="text-[#a855f7] mr-1">Debito di Sazietà (R_dop):</strong>{' '}
          {R_dop > 0.5 ? 'Loop edonico: magnitudo alta e decadimento rapido; il cervello non registra sazietà.' : 'Sapore persistente; sazietà meccanica e neurale favorita.'}
        </p>
      </div>
    </div>
  );
}
