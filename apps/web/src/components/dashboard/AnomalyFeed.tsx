'use client';

import type { AnomaliesResponse } from '@/lib/api';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface Props {
  anomalies: AnomaliesResponse;
}

const SEVERITY_CONFIG = {
  high: { dot: 'bg-rose-500', text: 'text-rose-400', border: 'border-rose-500/30', label: 'HIGH' },
  medium: { dot: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/30', label: 'MED' },
  low: { dot: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/30', label: 'LOW' },
};

export function AnomalyFeed({ anomalies }: Props) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Anomaly Alerts
        </h2>
        {anomalies.count > 0 && (
          <span className="text-xs font-bold text-rose-400 bg-rose-500/20 border border-rose-500/30 rounded px-1.5 py-0.5">
            {anomalies.count}
          </span>
        )}
      </div>

      {anomalies.alerts.length === 0 ? (
        <div className="text-xs text-slate-500 py-4 text-center">
          No anomalies detected in the last 30 days ✓
        </div>
      ) : (
        <div className="space-y-2.5">
          {anomalies.alerts.slice(0, 4).map((alert) => {
            const sc = SEVERITY_CONFIG[alert.severity];
            return (
              <div
                key={alert.id}
                className={`rounded-lg border ${sc.border} bg-slate-800/50 p-3 space-y-1`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${sc.dot} animate-pulse-slow`} />
                    <span className={`text-[10px] font-bold ${sc.text}`}>{sc.label}</span>
                    {alert.topic && (
                      <span className="text-[10px] text-slate-400 border border-slate-700 rounded px-1">
                        {alert.topic}
                      </span>
                    )}
                    {alert.region && (
                      <span className="text-[10px] text-slate-500">{alert.region}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-600">
                    {formatDistanceToNow(parseISO(alert.detected_at))} ago
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{alert.description}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
