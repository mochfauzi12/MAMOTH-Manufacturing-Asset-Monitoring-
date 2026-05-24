import pytest
from datetime import datetime, timedelta
from typing import List, Optional
import uuid

# Import Domain Entities
from app.domain.entities.user import User, UserRole, ShiftType
from app.domain.entities.incident import Incident, IncidentStatus, IncidentUrgency

# Import Exceptions
from app.domain.exceptions.base import (
    DomainException,
    InvalidStateTransitionException,
    EntityNotFoundException,
    DuplicateActiveIncidentException
)

# Import Usecases
from app.application.use_cases.incidents.create_incident import CreateIncidentUseCase
from app.application.use_cases.incidents.sync_offline import SyncOfflineIncidentsUseCase, OfflineIncidentSyncDTO
from app.application.use_cases.incidents.dispatch_blast import DispatchBlastUseCase
from app.application.use_cases.incidents.resolve_incident import ResolveIncidentUseCase

# Import Repositories Interfaces
from app.domain.repositories.incident_repo import IncidentRepository


# =====================================================================
# 1. IN-MEMORY REPOSITORY FOR ISOLATED TESTING
# =====================================================================
class InMemoryIncidentRepository(IncidentRepository):
    def __init__(self):
        self.db = {}

    async def get_by_id(self, incident_id: str) -> Optional[Incident]:
        return self.db.get(incident_id)

    async def get_by_ticket_number(self, ticket_number: str) -> Optional[Incident]:
        for incident in self.db.values():
            if incident.ticket_number == ticket_number:
                return incident
        return None

    async def get_by_local_id(self, local_id: str) -> Optional[Incident]:
        for incident in self.db.values():
            if incident.local_id == local_id:
                return incident
        return None

    async def save(self, incident: Incident) -> Incident:
        if not incident.id:
            incident.id = str(uuid.uuid4())
        self.db[incident.id] = incident
        return incident

    async def list_active(self) -> List[Incident]:
        return [
            inc for inc in self.db.values()
            if inc.status in [
                IncidentStatus.PENDING_DISPATCH,
                IncidentStatus.DISPATCHED_MASSAL,
                IncidentStatus.UNDER_REPAIR
            ]
        ]

    async def check_active_incident_exists(self, machine_id: str) -> bool:
        for inc in self.db.values():
            if inc.machine_id == machine_id and inc.status in [
                IncidentStatus.PENDING_DISPATCH,
                IncidentStatus.DISPATCHED_MASSAL,
                IncidentStatus.UNDER_REPAIR
            ]:
                return True
        return False


# Mock Redis Enqueuer for arq tasks
class MockArqRedis:
    def __init__(self):
        self.enqueued_jobs = []

    async def enqueue_job(self, task_name: str, **kwargs):
        self.enqueued_jobs.append({
            "task": task_name,
            "args": kwargs
        })
        return "job-id-123"


# =====================================================================
# 2. DOMAIN ENTITY UNIT TESTS
# =====================================================================
def test_incident_mttr_and_response_time_calculation():
    # Setup incident timestamps
    created = datetime.utcnow() - timedelta(minutes=45)
    dispatched = datetime.utcnow() - timedelta(minutes=40)
    accepted = datetime.utcnow() - timedelta(minutes=35)
    resolved = datetime.utcnow()

    incident = Incident(
        ticket_number="INC-TEST-001",
        machine_id="mac-01",
        reported_by_id="usr-op-1",
        incident_type="mechanical",
        description="Overheat",
        urgency=IncidentUrgency.CRITICAL,
        status=IncidentStatus.RESOLVED,
        created_at=created,
        dispatched_at=dispatched,
        accepted_at=accepted,
        resolved_at=resolved
    )

    mttr = incident.calculate_mttr()
    resp = incident.calculate_response_time()

    assert mttr is not None
    assert 44.9 <= mttr <= 45.1  # Approx 45 mins

    assert resp is not None
    assert 4.9 <= resp <= 5.1  # Approx 5 mins


def test_incident_state_transitions():
    incident = Incident(
        ticket_number="INC-TEST-002",
        machine_id="mac-01",
        reported_by_id="usr-op-1",
        incident_type="electrical",
        description="Short circuit",
        urgency=IncidentUrgency.CRITICAL,
        status=IncidentStatus.PENDING_DISPATCH
    )

    # Allowed: PENDING_DISPATCH -> DISPATCHED_MASSAL
    assert incident.can_transition_to(IncidentStatus.DISPATCHED_MASSAL) is True
    # Allowed: PENDING_DISPATCH -> CANCELLED
    assert incident.can_transition_to(IncidentStatus.CANCELLED) is True
    # Forbidden: PENDING_DISPATCH -> UNDER_REPAIR directly
    assert incident.can_transition_to(IncidentStatus.UNDER_REPAIR) is False

    # Simulate transition to DISPATCHED_MASSAL
    incident.status = IncidentStatus.DISPATCHED_MASSAL
    # Allowed: DISPATCHED_MASSAL -> UNDER_REPAIR
    assert incident.can_transition_to(IncidentStatus.UNDER_REPAIR) is True
    # Allowed: DISPATCHED_MASSAL -> CANCELLED
    assert incident.can_transition_to(IncidentStatus.CANCELLED) is True
    # Forbidden: DISPATCHED_MASSAL -> RESOLVED directly
    assert incident.can_transition_to(IncidentStatus.RESOLVED) is False


# =====================================================================
# 3. USE CASE TESTS
# =====================================================================
@pytest.mark.asyncio
async def test_create_incident_usecase_success():
    repo = InMemoryIncidentRepository()
    usecase = CreateIncidentUseCase(repo)

    incident = await usecase.execute(
        machine_id="mac-101",
        reported_by_id="op-1",
        incident_type="hydraulic",
        description="Leakage detected in motor pump",
        urgency=IncidentUrgency.HIGH,
        local_id="local-uuid-111"
    )

    assert incident.id is not None
    assert incident.ticket_number.startswith("INC-")
    assert incident.status == IncidentStatus.PENDING_DISPATCH
    assert incident.machine_id == "mac-101"
    assert incident.local_id == "local-uuid-111"


@pytest.mark.asyncio
async def test_create_incident_usecase_duplicate_fails():
    repo = InMemoryIncidentRepository()
    usecase = CreateIncidentUseCase(repo)

    # Create first active incident on mac-101
    await usecase.execute(
        machine_id="mac-101",
        reported_by_id="op-1",
        incident_type="hydraulic",
        description="Leakage",
        urgency=IncidentUrgency.HIGH
    )

    # Creating another incident on same machine mac-101 should raise exception
    with pytest.raises(DuplicateActiveIncidentException):
        await usecase.execute(
            machine_id="mac-101",
            reported_by_id="op-1",
            incident_type="electrical",
            description="Wire spark",
            urgency=IncidentUrgency.MEDIUM
        )


@pytest.mark.asyncio
async def test_sync_offline_incidents_usecase():
    repo = InMemoryIncidentRepository()
    usecase = SyncOfflineIncidentsUseCase(repo)

    # Prep offline incidents list
    sync_payload = [
        OfflineIncidentSyncDTO(
            local_id="local-999-aaa",
            machine_id="mac-01",
            incident_type="mechanical",
            description="Broke down line 2",
            urgency="HIGH",
            reported_by="operator-1",
            client_timestamp=datetime.utcnow()
        ),
        OfflineIncidentSyncDTO(
            local_id="local-888-bbb",
            machine_id="mac-02",
            incident_type="electrical",
            description="Panel light flickering",
            urgency="LOW",
            reported_by="operator-1",
            client_timestamp=datetime.utcnow()
        )
    ]

    res = await usecase.execute(sync_payload)
    
    assert len(res["synced"]) == 2
    assert len(res["skipped"]) == 0
    assert len(res["failed"]) == 0
    assert res["synced"][0]["localId"] == "local-999-aaa"
    assert res["synced"][1]["localId"] == "local-888-bbb"

    # Try to sync the exact same list again (Deduplication Check)
    res_dup = await usecase.execute(sync_payload)
    
    assert len(res_dup["synced"]) == 0
    assert len(res_dup["skipped"]) == 2
    assert res_dup["skipped"][0]["reason"] == "DUPLICATE_LOCAL_ID"


@pytest.mark.asyncio
async def test_dispatch_blast_usecase():
    repo = InMemoryIncidentRepository()
    redis = MockArqRedis()
    usecase = DispatchBlastUseCase(repo, redis)

    # Save a pending incident to dispatch
    pending_inc = Incident(
        id="inc-id-777",
        ticket_number="INC-20260524-ABCDE",
        machine_id="mac-77",
        reported_by_id="usr-op-123",
        incident_type="general",
        description="Fumes seen",
        urgency=IncidentUrgency.CRITICAL,
        status=IncidentStatus.PENDING_DISPATCH
    )
    await repo.save(pending_inc)

    # Execute dispatch blast
    tickets = await usecase.execute(["inc-id-777"], "Gawat! Asap terdeteksi pada lini produksi!")

    assert len(tickets) == 1
    assert tickets[0] == "INC-20260524-ABCDE"
    
    # Check status transitioned
    updated = await repo.get_by_id("inc-id-777")
    assert updated.status == IncidentStatus.DISPATCHED_MASSAL
    assert updated.dispatched_at is not None

    # Check background job enqueued
    assert len(redis.enqueued_jobs) == 1
    assert redis.enqueued_jobs[0]["task"] == "blast_notification_task"
    assert redis.enqueued_jobs[0]["args"]["ticket_numbers"] == ["INC-20260524-ABCDE"]


@pytest.mark.asyncio
async def test_resolve_incident_usecase_success():
    repo = InMemoryIncidentRepository()
    usecase = ResolveIncidentUseCase(repo)

    # Save an active under repair incident to resolve
    active_inc = Incident(
        id="inc-id-888",
        ticket_number="INC-20260524-REPAIR",
        machine_id="mac-88",
        reported_by_id="usr-op-123",
        incident_type="mechanical",
        description="Hydraulic leak",
        urgency=IncidentUrgency.HIGH,
        status=IncidentStatus.UNDER_REPAIR,
        created_at=datetime.utcnow() - timedelta(hours=2)
    )
    await repo.save(active_inc)

    # Execute resolve
    ticket = await usecase.execute("inc-id-888", "Gasket pompa hidrolik diganti baru, level oli ditambah.")

    assert ticket == "INC-20260524-REPAIR"
    
    # Verify state transitions & MTTR calculations
    updated = await repo.get_by_id("inc-id-888")
    assert updated.status == IncidentStatus.RESOLVED
    assert updated.resolved_note == "Gasket pompa hidrolik diganti baru, level oli ditambah."
    assert updated.resolved_at is not None
    assert updated.mttr_minutes is not None
    assert updated.mttr_minutes >= 120  # >= 2 hours


@pytest.mark.asyncio
async def test_resolve_incident_usecase_validation_fails():
    repo = InMemoryIncidentRepository()
    usecase = ResolveIncidentUseCase(repo)

    # Invalid resolved note (too short)
    with pytest.raises(ValueError):
        await usecase.execute("any-id", "Ok")


@pytest.mark.asyncio
async def test_resolve_incident_usecase_invalid_transition_fails():
    repo = InMemoryIncidentRepository()
    usecase = ResolveIncidentUseCase(repo)

    # Incident is still PENDING_DISPATCH, cannot resolve directly
    pending_inc = Incident(
        id="inc-id-999",
        ticket_number="INC-20260524-PENDING",
        machine_id="mac-99",
        reported_by_id="usr-op-123",
        incident_type="electrical",
        description="Flickering panel",
        urgency=IncidentUrgency.LOW,
        status=IncidentStatus.PENDING_DISPATCH
    )
    await repo.save(pending_inc)

    with pytest.raises(InvalidStateTransitionException):
        await usecase.execute("inc-id-999", "Memperbaiki sekring panel utama.")

