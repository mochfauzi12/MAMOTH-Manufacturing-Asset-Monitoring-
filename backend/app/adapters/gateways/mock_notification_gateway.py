import asyncio
import structlog
from app.application.services.notification_port import NotificationGateway
from typing import List

logger = structlog.get_logger()

class MockNotificationGateway(NotificationGateway):
    async def send_blast_notification(self, technician_ids: List[str], ticket_numbers: List[str], message: str) -> bool:
        logger.info("Memulai simulasi loop pengiriman masal PWA WebPush...", total_teknisi=len(technician_ids))
        
        for idx, tech_id in enumerate(technician_ids):
            # Throttle 50ms per technician
            await asyncio.sleep(0.05)
            logger.info("Notifikasi Terkirim asinkron", 
                        index=idx+1, 
                        technician_id=tech_id, 
                        tickets=ticket_numbers,
                        gateway="WebPush/FCM")
            
        logger.info("Seluruh notifikasi blast sukses tersalurkan asinkronous.")
        return True