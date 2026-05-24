import asyncio
import structlog
from arq.connections import RedisSettings
from app.infrastructure.config.environment import settings
from app.adapters.gateways.mock_notification_gateway import MockNotificationGateway

logger = structlog.get_logger()

async def blast_notification_task(ctx, ticket_numbers: list, message: str):
    logger.info("Worker menerima job blast_notification_task", tickets=ticket_numbers)
    
    # Mock technician selection loop (represents standby technicians in DB)
    mock_technicians = ["tech-doni", "tech-agus", "tech-rian", "tech-joko", "tech-hadi", "tech-agus2", "tech-rian2", "tech-doni2"]
    
    gateway = MockNotificationGateway()
    await gateway.send_blast_notification(mock_technicians, ticket_numbers, message)

async def startup(ctx):
    logger.info("ARQ Worker Background Engine online.")

async def shutdown(ctx):
    logger.info("ARQ Worker Background Engine offline.")

class WorkerSettings:
    functions = [blast_notification_task]
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    on_startup = startup
    on_shutdown = shutdown