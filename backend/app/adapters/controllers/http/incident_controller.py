from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from app.application.use_cases.incidents.create_incident import CreateIncidentUseCase
from app.application.use_cases.incidents.sync_offline import SyncOfflineIncidentsUseCase, OfflineIncidentSyncDTO
from app.application.use_cases.incidents.dispatch_blast import DispatchBlastUseCase
from app.application.use_cases.incidents.resolve_incident import ResolveIncidentUseCase
from app.adapters.repositories.prisma_incident_repo import PrismaIncidentRepository
from app.domain.entities.incident import IncidentUrgency
from app.domain.exceptions.base import DomainException
from app.infrastructure.queue.arq_config import get_redis_queue
from app.adapters.controllers.ws.connection_manager import manager as ws_manager

router = APIRouter()

class CreateIncidentRequest(BaseModel):
    machine_id: str
    reported_by_id: str
    incident_type: str
    description: str
    urgency: IncidentUrgency
    local_id: Optional[str] = None

class SyncOfflineRequest(BaseModel):
    incidents: List[OfflineIncidentSyncDTO]

class BlastRequest(BaseModel):
    incident_ids: List[str]
    message: str

class ResolveRequest(BaseModel):
    resolved_note: str

def get_create_incident_use_case():
    return CreateIncidentUseCase(PrismaIncidentRepository())

def get_sync_use_case():
    return SyncOfflineIncidentsUseCase(PrismaIncidentRepository())

def get_blast_use_case(arq_redis = Depends(get_redis_queue)):
    return DispatchBlastUseCase(PrismaIncidentRepository(), arq_redis)

def get_resolve_use_case():
    return ResolveIncidentUseCase(PrismaIncidentRepository())

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_incident(payload: CreateIncidentRequest, use_case: CreateIncidentUseCase = Depends(get_create_incident_use_case)):
    try:
        incident = await use_case.execute(
            machine_id=payload.machine_id,
            reported_by_id=payload.reported_by_id,
            incident_type=payload.incident_type,
            description=payload.description,
            urgency=payload.urgency,
            local_id=payload.local_id
        )
        
        # Broadcast WS to supervisor Dashboard
        await ws_manager.broadcast_to_supervisors({
            "type": "INCIDENT_CREATED",
            "payload": {
                "id": incident.id,
                "ticketNumber": incident.ticket_number,
                "machineId": incident.machine_id,
                "urgency": incident.urgency.value,
                "status": incident.status.value,
                "description": incident.description,
                "createdAt": incident.created_at.isoformat()
            }
        })
        
        return {
            "status": "success",
            "data": {
                "id": incident.id,
                "ticketNumber": incident.ticket_number,
                "status": incident.status.value
            }
        }
    except DomainException as e:
        raise HTTPException(status_code=400, detail={"code": e.code, "message": e.message})

@router.post("/sync", status_code=status.HTTP_207_MULTI_STATUS)
async def sync_offline(payload: SyncOfflineRequest, use_case: SyncOfflineIncidentsUseCase = Depends(get_sync_use_case)):
    results = await use_case.execute(payload.incidents)
    
    # Broadcast to supervisors for newly synced tickets
    for item in results["synced"]:
        await ws_manager.broadcast_to_supervisors({
            "type": "INCIDENT_CREATED",
            "payload": item
        })
        
    return {
        "status": "partial_success" if results["failed"] else "success",
        "data": results
    }

@router.post("/dispatch-blast", status_code=status.HTTP_202_ACCEPTED)
async def dispatch_blast(payload: BlastRequest, use_case: DispatchBlastUseCase = Depends(get_blast_use_case)):
    try:
        tickets = await use_case.execute(payload.incident_ids, payload.message)
        return {
            "status": "accepted",
            "data": {
                "blastJobId": "srv-bjob-" + str(len(tickets)),
                "incidentCount": len(tickets),
                "technicianCount": 8
            },
            "message": "Blast job diantrekan asinkron ke Redis worker."
        }
    except DomainException as e:
        raise HTTPException(status_code=400, detail={"code": e.code, "message": e.message})

@router.post("/{incident_id}/resolve", status_code=status.HTTP_200_OK)
async def resolve_incident(incident_id: str, payload: ResolveRequest, use_case: ResolveIncidentUseCase = Depends(get_resolve_use_case)):
    try:
        ticket_number = await use_case.execute(incident_id, payload.resolved_note)
        
        # Broadcast WS to supervisor Dashboard
        await ws_manager.broadcast_to_supervisors({
            "type": "INCIDENT_RESOLVED",
            "payload": {
                "id": incident_id,
                "ticketNumber": ticket_number,
                "resolvedNote": payload.resolved_note,
                "status": "RESOLVED"
            }
        })
        
        return {
            "status": "success",
            "message": f"Insiden {ticket_number} berhasil diselesaikan.",
            "data": {
                "ticketNumber": ticket_number,
                "status": "RESOLVED"
            }
        }
    except (DomainException, ValueError) as e:
        message = e.message if hasattr(e, "message") else str(e)
        code = e.code if hasattr(e, "code") else "VALIDATION_ERROR"
        raise HTTPException(status_code=400, detail={"code": code, "message": message})