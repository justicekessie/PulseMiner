"""
Language detection module with Ghana-context heuristics.
Uses langdetect as the primary engine with a fallback to keyword-based detection.
"""

from langdetect import detect, LangDetectException

# Twi/Akan markers
_TWI_MARKERS = {"ɛ", "ɔ", "yɛ", "sɛ", "kɔ", "bɔ", "dɔ", "ŋ"}

# Ga markers
_GA_MARKERS = {"mli", "wo", "bọ", "lẹ", "ji", "ŋmẹ"}

# Ewe markers
_EWE_MARKERS = {"gb", "ɖo", "kple", "wò", "ŋu", "ɖe"}

# Dagbani markers
_DAGBANI_MARKERS = {"yi", "ka", "naa", "di", "gbina"}


def detect_language(text: str, hint: str | None = None) -> str:
    """
    Detect the primary language of the text.
    Returns an ISO 639-1 code or a custom code for Ghanaian languages.
    """
    if hint:
        return hint

    # Check for Ghanaian language markers first (before langdetect, which
    # often misclassifies low-resource languages)
    text_lower = text.lower()
    if any(m in text for m in _TWI_MARKERS):
        return "tw"
    if any(m in text for m in _EWE_MARKERS):
        return "ee"
    if any(m in text for m in _GA_MARKERS):
        return "gaa"
    if any(m in text_lower.split() for m in _DAGBANI_MARKERS):
        return "dag"

    try:
        lang = detect(text)
        # langdetect sometimes returns 'so', 'sw', 'af' for Ghanaian English — normalise
        if lang in ("so", "sw", "af", "nl", "de") and _looks_like_ghanaian_english(text):
            return "en"
        return lang
    except LangDetectException:
        return "en"  # default to English for Ghana context


def _looks_like_ghanaian_english(text: str) -> bool:
    """Heuristic: does this text look like Ghanaian English even if misdetected?"""
    gh_english_signals = [
        "ghana", "accra", "kumasi", "trotro", "dumsor", "ecg", "nhis",
        "ndc", "npp", "cedis", "chale", "waakye", "bece", "wassce",
    ]
    text_lower = text.lower()
    return any(w in text_lower for w in gh_english_signals)
