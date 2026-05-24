from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class IncidentUrgency(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class IncidentStatus(str, Enum):
    PENDING_DISPATCH = "PENDING_DISPATCH"
    DISPATCHED_MASSAL = "DISPATCHED_MASSAL"
    UNDER_REPAIR = "UNDER_REPAIR"
    RESOLVED = "RESOLVED"
    CANCELLED = "CANCELLED"

class Incident(BaseModel):
    id: Optional[str] = None
    ticket_number: str
    machine_id: str
    reported_by_id: str
    incident_type: str
    description: str
    urgency: IncidentUrgency
    status: IncidentStatus = IncidentStatus.PENDING_DISPATCH
    photo_urls: List[str] = Field(default_factory=list)
    resolved_note: Optional[str] = None
    cancel_note: Optional[str] = None
    
    local_id: Optional[str] = None
    client_timestamp: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    dispatched_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    
    mttr_minutes: Optional[float] = None
    response_time_min: Optional[float] = None

    class Config:
        from_attributes = True

    def calculate_mttr(self) -> Optional[float]:
        if self.resolved_at and self.created_at:
            delta = self.resolved_at - self.created_at
            return delta.total_seconds() / 60.0
        return None

    def calculate_response_time(self) -> Optional[float]:
        if self.accepted_at and self.dispatched_at:
            delta = self.accepted_at - self.dispatched_at
            return delta.total_seconds() / 60.0
        return None

    def can_transition_to(self, new_status: IncidentStatus) -> bool:
        allowed_transitions = {
            IncidentStatus.PENDING_DISPATCH: [IncidentStatus.DISPATCHED_MASSAL, IncidentStatus.CANCELLED],
            IncidentStatus.DISPATCHED_MASSAL: [IncidentStatus.UNDER_REPAIR, IncidentStatus.CANCELLED],
            IncidentStatus.UNDER_REPAIR: [IncidentStatus.RESOLVED],
            IncidentStatus.RESOLVED: [],
            IncidentStatus.CANCELLED: []
        }
        return new_status in allowed_transitions.get(self.status, [])