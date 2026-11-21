from typing import Any


DEPARTMENT_MAP = {
    "ROAD": "Roads",
    "WATER": "Water Supply",
    "SANITATION": "Sanitation",
    "ELECTRICITY": "Electrical",
    "PUBLIC_SAFETY": "Public Safety",
    "WASTE": "Sanitation",
    "OTHER": "Municipal General",
}

CRITICAL_KEYWORDS = (
    "fire", "explosion", "electrocution", "collapse", "gas leak",
    "unconscious", "flooding", "live wire", "child trapped",
)


def evaluate_rules(description: str, ai_result: dict[str, Any]) -> dict[str, Any]:
    text = description.lower()
    category = str(ai_result.get("category", "OTHER")).upper()
    severity = str(ai_result.get("severity", "MEDIUM")).upper()
    triggered = []

    if any(keyword in text for keyword in CRITICAL_KEYWORDS):
        severity = "CRITICAL"
        triggered.append("CRITICAL_HAZARD_KEYWORD")

    if ai_result.get("hazards"):
        triggered.append("AI_IDENTIFIED_HAZARD")

    if ai_result.get("confidence", 1.0) < 0.55:
        triggered.append("LOW_AI_CONFIDENCE")

    return {
        "category": category,
        "severity": severity,
        "department": DEPARTMENT_MAP.get(category, "Municipal General"),
        "triggered_rules": triggered,
        "human_review_required": "LOW_AI_CONFIDENCE" in triggered,
    }


def calculate_priority(severity: str, location_sensitive: bool = False, waiting_hours: float = 0) -> int:
    severity_scores = {"LOW": 20, "MEDIUM": 40, "HIGH": 70, "CRITICAL": 100}
    score = severity_scores.get(severity, 40)
    if location_sensitive:
        score += 10
    if waiting_hours >= 24:
        score += min(20, int(waiting_hours / 24) * 5)
    return min(100, score)
