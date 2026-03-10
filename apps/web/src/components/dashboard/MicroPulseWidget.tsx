'use client';

import { useState } from 'react';
import { GHANA_TOPICS, GHANA_REGION_IDS, GHANA_REGIONS } from '@pulseminer/shared';

const PROMPTS = [
  'How are things in your area this week?',
  'What is the biggest issue affecting people near you?',
  'Do you feel hopeful about the economy this month?',
];

function generateSessionId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 20);
}

export function MicroPulseWidget() {
  const [step, setStep] = useState<'idle' | 'rating' | 'issue' | 'done'>('idle');
  const [rating, setRating] = useState<number | null>(null);
  const [issue, setIssue] = useState<string>('');
  const [region, setRegion] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const prompt = PROMPTS[0];

  async function handleSubmit() {
    if (!rating) return;
    setSubmitting(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      await fetch(`${API}/api/widget/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: generateSessionId(),
          mood_rating: rating,
          top_issue: issue || undefined,
          region: region || undefined,
          country: 'GH',
        }),
      });
    } catch {
      // Offline — still show success (demo mode)
    }
    setStep('done');
    setSubmitting(false);
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">📡</span>
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Micro-Pulse Widget
        </h2>
      </div>
      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
        Share how things feel in your area. Completely anonymous — stored only in aggregated form.
      </p>

      {step === 'idle' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-200 font-medium">{prompt}</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                onClick={() => { setRating(v); setStep('issue'); }}
                className="flex-1 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 hover:border-slate-500 transition-all text-center text-sm font-bold text-slate-300 hover:text-white"
              >
                {v === 1 ? '😞' : v === 2 ? '😟' : v === 3 ? '😐' : v === 4 ? '🙂' : '😊'}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-slate-600">
            <span>Very bad</span>
            <span>Very good</span>
          </div>
        </div>
      )}

      {step === 'issue' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-200 font-medium">Top issue in your area?</p>
          <div className="grid grid-cols-2 gap-1.5">
            {GHANA_TOPICS.slice(0, 6).map((t) => (
              <button
                key={t.id}
                onClick={() => setIssue(t.id)}
                className={`text-left text-xs px-2.5 py-2 rounded border transition-all ${
                  issue === t.id
                    ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                    : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="">Select your region (optional)</option>
            {GHANA_REGIONS.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {submitting ? 'Submitting…' : 'Submit anonymously'}
          </button>
          <p className="text-[10px] text-slate-600 text-center">
            No name, location, or device ID is stored.
          </p>
        </div>
      )}

      {step === 'done' && (
        <div className="text-center py-6 space-y-2">
          <div className="text-3xl">🙏</div>
          <p className="text-sm font-medium text-emerald-400">Thank you!</p>
          <p className="text-xs text-slate-400">
            Your anonymous response contributes to Ghana's civic intelligence map.
          </p>
          <button
            onClick={() => { setStep('idle'); setRating(null); setIssue(''); setRegion(''); }}
            className="mt-2 text-xs text-slate-500 hover:text-slate-300 underline"
          >
            Submit another
          </button>
        </div>
      )}
    </div>
  );
}
