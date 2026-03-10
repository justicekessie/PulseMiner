"""
Sentiment analysis module.
Uses VADER for English/social media text.
Falls back to lexicon-based approach for Ghanaian languages.
"""

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

_analyser = SentimentIntensityAnalyzer()

# Twi/Akan sentiment lexicon (minimal seed)
_TWI_POSITIVE = {
    "ɛyɛ": 0.6,     # it's good
    "papa": 0.7,    # good / nice
    "anigyeɛ": 0.8, # joy / happiness
    "dɔ": 0.7,      # love
    "soa": 0.5,     # carry / support
    "ye": 0.4,      # we / positive
}
_TWI_NEGATIVE = {
    "bɔne": -0.7,   # bad / evil
    "haw": -0.6,    # trouble / problem
    "osie": -0.8,   # insult
    "amanehunu": -0.7, # suffering
    "atɔ": -0.5,    # fallen
}

# Ghana-specific English slang adjustments
_GH_ENGLISH_ADJUSTMENTS = {
    "dumsor": -0.5,
    "chale": 0.1,       # Ga slang, casual / neutral-positive
    "borga": 0.2,       # diaspora, usually positive context
    "waakye": 0.3,      # food, positive
    "very bad": -0.7,
    "very good": 0.7,
    "suffering": -0.6,
    "wahala": -0.4,
    "serious problem": -0.6,
    "government failed": -0.7,
    "proud to be ghanaian": 0.8,
    "ghana works": 0.6,
    "year of return": 0.5,
}


def analyse_sentiment(text: str, language: str = "en") -> dict:
    """
    Returns:
      score: float in [–1, +1]
      label: 'positive' | 'neutral' | 'negative'
      confidence: float in [0, 1]
    """
    if language in ("tw", "gaa", "ee", "dag"):
        return _analyse_local_language(text, language)

    # VADER + Ghana adjustments
    scores = _analyser.polarity_scores(text)
    compound = scores["compound"]

    # Apply Ghana-specific lexicon adjustments
    text_lower = text.lower()
    adjustment = 0.0
    for phrase, val in _GH_ENGLISH_ADJUSTMENTS.items():
        if phrase in text_lower:
            adjustment += val

    # Dampen adjustment (don't let one phrase dominate)
    compound = max(-1.0, min(1.0, compound + adjustment * 0.3))

    label = "neutral"
    confidence = 0.7

    if compound >= 0.1:
        label = "positive"
        confidence = 0.6 + abs(compound) * 0.4
    elif compound <= -0.1:
        label = "negative"
        confidence = 0.6 + abs(compound) * 0.4
    else:
        confidence = 0.5 + (1 - abs(compound)) * 0.2

    return {
        "score": round(compound, 4),
        "label": label,
        "confidence": round(min(confidence, 0.99), 3),
    }


def _analyse_local_language(text: str, language: str) -> dict:
    """Minimal lexicon-based sentiment for Ghanaian languages."""
    score = 0.0
    hits = 0
    text_lower = text.lower()

    for word, val in _TWI_POSITIVE.items():
        if word in text_lower:
            score += val
            hits += 1
    for word, val in _TWI_NEGATIVE.items():
        if word in text_lower:
            score += val
            hits += 1

    if hits == 0:
        return {"score": 0.0, "label": "neutral", "confidence": 0.3}

    avg_score = max(-1.0, min(1.0, score / hits))
    label = "neutral"
    if avg_score > 0.1:
        label = "positive"
    elif avg_score < -0.1:
        label = "negative"

    return {
        "score": round(avg_score, 4),
        "label": label,
        "confidence": min(0.3 + hits * 0.1, 0.75),
    }
