'use client';

import { trendColor, trendIcon, sentimentMeta } from '@/lib/utils';
import type { TopicsResponse } from '@/lib/api';

interface Props {
  topics: TopicsResponse;
}

export function TopicsRanking({ topics }: Props) {
  const maxSalience = Math.max(...topics.topics.map((t) => t.salience), 0.01);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Issue Salience Ranking
        </h2>
        <span className="text-xs text-slate-500">Today · Ghana</span>
      </div>

      <div className="space-y-2.5">
        {topics.topics.map((topic, i) => {
          const sm = sentimentMeta(topic.sentiment);
          const salienceWidth = (topic.salience / maxSalience) * 100;

          return (
            <div key={topic.topic_id} className="flex items-center gap-3">
              {/* Rank */}
              <span className="text-slate-600 text-xs w-4 text-right shrink-0">{i + 1}</span>

              {/* Icon */}
              <span className="text-base shrink-0">{topic.icon}</span>

              {/* Label + bar */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-300 truncate">{topic.topic_label}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-xs font-medium ${sm.color}`}>
                      {topic.sentiment >= 0 ? '+' : ''}{(topic.sentiment * 100).toFixed(0)}
                    </span>
                    <span className={`text-xs ${trendColor(topic.trend)}`}>
                      {trendIcon(topic.trend)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${salienceWidth}%`,
                      backgroundColor:
                        topic.trend === 'rising' ? '#ef4444'
                        : topic.trend === 'falling' ? '#10b981'
                        : '#3b82f6',
                    }}
                  />
                </div>
              </div>

              {/* Signal count */}
              <span className="text-[11px] text-slate-500 shrink-0 w-12 text-right">
                {topic.signal_count >= 1000
                  ? `${(topic.signal_count / 1000).toFixed(1)}k`
                  : topic.signal_count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
