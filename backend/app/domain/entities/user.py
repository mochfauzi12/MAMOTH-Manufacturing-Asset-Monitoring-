from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    OPERATOR = "OPERATOR"
    SUPERVISOR = "SUPERVISOR"
    TECHNICIAN = "TECHNICIAN"
    ADMIN = "ADMIN"

class ShiftType(str, Enum):
    MORNING = "MORNING"
    AFTERNOON = "AFTERNOON"
    NIGHT = "NIGHT"

class TechnicianStatus(str, Enum):
    STANDBY = "STANDBY"
    ON_DUTY = "ON_DUTY"
    OFF_DUTY = "OFF_DUTY"
    OFFLINE = "OFFLINE"

class User(BaseModel):
    id: Optional[str] = None
    email: str
    password_hash: str
    pin: Optional[str] = None  # Hashed PIN for operators
    full_name: str
    role: UserRole
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        from_attributes = True

class Operator(BaseModel):
    id: Optional[str] = None
    user_id: str
    employee_code: str
    department: str
    shift: ShiftType
    
    class Config:
        from_attributes = True

class Supervisor(BaseModel):
    id: Optional[str] = None
    user_id: str
    employee_code: str
    area: str
    
    class Config:
        from_attributes = True

class Technician(BaseModel):
    id: Optional[str] = None
    user_id: str
    employee_code: str
    specialization: List[str] = Field(default_factory=list)
    status: TechnicianStatus = TechnicianStatus.STANDBY
    avg_mttr_minutes: Optional[float] = None
    last_heartbeat_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True