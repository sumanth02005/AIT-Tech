from fastapi import APIRouter

from app.db import get_supabase

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary")
async def analytics_summary():
    supabase = get_supabase()
    complaints = supabase.table("complaints").select("id,processing_status").execute().data
    tickets = supabase.table("tickets").select("status,department,severity").execute().data
    resolved_ticket_count = sum(
        1 for ticket in tickets if ticket["status"] in ("RESOLVED", "CLOSED")
    )
    return {
        "total_complaints": len(complaints),
        "processed_complaints": sum(
            1 for complaint in complaints if complaint["processing_status"] == "COMPLETED"
        ),
        "resolved_complaints": resolved_ticket_count,
        "tickets_by_department": {
            department: sum(1 for ticket in tickets if ticket["department"] == department)
            for department in {ticket["department"] for ticket in tickets}
        },
        "critical_tickets": sum(
            1 for ticket in tickets if ticket["severity"] == "CRITICAL"
        ),
    }


__all__ = ["router"]
