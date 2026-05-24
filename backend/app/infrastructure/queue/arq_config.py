from arq import create_pool
from arq.connections import RedisSettings
from app.infrastructure.config.environment import settings

async def get_redis_queue():
    # Helper provider for FastAPI Dependency Injection
    try:
        # arq requires a RedisSettings instance
        redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
        pool = await create_pool(redis_settings)
        return pool
    except Exception:
        # Fallback in local development without Redis running
        return None