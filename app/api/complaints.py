from fastapi import APIRouter, BackgroundTasks, File, Form, UploadFile, HTTPException
from typing import Optional
from uuid import uuid4

from app.config import settings
from app.db import create_signed_url, get_supabase
from app.schemas import ComplaintResponse
from app.services.location import extract_exif_location
from app.services.processor import process_complaint

router = APIRouter(prefix="/api/complaints", tags=["complaints"])


@router.post("", response_model=ComplaintResponse, status_code=202)
async def submit_complaint(
    background_tasks: BackgroundTasks,
    description: str = Form(..., min_length=10, max_length=5000),
    citizen_name: Optional[str] = Form(None),
    citizen_contact: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    location_accuracy_m: Optional[float] = Form(None),
    photo: Optional[UploadFile] = File(None),
):
    supabase = get_supabase()
    photo_path = None
    location_source = "MANUAL"

    photo_bytes = await photo.read() if photo else None
    if photo_bytes:
        exif_lat, exif_lng, exif_source = extract_exif_location(photo_bytes)
        if exif_source == "EXIF":
            latitude, longitude = exif_lat, exif_lng
            location_source = "EXIF"
            location_accuracy_m = None
        photo_path = f"complaints/{uuid4()}.jpg"
        try:
            supabase.storage.from_(settings.supabase_bucket).upload(
                photo_path,
                photo_bytes,
                file_options={"content-type": photo.content_type or "image/jpeg"},
            )
        except Exception:
            photo_path = None

    if location_source != "EXIF" and latitude is not None and longitude is not None:
        location_source = "GPS"

    try:
        insert = supabase.table("complaints").insert({
            "description": description,
            "citizen_name": citizen_name,
            "citizen_contact": citizen_contact,
            "latitude": latitude,
            "longitude": longitude,
            "location_accuracy_m": location_accuracy_m,
            "location_source": location_source,
            "photo_path": photo_path,
            "processing_status": "QUEUED",
        }).execute()
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Complaint could not be saved to Supabase.",
        ) from exc
    complaint = insert.data[0]
    background_tasks.add_task(
        process_complaint,
        complaint["id"], description, latitude, longitude, bool(photo_bytes),
    )
    return ComplaintResponse(
        id=complaint["id"],
        status="QUEUED",
        location_source=location_source,
    )


@router.get("/{complaint_id}")
async def get_complaint(complaint_id: str):
    supabase = get_supabase()
    result = supabase.table("complaints").select("*").eq("id", complaint_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Complaint not found")
    complaint = result.data[0]
    if complaint.get("photo_path"):
        complaint["photo_url"] = create_signed_url(supabase, complaint["photo_path"])
    return complaint
