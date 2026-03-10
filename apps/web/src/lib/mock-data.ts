/**
 * In-memory mock data for the PulseMiner Ghana dashboard.
 * Used when the backend API is unavailable (demo / offline mode).
 * All data is synthetic and clearly labelled.
 */

import type { NationalMood, TimeSeriesData, RegionsData, TopicsResponse, AnomaliesResponse } from './api';

export const MOCK_NATIONAL_MOOD: NationalMood = {
  country: 'GH',
  as_of: '2026-03-10T00:00:00.000Z',
  overall_sentiment: -0.18,
  overall_concern: 0.61,
  overall_optimism: 0.39,
  top_topics: [
    { topic_id: 'economy', topic_label: 'Economy & Cost of Living', salience: 0.82, sentiment: -0.34, trend: 'rising', trend_delta: 0.08 },
    { topic_id: 'energy', topic_label: 'Energy & Dumsor', salience: 0.71, sentiment: -0.45, trend: 'rising', trend_delta: 0.12 },
    { topic_id: 'jobs', topic_label: 'Jobs & Unemployment', salience: 0.63, sentiment: -0.28, trend: 'stable', trend_delta: 0.01 },
    { topic_id: 'infrastructure', topic_label: 'Roads & Infrastructure', salience: 0.55, sentiment: -0.22, trend: 'falling', trend_delta: -0.04 },
    { topic_id: 'education', topic_label: 'Education', salience: 0.48, sentiment: 0.15, trend: 'stable', trend_delta: 0.0 },
  ],
  anomaly_flags: ['energy'],
  confidence: 0.78,
  signal_count: 4820,
  coverage_note: 'Based on public signals aggregated across 16 Ghana regions. Does not represent the full population.',
};

export const MOCK_TIMESERIES: TimeSeriesData = {
  country: 'GH',
  region: 'national',
  topic: 'all',
  series: (() => {
    const base = new Date('2026-02-09');
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      const noise = () => (Math.random() - 0.5) * 0.12;
      const trend = -0.15 + i * -0.002; // slight downward
      const concern_trend = 0.52 + i * 0.003;
      return {
        date: d.toISOString().slice(0, 10),
        sentiment_index: Number((trend + noise()).toFixed(3)),
        concern_index: Number(Math.min(0.85, concern_trend + noise() * 0.5).toFixed(3)),
        optimism_index: Number(Math.max(0.15, 0.42 - i * 0.003 + noise() * 0.5).toFixed(3)),
        signal_count: Math.floor(150 + Math.random() * 100),
      };
    });
  })(),
};

export const MOCK_REGIONS: RegionsData = {
  country: 'GH',
  as_of: '2026-03-10T00:00:00.000Z',
  regions: [
    { region_id: 'greater-accra', region_name: 'Greater Accra', capital: 'Accra', zone: 'south', population_est: 5400000, sentiment_index: -0.23, concern_index: 0.66, issue_salience: 0.88, top_topic: 'economy', signal_count: 1240, has_data: true },
    { region_id: 'ashanti', region_name: 'Ashanti', capital: 'Kumasi', zone: 'middle', population_est: 5500000, sentiment_index: -0.19, concern_index: 0.62, issue_salience: 0.72, top_topic: 'energy', signal_count: 980, has_data: true },
    { region_id: 'western', region_name: 'Western', capital: 'Sekondi-Takoradi', zone: 'south', population_est: 2400000, sentiment_index: -0.14, concern_index: 0.57, issue_salience: 0.58, top_topic: 'agriculture', signal_count: 420, has_data: true },
    { region_id: 'western-north', region_name: 'Western North', capital: 'Sefwi Wiawso', zone: 'south', population_est: 760000, sentiment_index: -0.09, concern_index: 0.52, issue_salience: 0.41, top_topic: 'agriculture', signal_count: 115, has_data: true },
    { region_id: 'eastern', region_name: 'Eastern', capital: 'Koforidua', zone: 'south', population_est: 2600000, sentiment_index: -0.17, concern_index: 0.59, issue_salience: 0.55, top_topic: 'infrastructure', signal_count: 380, has_data: true },
    { region_id: 'central', region_name: 'Central', capital: 'Cape Coast', zone: 'south', population_est: 2500000, sentiment_index: -0.11, concern_index: 0.54, issue_salience: 0.50, top_topic: 'education', signal_count: 340, has_data: true },
    { region_id: 'volta', region_name: 'Volta', capital: 'Ho', zone: 'south', population_est: 1900000, sentiment_index: -0.08, concern_index: 0.51, issue_salience: 0.44, top_topic: 'infrastructure', signal_count: 210, has_data: true },
    { region_id: 'oti', region_name: 'Oti', capital: 'Dambai', zone: 'middle', population_est: 750000, sentiment_index: -0.05, concern_index: 0.49, issue_salience: 0.32, top_topic: 'jobs', signal_count: 88, has_data: true },
    { region_id: 'bono', region_name: 'Bono', capital: 'Sunyani', zone: 'middle', population_est: 1200000, sentiment_index: 0.04, concern_index: 0.47, issue_salience: 0.39, top_topic: 'agriculture', signal_count: 162, has_data: true },
    { region_id: 'bono-east', region_name: 'Bono East', capital: 'Techiman', zone: 'middle', population_est: 1100000, sentiment_index: 0.02, concern_index: 0.48, issue_salience: 0.36, top_topic: 'economy', signal_count: 140, has_data: true },
    { region_id: 'ahafo', region_name: 'Ahafo', capital: 'Goaso', zone: 'middle', population_est: 660000, sentiment_index: 0.0, concern_index: 0.50, issue_salience: 0.28, top_topic: 'agriculture', signal_count: 72, has_data: true },
    { region_id: 'northern', region_name: 'Northern', capital: 'Tamale', zone: 'north', population_est: 2700000, sentiment_index: -0.21, concern_index: 0.64, issue_salience: 0.61, top_topic: 'healthcare', signal_count: 310, has_data: true },
    { region_id: 'savannah', region_name: 'Savannah', capital: 'Damango', zone: 'north', population_est: 640000, sentiment_index: -0.18, concern_index: 0.62, issue_salience: 0.40, top_topic: 'infrastructure', signal_count: 95, has_data: true },
    { region_id: 'north-east', region_name: 'North East', capital: 'Nalerigu', zone: 'north', population_est: 620000, sentiment_index: -0.15, concern_index: 0.60, issue_salience: 0.38, top_topic: 'healthcare', signal_count: 82, has_data: true },
    { region_id: 'upper-east', region_name: 'Upper East', capital: 'Bolgatanga', zone: 'north', population_est: 1200000, sentiment_index: -0.16, concern_index: 0.61, issue_salience: 0.45, top_topic: 'healthcare', signal_count: 175, has_data: true },
    { region_id: 'upper-west', region_name: 'Upper West', capital: 'Wa', zone: 'north', population_est: 900000, sentiment_index: -0.13, concern_index: 0.58, issue_salience: 0.42, top_topic: 'jobs', signal_count: 138, has_data: true },
  ],
};

export const MOCK_TOPICS: TopicsResponse = {
  country: 'GH',
  region: 'national',
  as_of: '2026-03-10T00:00:00.000Z',
  topics: [
    { topic_id: 'economy', topic_label: 'Economy & Cost of Living', icon: '📈', salience: 0.82, sentiment: -0.34, trend: 'rising', trend_delta: 0.08, signal_count: 1240 },
    { topic_id: 'energy', topic_label: 'Energy & Dumsor', icon: '⚡', salience: 0.71, sentiment: -0.45, trend: 'rising', trend_delta: 0.12, signal_count: 980 },
    { topic_id: 'jobs', topic_label: 'Jobs & Unemployment', icon: '💼', salience: 0.63, sentiment: -0.28, trend: 'stable', trend_delta: 0.01, signal_count: 820 },
    { topic_id: 'infrastructure', topic_label: 'Roads & Infrastructure', icon: '🛣️', salience: 0.55, sentiment: -0.22, trend: 'falling', trend_delta: -0.04, signal_count: 610 },
    { topic_id: 'education', topic_label: 'Education', icon: '🎓', salience: 0.48, sentiment: 0.15, trend: 'stable', trend_delta: 0.0, signal_count: 540 },
    { topic_id: 'healthcare', topic_label: 'Healthcare & NHIS', icon: '🏥', salience: 0.44, sentiment: -0.18, trend: 'stable', trend_delta: 0.02, signal_count: 480 },
    { topic_id: 'agriculture', topic_label: 'Agriculture & Cocoa', icon: '🌾', salience: 0.40, sentiment: 0.05, trend: 'falling', trend_delta: -0.06, signal_count: 390 },
    { topic_id: 'governance', topic_label: 'Governance & Corruption', icon: '🏛️', salience: 0.38, sentiment: -0.31, trend: 'stable', trend_delta: 0.01, signal_count: 350 },
    { topic_id: 'security', topic_label: 'Security & Safety', icon: '🔒', salience: 0.29, sentiment: -0.39, trend: 'rising', trend_delta: 0.05, signal_count: 240 },
    { topic_id: 'digital', topic_label: 'Digital & Fintech', icon: '📱', salience: 0.25, sentiment: 0.22, trend: 'rising', trend_delta: 0.07, signal_count: 195 },
  ],
};

export const MOCK_ANOMALIES: AnomaliesResponse = {
  count: 3,
  alerts: [
    { id: 'a1', detected_at: '2026-03-10T06:14:00.000Z', region: 'greater-accra', topic: 'energy', alert_type: 'spike_concern', severity: 'high', description: "Concern index for 'energy' in greater-accra spiked 38% — possible dumsor spike." },
    { id: 'a2', detected_at: '2026-03-09T15:30:00.000Z', region: 'ashanti', topic: 'economy', alert_type: 'spike_negativity', severity: 'medium', description: "Rapid sentiment shift for 'economy' in ashanti: –42% over 24 hours." },
    { id: 'a3', detected_at: '2026-03-08T09:00:00.000Z', region: null, topic: 'security', alert_type: 'sudden_salience', severity: 'low', description: "Issue salience for 'security' surged nationally (salience: 0.61)." },
  ],
};
