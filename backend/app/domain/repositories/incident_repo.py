from abc import ABC, abstractmethod
from typing import List, Optional
from app.domain.entities.incident import Incident

class IncidentRepository(ABC):
    @abstractmethod
    async def get_by_id(self, incident_id: str) -> Optional[Incident]:
        pass

    @abstractmethod
    async def get_by_ticket_number(self, ticket_number: str) -> Optional[Incident]:
        pass

    @abstractmethod
    async def get_by_local_id(self, local_id: str) -> Optional[Incident]:
        pass

    @abstractmethod
    async def save(self, incident: Incident) -> Incident:
        pass

    @abstractmethod
    async def list_active(self) -> List[Incident]:
        pass

    @abstractmethod
    async def check_active_incident_exists(self, machine_id: str) -> bool:
        pass