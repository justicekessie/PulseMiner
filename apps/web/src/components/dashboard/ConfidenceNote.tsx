'use client';

import { useEffect, useState } from 'react';
import type { NationalMood } from '@/lib/api';

interface SourceStat {
  source_type: string;
  count: number;
  percentage: number;
}

interface Props {
  mood: NationalMood;
}

const SOURCE_COLORS: Record<string, string> = {
  news_article: 'bg-blue-600',
  public_comment: 'bg-violet-600',
  synthetic: 'bg-slate-600',
  social_post: 'bg-emerald-600',
  widget_response: 'bg-teal-600',
  voice_submission: 'bg-amber-600',
  search_trend: 'bg-cyan-600',
};

const SOURCE_LABELS: Record<string, string> = {
  news_article: 'News',
  public_comment: 'Comments',
  synthetic: 'Synthetic',
  social_post: 'Social',
  widget_response: 'Widget',
  voice_submission: 'Voice',
  search_trend: 'Trends',
};

export function ConfidenceNote({ mood }: Props) {
  const [sources, setSources] = useState<SourceStat[]>([
    { source_type: 'synthetic', count: 0, percentage: 45 },
    { source_type: 'news_article', count: 0, percentage: 30 },
    { source_type: 'widget_response', count: 0, percentage: 25 },
  ]);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    fetch(`${API}/api/stats/sources`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.all_time?.sources?.length > 0) {
          setSources(data.all_time.sources);
        }
      })
      .catch(() => {
        // Keep fallback values
      });
  }, []);

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
          {mood.signal_count.toLocaleString()} processed events
        </p>
        <p>
          <strong className="text-slate-300">Bias note:</strong> Online signals over-represent
          urban, English-speaking, and digitally connected populations.
        </p>

        <div className="pt-1 border-t border-amber-500/20">
          <p className="text-[11px] italic">{mood.coverage_note}</p>
        </div>
      </div>

      {/* Source breakdown — live data */}
      <div className="space-y-1">
        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Source Mix</p>
        <div className="flex gap-1.5 flex-wrap">
          {sources.map((s) => (
            <div key={s.source_type} className="flex items-center gap-1 text-[11px] text-slate-400">
              <span className={`h-2 w-2 rounded-sm ${SOURCE_COLORS[s.source_type] ?? 'bg-slate-500'}`} />
              {SOURCE_LABELS[s.source_type] ?? s.source_type} {s.percentage}%
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
