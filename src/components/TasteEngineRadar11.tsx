 'use client';

import type { TasteVector11 } from '@/lib/indicatori';

const AXES: { key: keyof TasteVector11; label: string }[] = [
  { key: 'v_sapidita_u', label: 'Umami' },
  { key: 'v_salinita_s', label: 'Salato' },
  { key: 'v_acidita_a', label: 'Acido' },
  { key: 'v_amarezza_b', label: 'Amaro' },
  { key: 'v_dolcezza_d', label: 'Dolce' },
  { key: 'indice_grasso_texture', label: 'Grasso/Texture' },
  { key: 'croccantezza_suono', label: 'Croccante' },
  { key: 'succulenza_umidita', label: 'Succulenza' },
  { key: 'v_kokumi_k', label: 'Kokumi' },
  { key: 'v_amilaceo_amil', label: 'Amilaceo' },
  { key: 'v_calcio_ca', label: 'Calcio/Astring.' },
];

export function TasteEngineRadar11({
  vector,
  title,
}: {
  vector: TasteVector11;
  title?: string;
}) {
  const cx = 130;
  const cy = 120;
  const R = 80;
  const count = AXES.length;
  const angleStep = (2 * Math.PI) / count;
  const startAngle = -Math.PI / 2;

  const angles = AXES.map((_, i) => startAngle + i * angleStep);

  const axisEndPoints = angles.map((rad) => ({
    x: cx + R * Math.cos(rad),
    y: cy + R * Math.sin(rad),
  }));

  const ring = (percent: number) =>
    angles
      .map((rad) => {
        const r = (percent / 100) * R;
        const x = cx + r * Math.cos(rad);
        const y = cy + r * Math.sin(rad);
        return `${x},${y}`;
      })
      .join(' ');

  const dataPoints = angles.map((rad, i) => {
    const axis = AXES[i]!;
    const raw = vector[axis.key] ?? 0;
    const v = Math.max(0, Math.min(100, Number(raw)));
    const r = (v / 100) * R;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
      value: v,
    };
  });

  const polygonPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="w-full flex flex-col items-center">
      {title && (
        <p className="text-sm font-semibold text-[#fafafa] mb-2 truncate max-w-full" title={title}>
          {title}
        </p>
      )}
      <svg
        viewBox="0 0 260 240"
        className="w-full max-w-[260px] h-auto"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Taste Engine Radar 11D"
      >
        <rect width="260" height="240" fill="#020617" />
        {axisEndPoints.map((end, i) => (
          <line
            key={`axis-${AXES[i]!.key as string}`}
            x1={cx}
            y1={cy}
            x2={end.x}
            y2={end.y}
            stroke="#27272a"
            strokeWidth={1}
          />
        ))}
        <polygon points={ring(100)} fill="none" stroke="#3f3f46" strokeWidth={1} />
        <polygon points={ring(50)} fill="none" stroke="#27272a" strokeWidth={1} strokeDasharray="3 3" />
        <polygon points={ring(25)} fill="none" stroke="#18181b" strokeWidth={1} />
        <polygon
          points={polygonPoints}
          fill="rgba(16, 185, 129, 0.28)"
          stroke="#22c55e"
          strokeWidth={2}
        />
        {AXES.map((axis, i) => {
          const rad = angles[i]!;
          const lx = cx + (R + 18) * Math.cos(rad);
          const ly = cy + (R + 18) * Math.sin(rad);
          return (
            <text
              key={`label-${axis.key as string}`}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#a1a1aa"
              fontSize="9"
            >
              {axis.label}
            </text>
          );
        })}
      </svg>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-zinc-400">
        {AXES.map((axis, i) => (
          <div key={axis.key as string} className="flex justify-between gap-2">
            <span className="truncate">{axis.label}</span>
            <span className="text-[#fafafa] tabular-nums">
              {dataPoints[i]!.value.toFixed(0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

