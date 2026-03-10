# PulseMiner API Reference

Base URL: `http://localhost:3001`  
Interactive Swagger UI: `http://localhost:3001/docs`

All responses are JSON. All timestamps are ISO 8601. Sentiment scores are in the range **–1.0 (very negative) → +1.0 (very positive)**. Indices (concern, optimism, frustration, salience) are in the range **0.0 → 1.0**.

---

## Health

### `GET /api/health`

Returns service health status.

**Response 200**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-03-10T08:00:00.000Z"
}
```

---

## National Mood

### `GET /api/mood`

Returns the current national mood snapshot aggregated from all regions and topics.

**Query parameters**

| Name    | Type   | Default | Description                     |
|---------|--------|---------|----------------------------------|
| country | string | GH      | ISO 3166-1 alpha-2 country code |

**Response 200**
```json
{
  "country": "GH",
  "date": "2026-03-10",
  "overallSentiment": -0.26,
  "concernIndex": 0.61,
  "optimismIndex": 0.37,
  "frustrationIndex": 0.55,
  "totalSignals": 4820,
  "dominantTopics": ["economy", "energy", "jobs"],
  "uncertaintyBounds": { "lower": -0.31, "upper": -0.21 },
  "topicBreakdown": [
    {
      "topicId": "economy",
      "label": "Economy & Cost of Living",
      "sentimentIndex": -0.34,
      "concernIndex": 0.72,
      "issueSalience": 0.82,
      "trendDirection": "declining",
      "signalCount": 612
    }
  ],
  "regionSummaries": [
    {
      "regionId": "greater-accra",
      "regionName": "Greater Accra",
      "sentimentIndex": -0.30,
      "dominantTopic": "energy",
      "signalCount": 480
    }
  ],
  "activeAlerts": 2
}
```

---

### `GET /api/mood/timeseries`

Returns daily national mood scores for the past N days.

**Query parameters**

| Name    | Type   | Default | Description             |
|---------|--------|---------|--------------------------|
| country | string | GH      | ISO 3166-1 alpha-2 code |
| days    | number | 30      | 1–90                     |
| topic   | string | —       | Filter to a single topic |

**Response 200**
```json
{
  "country": "GH",
  "topic": null,
  "series": [
    {
      "date": "2026-02-09",
      "sentimentIndex": -0.22,
      "concernIndex": 0.58,
      "optimismIndex": 0.41,
      "frustrationIndex": 0.48,
      "signalCount": 312
    }
  ]
}
```

---

## Regions

### `GET /api/regions`

Returns all Ghana regions with their latest mood snapshot.

**Query parameters**

| Name    | Type   | Default | Description             |
|---------|--------|---------|--------------------------|
| country | string | GH      | ISO 3166-1 alpha-2 code |

**Response 200**
```json
{
  "regions": [
    {
      "regionId": "greater-accra",
      "regionName": "Greater Accra",
      "capital": "Accra",
      "zone": "south",
      "sentimentIndex": -0.30,
      "concernIndex": 0.68,
      "optimismIndex": 0.33,
      "dominantTopic": "energy",
      "signalCount": 480,
      "trendDirection": "declining",
      "lastUpdated": "2026-03-10T06:00:00.000Z"
    }
  ]
}
```

---

### `GET /api/regions/:regionId`

Returns the full mood breakdown for a single region.

**Path parameters**

| Name     | Type   | Description                          |
|----------|--------|---------------------------------------|
| regionId | string | Region slug, e.g. `greater-accra`    |

**Response 200**
```json
{
  "regionId": "greater-accra",
  "regionName": "Greater Accra",
  "topics": [
    {
      "topicId": "energy",
      "label": "Energy & Dumsor",
      "sentimentIndex": -0.42,
      "concernIndex": 0.72,
      "issueSalience": 0.72,
      "signalCount": 98
    }
  ],
  "overallSentiment": -0.30,
  "signalCount": 480
}
```

**Response 404**
```json
{ "error": "Region not found" }
```

---

## Topics

### `GET /api/topics`

Returns all Ghana civic topics ranked by issue salience.

**Response 200**
```json
{
  "topics": [
    {
      "topicId": "economy",
      "label": "Economy & Cost of Living",
      "sentimentIndex": -0.34,
      "concernIndex": 0.72,
      "issueSalience": 0.82,
      "trendDirection": "declining",
      "signalCount": 612
    }
  ]
}
```

---

### `GET /api/topics/:topicId/timeseries`

Returns a 30-day sentiment time series for a single topic.

**Path parameters**

| Name    | Type   | Description            |
|---------|--------|-------------------------|
| topicId | string | e.g. `economy`, `energy`|

**Query parameters**

| Name | Type   | Default | Description |
|------|--------|---------|--------------|
| days | number | 30      | 1–90         |

**Response 200**
```json
{
  "topicId": "economy",
  "label": "Economy & Cost of Living",
  "series": [
    {
      "date": "2026-02-09",
      "sentimentIndex": -0.28,
      "concernIndex": 0.62,
      "issueSalience": 0.78,
      "signalCount": 88
    }
  ]
}
```

---

## Widget (MicroPulse)

### `POST /api/widget/respond`

Submit a citizen widget response. No authentication required.

**Request body**
```json
{
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "regionId": "greater-accra",
  "topicId": "energy",
  "rating": 2,
  "openText": "The dumsor is really affecting my business",
  "consentType": "anonymous"
}
```

| Field       | Type   | Required | Notes                                           |
|-------------|--------|----------|-------------------------------------------------|
| sessionId   | string | yes      | Client-generated UUID, session-scoped           |
| regionId    | string | no       | Ghana region slug                               |
| topicId     | string | no       | Ghana topic ID                                  |
| rating      | number | yes      | 1 (very negative) → 5 (very positive)           |
| openText    | string | no       | Max 300 characters, PII-scrubbed server-side    |
| consentType | string | yes      | `anonymous` only in v1                          |

**Response 201**
```json
{ "accepted": true, "id": "clxyz..." }
```

**Response 400**
```json
{ "error": "Invalid rating — must be 1–5" }
```

**Response 429**
```json
{ "error": "Rate limit exceeded" }
```

---

### `GET /api/widget/summary`

Returns aggregated widget response statistics. Only returned when ≥ 5 responses exist (privacy threshold).

**Response 200**
```json
{
  "totalResponses": 142,
  "averageRating": 2.3,
  "topTopics": ["energy", "economy", "jobs"],
  "meetsThreshold": true
}
```

**Response 200 (below threshold)**
```json
{
  "totalResponses": 3,
  "meetsThreshold": false
}
```

---

## Reports

### `GET /api/reports/weekly`

Returns the latest weekly national advisory report.

**Query parameters**

| Name    | Type   | Default | Description             |
|---------|--------|---------|--------------------------|
| country | string | GH      | ISO 3166-1 alpha-2 code |

**Response 200**
```json
{
  "weekLabel": "2026-W10",
  "country": "GH",
  "totalSignals": 28400,
  "reportJson": {
    "headline": "Economy and energy concerns dominate public sentiment",
    "keyFindings": [
      "Concern about electricity supply rose 18% week-on-week in Greater Accra",
      "Agriculture sentiment in Bono and Ahafo improved following cocoa price announcement"
    ],
    "regionHighlights": {},
    "topicTrends": {},
    "anomalies": [],
    "methodologyNotes": "Based on 28,400 signals across 16 regions."
  },
  "generatedAt": "2026-03-10T06:00:00.000Z"
}
```

**Response 404**
```json
{ "error": "No weekly report available yet" }
```

---

## Anomalies

### `GET /api/anomalies`

Returns recent anomaly alerts.

**Query parameters**

| Name     | Type   | Default | Description             |
|----------|--------|---------|--------------------------|
| country  | string | GH      | ISO 3166-1 alpha-2 code |
| limit    | number | 10      | Max 50                  |
| severity | string | —       | `low`, `medium`, `high`, `critical` |

**Response 200**
```json
{
  "alerts": [
    {
      "id": "clxyz...",
      "country": "GH",
      "region": "greater-accra",
      "topic": "energy",
      "alertType": "spike_concern",
      "severity": "high",
      "description": "Concern index for 'energy' in greater-accra spiked 38%.",
      "baselineValue": 0.48,
      "observedValue": 0.72,
      "signalCountChange": 145,
      "isAcknowledged": false,
      "createdAt": "2026-03-10T05:30:00.000Z"
    }
  ],
  "total": 2
}
```

---

## Error Codes

| HTTP Status | Meaning                                      |
|-------------|-----------------------------------------------|
| 400         | Bad request — invalid parameters              |
| 404         | Resource not found                            |
| 422         | Validation error (Zod schema rejection)       |
| 429         | Rate limit exceeded (100 req/min per IP)      |
| 500         | Internal server error                         |

All error responses follow:
```json
{ "error": "Human-readable message" }
```

---

## Rate Limits

- **Global:** 100 requests/minute per IP
- **Widget POST:** 10 requests/minute per IP
- **Reports GET:** 5 requests/minute per IP
