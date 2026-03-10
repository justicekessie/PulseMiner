"""
Topic extraction for Ghana-context public signals.
Uses keyword matching against the Ghana topic taxonomy.
"""

GHANA_TOPIC_KEYWORDS: dict[str, list[str]] = {
    "economy": [
        "economy", "inflation", "prices", "cost of living", "cedis", "cedi",
        "exchange rate", "dollar", "price hike", "expensive", "afford",
        "poverty", "economic", "budget", "taxes", "debt", "imf", "fiscal",
    ],
    "energy": [
        "dumsor", "electricity", "ecg", "power cut", "outage", "blackout",
        "generator", "fuel", "petrol", "diesel", "light bill", "grid",
        "power", "energy", "load shedding",
    ],
    "jobs": [
        "job", "unemployment", "work", "hiring", "layoff", "graduate",
        "youth employment", "jobless", "career", "salary", "wages",
        "no work", "company", "business closed",
    ],
    "education": [
        "education", "school", "free shs", "bece", "wassce", "teacher",
        "university", "students", "tuition", "scholarship", "classroom",
        "curriculum", "knust", "ug", "ucc", "legon",
    ],
    "healthcare": [
        "health", "hospital", "nhis", "medicine", "doctor", "clinic",
        "malaria", "maternal", "pharmacy", "patient", "treatment",
        "ambulance", "nurse", "chps", "drug", "vaccine",
    ],
    "infrastructure": [
        "road", "pothole", "bridge", "highway", "transport", "trotro",
        "traffic", "construction", "drainage", "water supply", "pipe",
        "flood", "sanitation", "waste", "accra roads",
    ],
    "agriculture": [
        "cocoa", "farm", "cocobod", "harvest", "farmer", "crop",
        "drought", "galamsey", "mining", "food production", "akuafo",
        "irrigation", "cassava", "rice", "maize", "agric",
    ],
    "governance": [
        "corruption", "government", "minister", "parliament", "ndc", "npp",
        "political", "election", "accountability", "policy", "president",
        "leader", "nana", "mahama", "committee", "audit", "public office",
        "scandal", "bribe", "embezzle",
    ],
    "security": [
        "security", "crime", "robbery", "police", "armed", "kidnap",
        "violent", "fraud", "scam", "thief", "murder", "attack",
        "military", "galamsey", "banditry",
    ],
    "digital": [
        "momo", "mobile money", "internet", "fintech", "startup", "digital",
        "cybercrime", "e-levy", "app", "data bundle", "mtn", "telecel",
        "airtel", "online", "payment", "blockchain",
    ],
}


def extract_topics(text: str, language: str = "en", max_topics: int = 4) -> list[str]:
    """
    Extract the most relevant topics from text using keyword matching.
    Returns a list of topic IDs ordered by relevance (most to least).
    """
    text_lower = text.lower()
    topic_scores: dict[str, int] = {}

    for topic_id, keywords in GHANA_TOPIC_KEYWORDS.items():
        score = 0
        for kw in keywords:
            if kw in text_lower:
                # Longer keyword matches are more specific
                score += len(kw.split())
        if score > 0:
            topic_scores[topic_id] = score

    # Sort by score descending
    ranked = sorted(topic_scores.items(), key=lambda x: x[1], reverse=True)
    return [t[0] for t in ranked[:max_topics]]
