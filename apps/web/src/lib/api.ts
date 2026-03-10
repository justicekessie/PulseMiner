/**
 * PulseMiner API client — used by the Next.js frontend.
 * All fetches go through this module so the base URL is centralised.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  (typeof window !== 'undefined' ? 'http://localhost:3001' : 'http://api:3001');

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    next: { revalidate: 60 }, // ISR: revalidate every 60s
  });

  if (!res.ok) {
    throw new Error(`API ${path} returned ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── Mood ──────────────────────────────────────────────────────────────────────

export interface NationalMood {
  country: string;
  as_of: string;
  overall_sentiment: number;
  overall_concern: number;
  overall_optimism: number;
  top_topics: {
    topic_id: string;
    topic_label?: string;
    salience: number;
    sentiment: number;
    trend?: string;
    trend_delta?: number;
  }[];
  anomaly_flags: string[];
  confidence: number;
  signal_count: number;
  coverage_note: string;
}

export interface TimeSeriesPoint {
  date: string;
  sentiment_index: number;
  concern_index: number;
  optimism_index: number;
  signal_count: number;
}

export interface TimeSeriesData {
  country: string;
  region: string;
  topic: string;
  series: TimeSeriesPoint[];
}

export function getMoodNational(country = 'GH'): Promise<NationalMood> {
  return apiFetch<NationalMood>(`/api/mood?country=${country}`);
}

export function getMoodTimeSeries(
  days = 30,
  region?: string,
  topic?: string
): Promise<TimeSeriesData> {
  const params = new URLSearchParams({ days: String(days) });
  if (region) params.set('region', region);
  if (topic) params.set('topic', topic);
  return apiFetch<TimeSeriesData>(`/api/mood/timeseries?${params}`);
}

// ─── Regions ──────────────────────────────────────────────────────────────────

export interface RegionSnapshot {
  region_id: string;
  region_name: string;
  capital: string;
  zone: string;
  population_est: number;
  sentiment_index: number | null;
  concern_index: number | null;
  issue_salience: number | null;
  top_topic: string | null;
  signal_count: number;
  has_data: boolean;
}

export interface RegionsData {
  country: string;
  as_of: string;
  regions: RegionSnapshot[];
}

export function getRegions(): Promise<RegionsData> {
  return apiFetch<RegionsData>('/api/regions');
}

// ─── Topics ──────────────────────────────────────────────────────────────────

export interface TopicData {
  topic_id: string;
  topic_label: string;
  icon: string;
  salience: number;
  sentiment: number;
  trend: 'rising' | 'falling' | 'stable';
  trend_delta: number;
  signal_count: number;
}

export interface TopicsResponse {
  country: string;
  region: string;
  as_of: string;
  topics: TopicData[];
}

export function getTopics(region?: string): Promise<TopicsResponse> {
  const params = region ? `?region=${region}` : '';
  return apiFetch<TopicsResponse>(`/api/topics${params}`);
}

// ─── Anomalies ────────────────────────────────────────────────────────────────

export interface Anomaly {
  id: string;
  detected_at: string;
  region: string | null;
  topic: string | null;
  alert_type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface AnomaliesResponse {
  count: number;
  alerts: Anomaly[];
}

export function getAnomalies(): Promise<AnomaliesResponse> {
  return apiFetch<AnomaliesResponse>('/api/anomalies');
}

// ─── Widget ──────────────────────────────────────────────────────────────────

export async function submitWidgetResponse(data: {
  session_id: string;
  mood_rating: number;
  top_issue?: string;
  region?: string;
}): Promise<{ received: boolean; message: string }> {
  return apiFetch('/api/widget/respond', {
    method: 'POST',
    body: JSON.stringify({ ...data, country: 'GH' }),
  });
}

// ─── Health ──────────────────────────────────────────────────────────────────

export function getHealth(): Promise<{ status: string; pilot: string; db: string }> {
  return apiFetch('/api/health');
}
