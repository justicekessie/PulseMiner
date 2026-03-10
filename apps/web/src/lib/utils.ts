import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sentiment score (–1 → +1) → human-readable label and colour.
 */
export function sentimentMeta(score: number): {
  label: string;
  color: string;
  bgColor: string;
  emoji: string;
} {
  if (score >= 0.4) return { label: 'Positive', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', emoji: '😊' };
  if (score >= 0.1) return { label: 'Mostly Positive', color: 'text-green-400', bgColor: 'bg-green-500/20', emoji: '🙂' };
  if (score >= -0.1) return { label: 'Mixed / Neutral', color: 'text-amber-400', bgColor: 'bg-amber-500/20', emoji: '😐' };
  if (score >= -0.4) return { label: 'Mostly Negative', color: 'text-orange-400', bgColor: 'bg-orange-500/20', emoji: '😟' };
  return { label: 'Negative', color: 'text-rose-400', bgColor: 'bg-rose-500/20', emoji: '😞' };
}

/**
 * Concern score (0 → 1) → colour gradient.
 */
export function concernColor(score: number): string {
  if (score >= 0.7) return '#ef4444'; // red
  if (score >= 0.5) return '#f97316'; // orange
  if (score >= 0.3) return '#eab308'; // yellow
  return '#22c55e';                   // green
}

/**
 * Trend indicator symbol.
 */
export function trendIcon(trend: string): string {
  if (trend === 'rising') return '↑';
  if (trend === 'falling') return '↓';
  return '→';
}

export function trendColor(trend: string): string {
  if (trend === 'rising') return 'text-rose-400';
  if (trend === 'falling') return 'text-emerald-400';
  return 'text-slate-400';
}

/**
 * Format a number as a percentage string.
 */
export function pct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

/**
 * Format a sentiment score for display.
 */
export function formatScore(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${(n * 100).toFixed(0)}`;
}
