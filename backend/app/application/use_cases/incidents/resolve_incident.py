from datetime import datetime
from app.domain.entities.incident import IncidentStatus
from app.domain.repositories.incident_repo import IncidentRepository
from app.domain.exceptions.base import EntityNotFoundException, InvalidStateTransitionException

class ResolveIncidentUseCase:
    def __init__(self, incident_repo: IncidentRepository):
        self.incident_repo = incident_repo

    async def execute(self, incident_id: str, resolved_note: str) -> str:
        if not resolved_note or len(resolved_note.strip()) < 5:
            raise ValueError("Catatan penyelesaian (resolved_note) wajib diisi minimal 5 karakter.")

        incident = await self.incident_repo.get_by_id(incident_id)
        if not incident:
            raise EntityNotFoundException("Incident", incident_id)

        # Transition validation
        if not incident.can_transition_to(IncidentStatus.RESOLVED):
            raise InvalidStateTransitionException(incident.status, IncidentStatus.RESOLVED)

        # Apply state changes
        incident.status = IncidentStatus.RESOLVED
        incident.resolved_at = datetime.utcnow()
        incident.resolved_note = resolved_note.strip()
        
        # Calculate MTTR
        incident.mttr_minutes = incident.calculate_mttr()

        await self.incident_repo.save(incident)
        return incident.ticket_number
