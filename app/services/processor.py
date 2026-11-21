from datetime import datetime, timezone
from uuid import uuid4

from app.db import get_supabase
from app.services.ai import analyze_complainant
from app.services.embeddings import embed_text
from app.services.rules import evaluate_rules, calculate_priority


async def process_complaint(
    complaint_id: str,
    description: str,
    latitude: float | None,
    longitude: float | None,
    has_image: bool,
):
    supabase = get_supabase()
    try:
        ai_result = await analyze_complainant(description, has_image)
        rules_result = evaluate_rules(description, ai_result)
        embedding = embed_text(description)
    except Exception:
        ai_result = {
            "category": "OTHER",
            "severity": "MEDIUM",
            "summary": description[:500],
            "confidence": 0.0,
            "model": "fallback",
        }
        rules_result = evaluate_rules(description, ai_result)
        embedding = embed_text(description)

    supabase.table("complaints").update({
        "ai_category": rules_result["category"],
        "ai_severity": rules_result["severity"],
        "ai_summary": ai_result.get("summary"),
        "ai_confidence": ai_result.get("confidence"),
        "original_language": ai_result.get("original_language"),
        "embedding": embedding,
        "processing_status": "PROCESSING",
    }).eq("id", complaint_id).execute()

    duplicate = None
    if latitude is not None and longitude is not None:
        try:
            result = supabase.rpc("find_duplicate_candidates", {
                "query_embedding": embedding,
                "query_latitude": latitude,
                "query_longitude": longitude,
                "query_category": rules_result["category"],
                "exclude_complaint_id": complaint_id,
            }).execute()
            candidates = result.data or []
            if candidates:
                duplicate = max(candidates, key=lambda item: item["duplicate_score"])
        except Exception:
            duplicate = None

    incident_id = None
    ticket_id = None
    if duplicate and duplicate["duplicate_score"] >= 0.80:
        incident_id = duplicate["incident_id"]
        resolution = "LIKELY_DUPLICATE"
    else:
        incident = supabase.table("incidents").insert({
            "category": rules_result["category"],
            "severity": rules_result["severity"],
            "summary": ai_result.get("summary") or description[:500],
            "latitude": latitude,
            "longitude": longitude,
            "status": "OPEN",
        }).execute()
        incident_id = incident.data[0]["id"]
        resolution = "UNCERTAIN_MATCH" if duplicate else "NEW_COMPLAINT"

    ticket = supabase.table("tickets").insert({
        "incident_id": incident_id,
        "category": rules_result["category"],
        "severity": rules_result["severity"],
        "department": rules_result["department"],
        "priority": calculate_priority(rules_result["severity"]),
        "status": "OPEN",
        "human_review_required": rules_result["human_review_required"],
    }).execute()
    ticket_id = ticket.data[0]["id"]

    supabase.table("complaints").update({
        "incident_id": incident_id,
        "ticket_id": ticket_id,
        "duplicate_decision": resolution,
        "processing_status": "COMPLETED",
    }).eq("id", complaint_id).execute()

    supabase.table("decision_audits").insert({
        "complaint_id": complaint_id,
        "ticket_id": ticket_id,
        "ai_output": ai_result,
        "rules_output": rules_result,
        "duplicate_decision": resolution,
        "model_versions": {
            "gemini": ai_result.get("model"),
            "embedding": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        },
    }).execute()

    return {"incident_id": incident_id, "ticket_id": ticket_id, "resolution": resolution}
