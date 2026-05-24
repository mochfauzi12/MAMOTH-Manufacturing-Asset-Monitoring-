from abc import ABC, abstractmethod
from typing import List

class NotificationGateway(ABC):
    @abstractmethod
    async def send_blast_notification(self, technician_ids: List[str], ticket_numbers: List[str], message: str) -> bool:
        pass