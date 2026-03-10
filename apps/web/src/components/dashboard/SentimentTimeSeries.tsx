'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import type { TimeSeriesData } from '@/lib/api';
import { format, parseISO } from 'date-fns';

interface Props {
  data: TimeSeriesData;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/95 p-3 text-xs shadow-xl">
      <p className="font-medium text-slate-200 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-medium" style={{ color: p.color }}>
            {(p.value >= 0 ? '+' : '') + (p.value * 100).toFixed(0)}
          </span>
        </div>
      ))}
    </div>
  );
};

export function SentimentTimeSeries({ data }: Props) {
  const chartData = data.series.map((s) => ({
    ...s,
    date: format(parseISO(s.date), 'MMM d'),
    sentiment_display: Number((s.sentiment_index * 100).toFixed(1)),
    concern_display: Number((s.concern_index * 100).toFixed(1)),
    optimism_display: Number((s.optimism_index * 100).toFixed(1)),
  }));

  // Show every 5th label to avoid crowding
  const tickEvery = Math.ceil(chartData.length / 6);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Sentiment Trend — Last 30 Days
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">National · All topics · Ghana</p>
        </div>
        <div className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">{data.series.length} days</div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -30 }}>
          <defs>
            <linearGradient id="sentimentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="concernGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="optimismGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={tickEvery - 1}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '8px' }}
            formatter={(value) =>
              value === 'sentiment_display' ? 'Sentiment'
              : value === 'concern_display' ? 'Concern'
              : 'Optimism'
            }
          />
          <ReferenceLine y={0} stroke="#334155" strokeDasharray="4 2" />
          <Area type="monotone" dataKey="sentiment_display" stroke="#3b82f6" strokeWidth={2} fill="url(#sentimentGrad)" name="sentiment_display" dot={false} />
          <Area type="monotone" dataKey="concern_display" stroke="#ef4444" strokeWidth={1.5} fill="url(#concernGrad)" name="concern_display" dot={false} strokeDasharray="4 2" />
          <Area type="monotone" dataKey="optimism_display" stroke="#10b981" strokeWidth={1.5} fill="url(#optimismGrad)" name="optimism_display" dot={false} strokeDasharray="4 2" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
