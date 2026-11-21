from typing import Any

import google.generativeai as genai

from app.config import settings


async def analyze_complainant(description: str, has_image: bool) -> dict[str, Any]:
    if not settings.gemini_api_key:
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
        return {
            "category": "OTHER",
            "severity": "MEDIUM",
            "summary": description[:500],
            "hazards": [],
            "recommended_department": "Municipal General",
            "original_language": "unknown",
            "confidence": 0.0,
            "model": settings.gemini_model,
        }
