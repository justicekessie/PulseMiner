'use client';

import type { NationalMood } from '@/lib/api';

interface Props {
  mood: NationalMood;
}

export function ConfidenceNote({ mood }: Props) {
  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span>⚠️</span>
        <h2 className="text-sm font-semibold text-amber-300 uppercase tracking-wider">
          Methodology & Confidence
        </h2>
      </div>

      <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
        <p>
          <strong className="text-slate-300">What this shows:</strong> Estimated public mood based on
          aggregated online signals and widget responses — not a population survey.
        </p>
        <p>
          <strong className="text-slate-300">Confidence:</strong>{' '}
          <span className="text-amber-300 font-bold">{(mood.confidence * 100).toFixed(0)}%</span>{' '}
          — based on signal volume and source diversity.
        </p>
        <p>
          <strong className="text-slate-300">Signals today:</strong>{' '}
          {mood.signal_count.toLocaleString()} processed events (news, synthetic, widget)
        </p>
        <p>
          <strong className="text-slate-300">Bias note:</strong> Online signals over-represent
          urban, English-speaking, and digitally connected populations.
        </p>

        <div className="pt-1 border-t border-amber-500/20">
          <p className="text-[11px] italic">{mood.coverage_note}</p>
        </div>
      </div>

      {/* Source breakdown */}
      <div className="space-y-1">
        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Source Mix</p>
        <div className="flex gap-1.5 flex-wrap">
          {[
            { label: 'Synthetic', pct: 45, color: 'bg-slate-600' },
            { label: 'News', pct: 30, color: 'bg-blue-600' },
            { label: 'Widget', pct: 25, color: 'bg-teal-600' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1 text-[11px] text-slate-400">
              <span className={`h-2 w-2 rounded-sm ${s.color}`} />
              {s.label} {s.pct}%
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
