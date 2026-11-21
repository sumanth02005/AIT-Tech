from app.services.rules import evaluate_rules, calculate_priority


def test_critical_keyword_requires_escalation():
    result = evaluate_rules(
        "There is a live wire with smoke near the school",
        {"category": "ELECTRICITY", "severity": "MEDIUM", "confidence": 0.8},
    )
    assert result["severity"] == "CRITICAL"
    assert "CRITICAL_HAZARD_KEYWORD" in result["triggered_rules"]


def test_low_confidence_requires_human_review():
    result = evaluate_rules(
        "There is a problem in the street",
        {"category": "ROAD", "severity": "LOW", "confidence": 0.4},
    )
    assert result["human_review_required"] is True


def test_priority_is_bounded():
    assert calculate_priority("CRITICAL") == 100
    assert calculate_priority("LOW") == 20
