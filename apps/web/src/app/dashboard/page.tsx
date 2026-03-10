'use client';

import { useEffect, useState } from 'react';
import { MOCK_NATIONAL_MOOD, MOCK_TIMESERIES, MOCK_REGIONS, MOCK_TOPICS, MOCK_ANOMALIES } from '@/lib/mock-data';
import type { NationalMood, TimeSeriesData, RegionsData, TopicsResponse, AnomaliesResponse } from '@/lib/api';
import { sentimentMeta, concernColor, trendIcon, trendColor, formatScore, pct } from '@/lib/utils';
import { NationalMoodGauge } from '@/components/dashboard/NationalMoodGauge';
import { SentimentTimeSeries } from '@/components/dashboard/SentimentTimeSeries';
import { RegionsGrid } from '@/components/dashboard/RegionsGrid';
import { TopicsRanking } from '@/components/dashboard/TopicsRanking';
import { AnomalyFeed } from '@/components/dashboard/AnomalyFeed';
import { MicroPulseWidget } from '@/components/dashboard/MicroPulseWidget';
import { Header } from '@/components/layout/Header';
import { ConfidenceNote } from '@/components/dashboard/ConfidenceNote';

export default function DashboardPage() {
  const [mood, setMood] = useState<NationalMood>(MOCK_NATIONAL_MOOD);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesData>(MOCK_TIMESERIES);
  const [regions, setRegions] = useState<RegionsData>(MOCK_REGIONS);
  const [topics, setTopics] = useState<TopicsResponse>(MOCK_TOPICS);
  const [anomalies, setAnomalies] = useState<AnomaliesResponse>(MOCK_ANOMALIES);
  const [apiStatus, setApiStatus] = useState<'live' | 'demo'>('demo');

  useEffect(() => {
    // Attempt to load live data; fall back silently to demo data
    const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

    async function loadLiveData() {
      try {
        const [m, ts, r, t, a] = await Promise.all([
          fetch(`${API}/api/mood`).then((res) => (res.ok ? res.json() : null)),
          fetch(`${API}/api/mood/timeseries?days=30`).then((res) => (res.ok ? res.json() : null)),
          fetch(`${API}/api/regions`).then((res) => (res.ok ? res.json() : null)),
          fetch(`${API}/api/topics`).then((res) => (res.ok ? res.json() : null)),
          fetch(`${API}/api/anomalies`).then((res) => (res.ok ? res.json() : null)),
        ]);

        if (m) { setMood(m); setApiStatus('live'); }
        if (ts) setTimeSeries(ts);
        if (r) setRegions(r);
        if (t) setTopics(t);
        if (a) setAnomalies(a);
      } catch {
        // Stay in demo mode
      }
    }

    loadLiveData();
  }, []);

  const sm = sentimentMeta(mood.overall_sentiment);

  return (
    <div className="min-h-screen bg-slate-950">
      <Header apiStatus={apiStatus} />

      <main className="max-w-screen-2xl mx-auto px-4 py-6 space-y-6">
        {/* ── Top KPI Strip ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="National Sentiment"
            value={`${formatScore(mood.overall_sentiment)}`}
            unit="%"
            sub={sm.label}
            color={sm.color}
            bgColor={sm.bgColor}
            emoji={sm.emoji}
          />
          <KpiCard
            label="Concern Index"
            value={pct(mood.overall_concern)}
            sub="Public concern level"
            color={mood.overall_concern > 0.6 ? 'text-rose-400' : 'text-amber-400'}
            bgColor={mood.overall_concern > 0.6 ? 'bg-rose-500/20' : 'bg-amber-500/20'}
            emoji="⚠️"
          />
          <KpiCard
            label="Optimism Index"
            value={pct(mood.overall_optimism)}
            sub="Forward-looking sentiment"
            color={mood.overall_optimism > 0.45 ? 'text-emerald-400' : 'text-slate-400'}
            bgColor={mood.overall_optimism > 0.45 ? 'bg-emerald-500/20' : 'bg-slate-700/40'}
            emoji="🌤️"
          />
          <KpiCard
            label="Signals Processed"
            value={mood.signal_count.toLocaleString()}
            sub={`Confidence: ${pct(mood.confidence)}`}
            color="text-blue-400"
            bgColor="bg-blue-500/20"
            emoji="📡"
          />
        </div>

        {/* ── Main 2-column grid ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Gauge + Anomalies */}
          <div className="space-y-6">
            <NationalMoodGauge mood={mood} />
            <AnomalyFeed anomalies={anomalies} />
          </div>

          {/* Centre: Time Series */}
          <div className="lg:col-span-2 space-y-6">
            <SentimentTimeSeries data={timeSeries} />
            <TopicsRanking topics={topics} />
          </div>
        </div>

        {/* ── Regional Grid ─────────────────────────────────────────────── */}
        <RegionsGrid regions={regions} />

        {/* ── Bottom: Widget + Methodology note ─────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MicroPulseWidget />
          <ConfidenceNote mood={mood} />
        </div>
      </main>

      <footer className="mt-12 border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        PulseMiner Ghana Pilot · Ethical Civic Intelligence · March 2026 ·{' '}
        <span className="text-slate-400">All scores are estimates, not population surveys.</span>
      </footer>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  unit = '',
  sub,
  color,
  bgColor,
  emoji,
}: {
  label: string;
  value: string;
  unit?: string;
  sub: string;
  color: string;
  bgColor: string;
  emoji: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-800 ${bgColor} p-4 space-y-1`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-lg">{emoji}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>
        {value}
        {unit && <span className="text-base font-normal">{unit}</span>}
      </div>
      <div className="text-xs text-slate-400">{sub}</div>
    </div>
  );
}
