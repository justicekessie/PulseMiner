"""
PulseMiner NLP Processing Service
Provides sentiment analysis, topic extraction, and language detection
for Ghana-specific public text signals.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import uvicorn
import os

from app.sentiment import analyse_sentiment
from app.topics import extract_topics
from app.language import detect_language

app = FastAPI(
    title="PulseMiner Processing Service",
    description="NLP microservice: sentiment, topic extraction, language detection",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request / Response Models ────────────────────────────────────────────────

class ProcessRequest(BaseModel):
    text: str = Field(..., max_length=5000)
    source_type: Optional[str] = "social_post"
    hint_language: Optional[str] = None  # ISO code hint if known


class SentimentResponse(BaseModel):
    score: float           # –1.0 → +1.0
    label: str             # positive / neutral / negative
    confidence: float      # 0–1


class EmotionResponse(BaseModel):
    dominant: str
    scores: dict[str, float]


class ProcessResponse(BaseModel):
    sentiment: SentimentResponse
    emotion: EmotionResponse
    topic_labels: list[str]
    urgency_score: float
    spam_score: float
    confidence_score: float
    detected_language: str


class BatchRequest(BaseModel):
    items: list[ProcessRequest]


class BatchResponse(BaseModel):
    results: list[ProcessResponse]


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "processing"}


@app.post("/process", response_model=ProcessResponse)
def process_text(req: ProcessRequest):
    """Process a single text item through the full NLP pipeline."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Empty text")

    lang = detect_language(req.text, hint=req.hint_language)
    sentiment = analyse_sentiment(req.text, language=lang)
    topics = extract_topics(req.text, language=lang)

    # Urgency heuristics: exclamation marks, caps ratio, urgent keywords
    urgency = _compute_urgency(req.text)

    # Simple spam / bot heuristics
    spam = _compute_spam_score(req.text)

    overall_confidence = sentiment["confidence"] * (1 - spam * 0.5)

    return ProcessResponse(
        sentiment=SentimentResponse(**sentiment),
        emotion=_derive_emotion(sentiment["score"], topics),
        topic_labels=topics,
        urgency_score=round(urgency, 3),
        spam_score=round(spam, 3),
        confidence_score=round(overall_confidence, 3),
        detected_language=lang,
    )


@app.post("/process/batch", response_model=BatchResponse)
def process_batch(req: BatchRequest):
    """Process multiple items. Max 100 per batch."""
    if len(req.items) > 100:
        raise HTTPException(status_code=400, detail="Maximum batch size is 100")
    results = [process_text(item) for item in req.items]
    return BatchResponse(results=results)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _compute_urgency(text: str) -> float:
    urgent_words = [
        "urgent", "emergency", "critical", "immediately", "crisis",
        "disaster", "danger", "breaking", "now", "help",
        "dying", "collapsed", "shortage", "strike", "protest",
    ]
    text_lower = text.lower()
    word_hits = sum(1 for w in urgent_words if w in text_lower)
    exclamation = min(text.count("!") / 3, 1.0)
    caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
    caps_score = min(caps_ratio * 2, 1.0)
    return min((word_hits * 0.15) + exclamation * 0.3 + caps_score * 0.2, 1.0)


def _compute_spam_score(text: str) -> float:
    spam_markers = [
        "click here", "buy now", "win big", "follow me",
        "dm for", "link in bio", "promo", "discount",
        "free money", "investment opportunity",
    ]
    text_lower = text.lower()
    hits = sum(1 for m in spam_markers if m in text_lower)
    # Repetition check
    words = text_lower.split()
    unique_ratio = len(set(words)) / max(len(words), 1)
    repetition_penalty = max(0, 0.5 - unique_ratio) if len(words) > 10 else 0
    return min(hits * 0.25 + repetition_penalty, 1.0)


def _derive_emotion(sentiment_score: float, topics: list[str]) -> EmotionResponse:
    """Rule-based emotion derivation from sentiment + topic context."""
    scores = {
        "anger": 0.0,
        "fear": 0.0,
        "sadness": 0.0,
        "joy": 0.0,
        "trust": 0.0,
        "disgust": 0.0,
        "neutral": 0.0,
    }

    if sentiment_score < -0.5:
        scores["anger"] = 0.4
        scores["disgust"] = 0.3
        scores["sadness"] = 0.2
        scores["neutral"] = 0.1
    elif sentiment_score < -0.1:
        scores["sadness"] = 0.3
        scores["fear"] = 0.3
        scores["neutral"] = 0.4
    elif sentiment_score < 0.1:
        scores["neutral"] = 0.8
        scores["trust"] = 0.2
    elif sentiment_score < 0.5:
        scores["joy"] = 0.4
        scores["trust"] = 0.4
        scores["neutral"] = 0.2
    else:
        scores["joy"] = 0.6
        scores["trust"] = 0.4

    # Topic-based adjustments
    if "security" in topics or "crime" in topics:
        scores["fear"] = min(scores["fear"] + 0.2, 1.0)
    if "governance" in topics or "corruption" in topics:
        scores["disgust"] = min(scores["disgust"] + 0.2, 1.0)

    # Re-normalise
    total = sum(scores.values())
    if total > 0:
        scores = {k: round(v / total, 3) for k, v in scores.items()}

    dominant = max(scores, key=scores.get)
    return EmotionResponse(dominant=dominant, scores=scores)


if __name__ == "__main__":
    port = int(os.getenv("PROCESSING_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
