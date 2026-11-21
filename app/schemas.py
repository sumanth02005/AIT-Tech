from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class TicketStatus(str, Enum):
    OPEN = "OPEN"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class Location(BaseModel):
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    accuracy_m: Optional[float] = Field(default=None, ge=0)
    source: str = "MANUAL"


class ComplaintCreate(BaseModel):
    description: str = Field(min_length=10, max_length=5000)
    citizen_name: Optional[str] = Field(default=None, max_length=200)
    citizen_contact: Optional[str] = Field(default=None, max_length=300)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    location_accuracy_m: Optional[float] = Field(default=None, ge=0)
    language_hint: Optional[str] = None


class ComplaintResponse(BaseModel):
    id: UUID
    status: str
    incident_id: Optional[UUID] = None
    ticket_id: Optional[UUID] = None
    location_source: str


class TicketUpdate(BaseModel):
    status: Optional[TicketStatus] = None
    assigned_department: Optional[str] = None
    assigned_officer: Optional[str] = None
    resolution_notes: Optional[str] = None

