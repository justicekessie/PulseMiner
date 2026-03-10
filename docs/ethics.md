# PulseMiner — Ethics Charter

> *"We build mirrors, not megaphones."*

PulseMiner exists to surface collective public sentiment for civic benefit — not to surveil, manipulate, or commodify the people whose voices it aggregates. This document defines the non-negotiable ethical constraints baked into every layer of the system.

---

## Core Principles

### 1. Aggregate, Never Individual

All outputs are **population-level aggregates**. No individual signal, timeline, identity, or behaviour profile is ever exposed. A sentiment score for "Greater Accra, Energy, 2026-03-10" represents thousands of people — it cannot be traced to any one of them.

**Enforced by:**
- Minimum threshold: `MoodIndex` records require ≥ 5 distinct signals before being served via the API.
- Widget responses are stored with only a session-scoped UUID — no user account, device fingerprint, or IP address is retained after the session.
- API endpoints return no raw text, only aggregated scores.

### 2. Consent and Transparency

**Widget (MicroPulse):**
- Citizens explicitly choose to participate.
- The widget clearly states: *"Your response is anonymous and contributes to aggregate research only."*
- No covert tracking. Session IDs are client-generated and discarded after 24 hours.
- Users can withdraw mid-session at any time with no penalty.

**Passive signals (news, RSS):**
- Only publicly available, published content is ingested.
- No scraping of private communities, DMs, closed groups, or gated content.
- Source attribution is stored internally but never used to target individuals.

### 3. No Deanonymisation

**Prohibited forever:**
- Linking signals to social media accounts, profiles, or user handles.
- Cross-referencing widget responses with any external dataset.
- Re-identification by unusual combination of demographics.
- Storing any text that uniquely identifies a private individual (names, phone numbers, addresses).

**PII Scrubbing:** The ingestion pipeline drops any text field containing patterns matching phone numbers, email addresses, or national ID formats before writing to the database.

### 4. Source Transparency and Labelling

Every `MoodIndex` record carries the `contributing_sources` array → consumers of the API always know the mix of sources behind any score.

The dashboard displays a **Confidence Note** disclosing:
- What sources contributed to today's index.
- Known biases (urban overrepresentation, language coverage gaps).
- The uncertainty bounds.
- The minimum signal threshold for display.

### 5. No Weaponisation

PulseMiner data **must not** be used to:
- Target individuals or communities with disinformation.
- Suppress political speech or voting behaviour.
- Enable predictive policing or pre-crime profiling.
- Power micro-targeted advertising or political campaigns.

**Access controls (production):** API keys required for write access. Rate limiting prevents bulk data extraction. Aggregated weekly reports are the recommended external-facing artifact rather than raw API access.

### 6. Language and Representation Equity

Ghana's linguistic diversity (English, Twi, Ga, Ewe, Dagbani, Hausa, Fante, Nzema) means English-centric NLP models systematically underrepresent Northern and rural populations.

**Mitigations in v1:**
- Custom Ghana English lexicon (dumsor, chale, galamsey, etc.) added to VADER.
- Minimal Twi/Akan keyword lexicon for topic extraction.
- `detected_language` stored on every `ProcessedSignal` — dashboard confidence note discloses language coverage gaps.

**Required before v2:**
- Validated Twi, Ga, and Ewe sentiment lexicons.
- Afrikaans/Hausa text classification support.
- Community review of topic taxonomy with representatives from Northern regions.

### 7. Algorithmic Accountability

**Auditable by design:**
- Every `ProcessedSignal` stores the model version and scores used to produce it.
- Every `MoodIndex` stores signal count, source mix, and uncertainty bounds.
- The fusion engine weights are constants in source code (not hidden hyperparameters).
- All anomaly alerts are stored with baseline vs. observed values.

**Bias monitoring:**
- Weekly reports include per-region signal volume metrics to surface underrepresentation.
- Regions with < 10 signals/day in a week are flagged in `WeeklyReport.methodology_notes`.

### 8. Data Minimisation and Retention

| Data type             | Retention period  | Rationale                                  |
|-----------------------|-------------------|--------------------------------------------|
| Raw `SourceEvent`     | 90 days           | Enough for re-processing if NLP updates    |
| `ProcessedSignal`     | 90 days           | Fusion engine lookback window              |
| `MoodIndex`           | 5 years           | Historical trend analysis                  |
| `WidgetResponse`      | 12 months         | Longitudinal civic research                |
| `AnomalyAlert`        | 5 years           | Accountability record                      |
| `WeeklyReport`        | Indefinite        | Public record                              |

Raw text from `SourceEvent` is deleted after 90 days; the derived `ProcessedSignal` scores are retained.

### 9. Responsible Disclosure

If PulseMiner detects an anomaly indicating a potential public safety emergency (e.g., sudden extreme fear/danger signals in a specific region):

1. The system flags the `AnomalyAlert` with `severity: 'critical'`.
2. A designated human reviewer is notified within 15 minutes (webhook/email — not automated action).
3. No automated reporting to authorities occurs without human review.
4. If reporting is warranted, the reviewer contacts the appropriate public safety agency directly using the aggregate evidence — not raw signals.

### 10. Open Accountability

This ethics charter is:
- Versioned in source control alongside the code.
- Linked from the public dashboard footer.
- Updated with community input before any major capability change.

PulseMiner is not the arbiter of truth. It is a signal aggregator. Every score comes with uncertainty bounds because that humility is honest.

---

*Last updated: Ghana Pilot v1.0 — 2026*
