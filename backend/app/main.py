from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.infrastructure.config.environment import settings
from app.infrastructure.middleware.logging_middleware import LoggingMiddleware
from app.infrastructure.database.prisma_client import connect_db, disconnect_db
from app.adapters.controllers.http.auth_controller import router as auth_router
from app.adapters.controllers.http.incident_controller import router as incident_router
from app.adapters.controllers.http.machine_controller import router as machine_router
from app.adapters.controllers.http.technician_controller import router as technician_router
from app.adapters.controllers.ws.router import router as ws_router
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Lifespan context handles DB Connection singleton hook
    await connect_db()
    yield
    await disconnect_db()

app = FastAPI(
    title="MAMOTH-Ops API",
    description="Machine Maintenance & Operations Technology Hub Core Backend API",
    version="2.0.0",
    lifespan=lifespan
)

# CORS configuration
origins = settings.CORS_ORIGINS.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging Middleware
app.add_middleware(LoggingMiddleware)

# HTTP Routing
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(incident_router, prefix="/api/v1/incidents", tags=["Incidents"])
app.include_router(machine_router, prefix="/api/v1/machines", tags=["Machines"])
app.include_router(technician_router, prefix="/api/v1/technicians", tags=["Technicians"])

# WS Routing
app.include_router(ws_router, tags=["WebSockets"])

@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "healthy", "version": "2.0.0"}