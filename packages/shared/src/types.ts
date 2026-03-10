// ─── Source Types ────────────────────────────────────────────────────────────

export type SourceType =
  | 'social_post'
  | 'news_article'
  | 'search_trend'
  | 'widget_response'
  | 'voice_submission'
  | 'public_comment'
  | 'synthetic';

export type ConsentType = 'public' | 'first_party' | 'synthetic';

export type PrivacyLevel = 'public' | 'aggregated_only' | 'anonymised';

// ─── Raw Ingestion ───────────────────────────────────────────────────────────

export interface SourceEvent {
  id: string;
  source_type: SourceType;
  source_name: string;
  text_content?: string;
  audio_path?: string;
  language?: string;
  translated_text?: string;
  timestamp: Date;
  region?: string;
  country: string;
  metadata: Record<string, unknown>;
  consent_type: ConsentType;
  privacy_level: PrivacyLevel;
  processed: boolean;
}

// ─── Processing / NLP Output ─────────────────────────────────────────────────

export interface SentimentResult {
  score: number;        // –1.0 (very negative) → +1.0 (very positive)
  label: 'positive' | 'neutral' | 'negative';
  confidence: number;  // 0–1
}

export interface EmotionResult {
  dominant: EmotionLabel;
  scores: Record<EmotionLabel, number>;
}

export type EmotionLabel = 'anger' | 'fear' | 'sadness' | 'joy' | 'trust' | 'disgust' | 'neutral';

export interface ProcessedSignal {
  id: string;
  source_event_id: string;
  sentiment: SentimentResult;
  emotion: EmotionResult;
  topic_labels: string[];
  urgency_score: number;   // 0–1
  spam_score: number;      // 0–1 (higher = more likely spam)
  confidence_score: number; // overall processing confidence
  detected_language: string;
  processed_at: Date;
}

// ─── Signal Fusion Output ────────────────────────────────────────────────────

export interface MoodIndex {
  id: string;
  region: string;
  country: string;
  date_bucket: string;       // ISO date string YYYY-MM-DD
  topic: string;
  sentiment_index: number;   // –1 → +1
  concern_index: number;     // 0 → 1
  optimism_index: number;    // 0 → 1
  frustration_index: number; // 0 → 1
  issue_salience: number;    // 0 → 1 (how much is this being talked about)
  uncertainty_lower: number;
  uncertainty_upper: number;
  contributing_sources: SourceType[];
  signal_count: number;
  anomaly_flag: boolean;
  computed_at: Date;
}

// ─── API Response Shapes ─────────────────────────────────────────────────────

export interface NationalMoodSnapshot {
  country: string;
  as_of: string;
  overall_sentiment: number;
  overall_concern: number;
  overall_optimism: number;
  top_topics: TopicSummary[];
  anomaly_flags: string[];
  confidence: number;
  signal_count: number;
  coverage_note: string;
}

export interface TopicSummary {
  topic_id: string;
  topic_label: string;
  salience: number;
  sentiment: number;
  trend: 'rising' | 'falling' | 'stable';
  trend_delta: number;
}

export interface RegionMoodSnapshot {
  region_id: string;
  region_name: string;
  sentiment_index: number;
  concern_index: number;
  issue_salience: number;
  top_topic: string;
  signal_count: number;
  confidence: number;
}

export interface TimeSeriesPoint {
  date: string;
  sentiment_index: number;
  concern_index: number;
  optimism_index: number;
  signal_count: number;
}

export interface WeeklyReport {
  week_label: string;
  national_mood: NationalMoodSnapshot;
  top_emerging_topics: TopicSummary[];
  regional_highlights: RegionMoodSnapshot[];
  notable_shifts: string[];
  methodology_note: string;
}

// ─── Widget ──────────────────────────────────────────────────────────────────

export interface WidgetResponse {
  session_id: string;
  region?: string;
  mood_rating: 1 | 2 | 3 | 4 | 5;   // 1 = very bad, 5 = very good
  top_issue?: string;
  open_text?: string;
  anonymous_age_band?: '15-24' | '25-34' | '35-49' | '50+';
  submitted_at: Date;
}

// ─── Voice Submission ────────────────────────────────────────────────────────

export interface VoiceSubmission {
  submission_id: string;
  audio_duration_seconds: number;
  consent_given: boolean;
  region?: string;
  submitted_at: Date;
  transcription?: string;
  detected_language?: string;
  topics?: string[];
  sentiment?: SentimentResult;
}

// ─── Anomaly ─────────────────────────────────────────────────────────────────

export interface AnomalyAlert {
  id: string;
  detected_at: Date;
  region?: string;
  topic?: string;
  type: 'spike_concern' | 'spike_negativity' | 'sudden_salience' | 'rapid_shift';
  severity: 'low' | 'medium' | 'high';
  description: string;
  signal_count_change: number;
  baseline_value: number;
  observed_value: number;
}

// ─── Inference Function Shape ─────────────────────────────────────────────────

export interface InferPublicMoodInput {
  publicPosts?: ProcessedSignal[];
  searchTrends?: { topic: string; value: number }[];
  newsSignals?: ProcessedSignal[];
  widgetVotes?: WidgetResponse[];
  voiceSignals?: ProcessedSignal[];
  contextSignals?: Record<string, number>;
  region: string;
  country: string;
  dateRange: { from: Date; to: Date };
}

export interface InferPublicMoodOutput {
  sentimentScore: number;
  concernScore: number;
  optimismScore: number;
  frustrationScore: number;
  topTopics: string[];
  issueSalienceMap: Record<string, number>;
  anomalyFlag: boolean;
  confidence: number;
  signalCount: number;
  notes: string[];
}
