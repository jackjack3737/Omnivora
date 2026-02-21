'use client';

import { RADAR_LABELS } from '@/lib/scan';

export function RadarChartPentagon({
  d, s, a, b, u, alimento,
}: { d: number; s: number; a: number; b: number; u: number; alimento: string }) {
  const cx = 110;
  const cy = 100;
  const R = 72;
  const values = [d, s, a, b, u];
  const angleStep = (2 * Math.PI) / 5;
  const startAngle = -Math.PI / 2;
  const angles = RADAR_LABELS.map((_, i) => startAngle + i * angleStep);

  const axisEndPoints = angles.map((rad) => ({
    x: cx + R * Math.cos(rad),
    y: cy + R * Math.sin(rad),
  }));

  const dataPoints = angles.map((rad, i) => {
    const v = Math.min(5, Math.max(0, values[i]));
    const r = (v / 5) * R;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  });

  const polygonPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const labelOffset = 14;

  return (
    <div className="w-full p-4 flex flex-col items-center">
      <p className="text-[#fafafa] font-semibold text-sm mb-2 truncate max-w-full" title={alimento}>
        {alimento}
      </p>
      <svg
        viewBox="0 0 220 220"
        className="w-full max-w-[220px] h-auto"
        style={{ flexShrink: 0 }}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Pentagono dei Sapori"
      >
        {axisEndPoints.map((end, i) => (
          <line key={RADAR_LABELS[i].key} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#52525b" strokeWidth="1" />
        ))}
        <polygon points={polygonPoints} fill="rgba(234, 88, 12, 0.4)" stroke="#ea580c" strokeWidth="1.5" />
        {angles.map((rad, i) => {
          const lx = cx + (R + labelOffset) * Math.cos(rad);
          const ly = cy + (R + labelOffset) * Math.sin(rad);
          return (
            <text key={RADAR_LABELS[i].key} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="#a1a1aa" fontSize="10" fontWeight="500">
              {RADAR_LABELS[i].name} ({RADAR_LABELS[i].key})
            </text>
          );
        })}
      </svg>
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-zinc-400">
        {RADAR_LABELS.map((lab, i) => (
          <span key={lab.key}>{lab.name}: <strong className="text-[#fafafa]">{values[i].toFixed(2)}</strong></span>
        ))}
      </div>
    </div>
  );
}
