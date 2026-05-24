from datetime import datetime
from typing import Optional
import uuid
from app.domain.entities.incident import Incident, IncidentStatus, IncidentUrgency
from app.domain.repositories.incident_repo import IncidentRepository
from app.domain.exceptions.base import DuplicateActiveIncidentException

class CreateIncidentUseCase:
    def __init__(self, incident_repo: IncidentRepository):
        self.incident_repo = incident_repo

    async def execute(
        self,
        machine_id: str,
        reported_by_id: str,
        incident_type: str,
        description: str,
        urgency: IncidentUrgency,
        local_id: Optional[str] = None
    ) -> Incident:
        # Check active incident
        has_active = await self.incident_repo.check_active_incident_exists(machine_id)
        if has_active:
            raise DuplicateActiveIncidentException(machine_id)

        # Generate ticket details
        today = datetime.utcnow().strftime("%Y%m%d")
        random_suffix = str(uuid.uuid4().hex[:5]).upper()
        ticket_number = f"INC-{today}-{random_suffix}"

        incident = Incident(
            ticket_number=ticket_number,
            machine_id=machine_id,
            reported_by_id=reported_by_id,
            incident_type=incident_type,
            description=description,
            urgency=urgency,
            status=IncidentStatus.PENDING_DISPATCH,
            local_id=local_id,
            created_at=datetime.utcnow()
        )

        return await self.incident_repo.save(incident)