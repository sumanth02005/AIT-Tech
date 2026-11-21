from typing import Any

import google.generativeai as genai

from app.config import settings


async def analyze_complainant(description: str, has_image: bool) -> dict[str, Any]:
    if not settings.gemini_api_key or settings.gemini_api_key in {"replace-me", "MY_GEMINI_API_KEY"}:
        return {
            "category": "OTHER",
            "severity": "MEDIUM",
            "summary": description[:500],
            "hazards": [],
            "recommended_department": "Municipal General",
            "original_language": "unknown",
            "confidence": 0.0,
            "model": "fallback",
        }

    try:
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(settings.gemini_model)
        prompt = (
            "Analyze this municipal complaint and return only valid JSON. "
            "Fields: category (ROAD, WATER, SANITATION, ELECTRICITY, PUBLIC_SAFETY, WASTE, OTHER), "
            "severity (LOW, MEDIUM, HIGH, CRITICAL), summary, hazards, recommended_department, "
            "original_language, confidence (0-1).\nComplaint: " + description
        )
        response = model.generate_content(prompt)
        import json

        try:
            return json.loads(response.text)
        except json.JSONDecodeError:
            pass
    except Exception:
        pass

    return {
        "category": "OTHER",
        "severity": "MEDIUM",
        "summary": description[:500],
        "hazards": [],
        "recommended_department": "Municipal General",
        "original_language": "unknown",
        "confidence": 0.0,
        "model": "fallback",
    }
