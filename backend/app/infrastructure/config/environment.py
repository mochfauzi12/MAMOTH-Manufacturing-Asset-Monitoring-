from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "mamoth-ops-dev-default-secret-key-that-is-very-long"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "debug"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost"
    
    FCM_PROJECT_ID: str = ""
    VAPID_PUBLIC_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""
    VAPID_CLAIMS_EMAIL: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
