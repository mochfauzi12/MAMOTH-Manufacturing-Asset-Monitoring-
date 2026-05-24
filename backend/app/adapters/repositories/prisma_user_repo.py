from typing import Optional
from app.domain.entities.user import User, UserRole
from app.domain.repositories.user_repo import UserRepository
from app.infrastructure.database.prisma_client import db

class PrismaUserRepository(UserRepository):
    async def get_by_id(self, user_id: str) -> Optional[User]:
        record = await db.user.find_unique(where={"id": user_id})
        if record:
            return User(
                id=record.id,
                email=record.email,
                password_hash=record.passwordHash,
                pin=record.pin,
                full_name=record.fullName,
                role=UserRole(record.role.value),
                is_active=record.isActive
            )
        return None

    async def get_by_email(self, email: str) -> Optional[User]:
        record = await db.user.find_unique(where={"email": email})
        if record:
            return User(
                id=record.id,
                email=record.email,
                password_hash=record.passwordHash,
                pin=record.pin,
                full_name=record.fullName,
                role=UserRole(record.role.value),
                is_active=record.isActive
            )
        return None

    async def save(self, user: User) -> User:
        data = {
            "email": user.email,
            "passwordHash": user.password_hash,
            "pin": user.pin,
            "fullName": user.full_name,
            "role": user.role.value,
            "isActive": user.is_active
        }
        if user.id:
            record = await db.user.update(where={"id": user.id}, data=data)
        else:
            record = await db.user.create(data=data)
            
        return User(
            id=record.id,
            email=record.email,
            password_hash=record.passwordHash,
            pin=record.pin,
            full_name=record.fullName,
            role=UserRole(record.role.value),
            is_active=record.isActive
        )