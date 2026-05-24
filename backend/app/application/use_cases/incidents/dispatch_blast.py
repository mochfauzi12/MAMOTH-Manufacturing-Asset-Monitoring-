from datetime import datetime
from typing import List
from app.domain.entities.incident import IncidentStatus
from app.domain.repositories.incident_repo import IncidentRepository
from app.domain.exceptions.base import EntityNotFoundException, InvalidStateTransitionException

class DispatchBlastUseCase:
    def __init__(self, incident_repo: IncidentRepository, arq_redis):
        self.incident_repo = incident_repo
        self.arq_redis = arq_redis

    async def execute(self, incident_ids: List[str], message: str) -> List[str]:
        updated_tickets = []
        
        for inc_id in incident_ids:
            incident = await self.incident_repo.get_by_id(inc_id)
            if not incident:
                raise EntityNotFoundException("Incident", inc_id)
            
            if not incident.can_transition_to(IncidentStatus.DISPATCHED_MASSAL):
                raise InvalidStateTransitionException(incident.status, IncidentStatus.DISPATCHED_MASSAL)
            
            # Transition state
            incident.status = IncidentStatus.DISPATCHED_MASSAL
            incident.dispatched_at = datetime.utcnow()
            await self.incident_repo.save(incident)
            updated_tickets.append(incident.ticket_number)

        # Enqueue background task to ARQ (Redis Queue)
        if self.arq_redis:
            await self.arq_redis.enqueue_job(
                'blast_notification_task',
                ticket_numbers=updated_tickets,
                message=message
            )

        return updated_tickets