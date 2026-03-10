'use client';

import { concernColor, sentimentMeta } from '@/lib/utils';
import type { RegionsData } from '@/lib/api';

interface Props {
  regions: RegionsData;
}

const ZONE_COLORS = {
  south: 'border-blue-500/30',
  middle: 'border-amber-500/30',
  north: 'border-emerald-500/30',
};
const ZONE_LABELS = {
  south: 'South',
  middle: 'Middle Belt',
  north: 'North',
};

export function RegionsGrid({ regions }: Props) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            All 16 Regions — Sentiment Snapshot
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">March 10, 2026 · Click a region for detail</p>
        </div>
        {/* Zone legend */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-blue-500/50" /> South</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-500/50" /> Middle</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500/50" /> North</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8 gap-2">
        {regions.regions.map((region) => {
          const sentScore = region.sentiment_index ?? 0;
          const sm = sentimentMeta(sentScore);
          const concernHex = concernColor(region.concern_index ?? 0);
          const zone = region.zone as keyof typeof ZONE_COLORS;

          return (
            <button
              key={region.region_id}
              className={`text-left rounded-lg border ${ZONE_COLORS[zone] ?? 'border-slate-700'} bg-slate-800/50 hover:bg-slate-800 transition-colors p-2.5 space-y-1.5 group`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-300 leading-tight group-hover:text-white transition-colors truncate max-w-[80px]">
                  {region.region_name}
                </span>
                <span className="text-base">{sm.emoji}</span>
              </div>

              {/* Sentiment score */}
              <div className={`text-lg font-bold ${sm.color}`}>
                {sentScore >= 0 ? '+' : ''}{(sentScore * 100).toFixed(0)}
              </div>

              {/* Concern bar */}
              <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(region.concern_index ?? 0) * 100}%`,
                    backgroundColor: concernHex,
                  }}
                />
              </div>

              {/* Top topic */}
              <div className="text-[10px] text-slate-500 truncate">
                {region.top_topic ?? '—'}
              </div>

              {/* Signal count */}
              <div className="text-[10px] text-slate-600">
                {region.signal_count.toLocaleString()} signals
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
