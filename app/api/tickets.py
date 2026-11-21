from fastapi import APIRouter, HTTPException

from app.db import get_supabase
from app.schemas import TicketUpdate

router = APIRouter(prefix="/api/tickets", tags=["tickets"])


@router.get("")
async def list_tickets(limit: int = 100):
    result = (
        get_supabase().table("tickets")
        .select("*, incidents(*)")
        .order("priority", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data


@router.patch("/{ticket_id}")
async def update_ticket(ticket_id: str, update: TicketUpdate):
    payload = update.model_dump(exclude_none=True)
    if "status" in payload:
        payload["status"] = payload["status"].value
    result = get_supabase().table("tickets").update(payload).eq("id", ticket_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return result.data[0]
