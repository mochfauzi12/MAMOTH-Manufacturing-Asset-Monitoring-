from fastapi import APIRouter
router = APIRouter()
@router.get("")
async def list_technicians():
    return {"technicians": []}
