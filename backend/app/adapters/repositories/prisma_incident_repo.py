from typing import List, Optional
from app.domain.entities.incident import Incident, IncidentStatus, IncidentUrgency
from app.domain.repositories.incident_repo import IncidentRepository
from app.infrastructure.database.prisma_client import db

class PrismaIncidentRepository(IncidentRepository):
    async def get_by_id(self, incident_id: str) -> Optional[Incident]:
        record = await db.incident.find_unique(where={"id": incident_id})
        if record:
            return Incident.from_orm(record)
        return None

    async def get_by_ticket_number(self, ticket_number: str) -> Optional[Incident]:
        record = await db.incident.find_unique(where={"ticketNumber": ticket_number})
        if record:
            return Incident.from_orm(record)
        return None

    async def get_by_local_id(self, local_id: str) -> Optional[Incident]:
        record = await db.incident.find_unique(where={"localId": local_id})
        if record:
            return Incident.from_orm(record)
        return None

    async def save(self, incident: Incident) -> Incident:
        data = {
            "ticketNumber": incident.ticket_number,
            "machineId": incident.machine_id,
            "reportedById": incident.reported_by_id,
            "incidentType": incident.incident_type,
            "description": incident.description,
            "urgency": incident.urgency.value,
            "status": incident.status.value,
            "photoUrls": incident.photo_urls,
            "localId": incident.local_id,
            "resolvedNote": incident.resolved_note,
            "cancelNote": incident.cancel_note,
        }
        
        if incident.id:
            record = await db.incident.update(where={"id": incident.id}, data=data)
        else:
            record = await db.incident.create(data=data)
            
        return Incident.from_orm(record)

    async def list_active(self) -> List[Incident]:
        records = await db.incident.find_many(
            where={
                "status": {
                    "in": [
                        IncidentStatus.PENDING_DISPATCH.value,
                        IncidentStatus.DISPATCHED_MASSAL.value,
                        IncidentStatus.UNDER_REPAIR.value
                    ]
                }
            }
        )
        return [Incident.from_orm(r) for r in records]

    async def check_active_incident_exists(self, machine_id: str) -> bool:
        count = await db.incident.count(
            where={
                "machineId": machine_id,
                "status": {
                    "in": [
                        IncidentStatus.PENDING_DISPATCH.value,
                        IncidentStatus.DISPATCHED_MASSAL.value,
                        IncidentStatus.UNDER_REPAIR.value
                    ]
                }
            }
        )
        return count > 0