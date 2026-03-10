'use client';

import { sentimentMeta, concernColor } from '@/lib/utils';
import type { NationalMood } from '@/lib/api';

interface Props {
  mood: NationalMood;
}

export function NationalMoodGauge({ mood }: Props) {
  const sm = sentimentMeta(mood.overall_sentiment);

  // Convert sentiment –1→+1 to 0→180 degrees for the gauge arc
  const degrees = ((mood.overall_sentiment + 1) / 2) * 180;
  const cx = 110, cy = 110, r = 80;
  const startAngle = 180; // degrees
  const endAngle = startAngle + degrees; // we go counterclockwise from 0° sentinel
  const toRad = (d: number) => (d * Math.PI) / 180;

  // Arc path (starting from far left = 180°, sweeping to the right)
  const arcStart = { x: cx + r * Math.cos(toRad(180)), y: cy + r * Math.sin(toRad(180)) };
  const arcEnd = {
    x: cx + r * Math.cos(toRad(180 - degrees)),
    y: cy + r * Math.sin(toRad(180 - degrees)),
  };
  const largeArc = degrees > 180 ? 1 : 0;

  const arcColor =
    mood.overall_sentiment >= 0.1 ? '#10b981'
    : mood.overall_sentiment >= -0.1 ? '#f59e0b'
    : '#ef4444';

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          National Mood Gauge
        </h2>
        <span className="text-xs text-slate-500">Ghana · 10 Mar 2026</span>
      </div>

      {/* SVG Gauge */}
      <div className="flex justify-center">
        <svg width="220" height="130" viewBox="0 0 220 130">
          {/* Background arc track */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="#1e293b"
            strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Sentiment arc */}
          <path
            d={`M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 ${largeArc} 1 ${arcEnd.x} ${arcEnd.y}`}
            fill="none"
            stroke={arcColor}
            strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Needle */}
          <line
            x1={cx}
            y1={cy}
            x2={cx + (r - 20) * Math.cos(toRad(180 - degrees))}
            y2={cy + (r - 20) * Math.sin(toRad(180 - degrees))}
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r="5" fill="white" />

          {/* Labels */}
          <text x="18" y={cy + 20} fill="#64748b" fontSize="10" textAnchor="middle">–</text>
          <text x="cx" y="20" fill="#64748b" fontSize="10" textAnchor="middle">0</text>
          <text x="198" y={cy + 20} fill="#64748b" fontSize="10" textAnchor="middle">+</text>
        </svg>
      </div>

      {/* Score display */}
      <div className="text-center -mt-2">
        <div className={`text-3xl font-bold ${sm.color}`}>
          {mood.overall_sentiment >= 0 ? '+' : ''}{(mood.overall_sentiment * 100).toFixed(0)}
          <span className="text-sm font-normal text-slate-400"> / 100</span>
        </div>
        <div className={`text-sm font-medium mt-0.5 ${sm.color}`}>
          {sm.emoji} {sm.label}
        </div>
      </div>

      {/* Mini bars */}
      <div className="mt-4 space-y-2">
        <MiniBar label="Concern" value={mood.overall_concern} color={concernColor(mood.overall_concern)} />
        <MiniBar label="Optimism" value={mood.overall_optimism} color="#10b981" />
      </div>

      {/* Anomaly flag */}
      {mood.anomaly_flags.length > 0 && (
        <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-300">
          🚨 Anomaly detected: {mood.anomaly_flags.join(', ')}
        </div>
      )}
    </div>
  );
}

function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
