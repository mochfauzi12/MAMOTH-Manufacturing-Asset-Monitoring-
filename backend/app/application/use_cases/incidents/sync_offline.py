from datetime import datetime
from typing import List, Dict, Any
from app.domain.entities.incident import Incident, IncidentStatus
from app.domain.repositories.incident_repo import IncidentRepository
from pydantic import BaseModel

class OfflineIncidentSyncDTO(BaseModel):
    local_id: str
    machine_id: str
    incident_type: str
    description: str
    urgency: str
    reported_by: str
    client_timestamp: datetime

class SyncOfflineIncidentsUseCase:
    def __init__(self, incident_repo: IncidentRepository):
        self.incident_repo = incident_repo

    async def execute(self, sync_data: List[OfflineIncidentSyncDTO]) -> Dict[str, List[Any]]:
        synced_list = []
        skipped_list = []
        failed_list = []

        for record in sync_data:
            try:
                # Deduplication check
                existing = await self.incident_repo.get_by_local_id(record.local_id)
                if existing:
                    skipped_list.append({
                        "localId": record.local_id,
                        "reason": "DUPLICATE_LOCAL_ID",
                        "existingServerUuid": existing.id,
                        "existingTicketNumber": existing.ticket_number
                    })
                    continue

                # Validate blocking active incident
                has_active = await self.incident_repo.check_active_incident_exists(record.machine_id)
                if has_active:
                    failed_list.append({
                        "localId": record.local_id,
                        "error": "DUPLICATE_ACTIVE_INCIDENT",
                        "message": "Mesin ini sudah memiliki laporan insiden aktif."
                    })
                    continue

                # Create ticket
                today = record.client_timestamp.strftime("%Y%m%d")
                random_suffix = str(record.local_id[:5]).upper()
                ticket_number = f"INC-SYNC-{today}-{random_suffix}"

                incident = Incident(
                    ticket_number=ticket_number,
                    machine_id=record.machine_id,
                    reported_by_id="usr-op-sync",  # Simplified seeder placeholder
                    incident_type=record.incident_type,
                    description=record.description,
                    urgency=record.urgency,
                    status=IncidentStatus.PENDING_DISPATCH,
                    local_id=record.local_id,
                    client_timestamp=record.client_timestamp,
                    created_at=datetime.utcnow()
                )

                saved = await self.incident_repo.save(incident)
                synced_list.append({
                    "localId": record.local_id,
                    "serverUuid": saved.id,
                    "ticketNumber": saved.ticket_number,
                    "status": saved.status,
                    "createdAt": saved.created_at
                })
            except Exception as e:
                failed_list.append({
                    "localId": record.local_id,
                    "error": "INTERNAL_ERROR",
                    "message": str(e)
                })

        return {
            "synced": synced_list,
            "skipped": skipped_list,
            "failed": failed_list
        }