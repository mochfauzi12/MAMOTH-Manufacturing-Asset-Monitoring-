from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.infrastructure.security.jwt_handler import create_access_token, verify_password
from app.adapters.repositories.prisma_user_repo import PrismaUserRepository

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
async def login(payload: LoginRequest, repo: PrismaUserRepository = Depends()):
    user = await repo.get_by_email(payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "Email atau password salah."}
        )
    
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "Email atau password salah."}
        )
        
    access_token = create_access_token(data={"sub": user.id, "role": user.role.value})
    
    return {
        "status": "success",
        "data": {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "fullName": user.full_name,
                "role": user.role.value
            }
        }
    }