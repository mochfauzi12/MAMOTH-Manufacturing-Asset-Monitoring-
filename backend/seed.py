import asyncio
import sys
from datetime import datetime
from app.infrastructure.database.prisma_client import connect_db, disconnect_db, db
from app.infrastructure.security.jwt_handler import hash_password
from app.domain.entities.user import UserRole, ShiftType
from app.domain.entities.incident import IncidentUrgency

async def main():
    print("Connecting to the database...")
    await connect_db()
    
    print("Clearing existing data...")
    # Clean in reverse relation order
    await db.incidenttechnician.delete_many()
    await db.incidentauditlog.delete_many()
    await db.incident.delete_many()
    await db.technician.delete_many()
    await db.supervisor.delete_many()
    await db.operator.delete_many()
    await db.user.delete_many()
    await db.machine.delete_many()
    
    print("Seeding Machines...")
    machines = [
        {
            "machineCode": "MAC-EXT-001",
            "name": "Extruder Press A1",
            "type": "Molding Press",
            "location": "Lantai 1 - Area Cetak A",
            "floor": "1",
            "area": "Area A",
        },
        {
            "machineCode": "MAC-CNC-002",
            "name": "CNC Milling B3",
            "type": "CNC Mill",
            "location": "Lantai 1 - Area Bubut B",
            "floor": "1",
            "area": "Area B",
        },
        {
            "machineCode": "MAC-HYD-003",
            "name": "Hydraulic Pump Motor C1",
            "type": "Hydraulic Motor",
            "location": "Lantai 2 - Ruang Utilitas",
            "floor": "2",
            "area": "Area Utilitas",
        },
        {
            "machineCode": "MAC-BOI-004",
            "name": "Boiler Steam Generator D1",
            "type": "Steam Boiler",
            "location": "Lantai 1 - Area Luar Boiler",
            "floor": "1",
            "area": "Area Boiler",
        },
        {
            "machineCode": "MAC-FAC-005",
            "name": "Fasilitas Pendukung Kantor (AC / Lampu / Kalibrasi)",
            "type": "Pendukung Area Kerja",
            "location": "Gedung Kantor / Lab QC",
            "floor": "1",
            "area": "Area C",
        },
        {
            "machineCode": "MAC-FAC-006",
            "name": "Fasilitas Pendukung Gudang (Forklift / Rak)",
            "type": "Pendukung Area Kerja",
            "location": "Gedung Gudang Utama",
            "floor": "1",
            "area": "Area B",
        },
        {
            "machineCode": "MAC-FAC-007",
            "name": "Utilitas Umum (Plumbing / Air / Toilet / Sipil)",
            "type": "Pendukung Lini Pabrik",
            "location": "Pendukung Lini Pabrik",
            "floor": "1",
            "area": "Area A",
        }
    ]
    
    for mac_data in machines:
        await db.machine.create(data=mac_data)
    print(f"Seeded {len(machines)} machines.")

    # Shared default password hash
    hashed_pass = hash_password("password123")
    hashed_pin = hash_password("123456")

    print("Seeding Users...")
    
    # 1. Supervisor
    sup_user = await db.user.create(data={
        "email": "rina@contohpabrik.com",
        "passwordHash": hashed_pass,
        "fullName": "Rina Susanti",
        "role": UserRole.SUPERVISOR.value,
        "isActive": True
    })
    await db.supervisor.create(data={
        "userId": sup_user.id,
        "employeeCode": "EMP-SUP-001",
        "area": "Produksi Utama"
    })
    
    # 2. Technician
    tech_user = await db.user.create(data={
        "email": "doni@contohpabrik.com",
        "passwordHash": hashed_pass,
        "fullName": "Doni Hermawan",
        "role": UserRole.TECHNICIAN.value,
        "isActive": True
    })
    await db.technician.create(data={
        "userId": tech_user.id,
        "employeeCode": "EMP-TEC-001",
        "specialization": ["mechanical", "hydraulic"],
        "status": "STANDBY"
    })

    # 3. Operator
    op_user = await db.user.create(data={
        "email": "budi@contohpabrik.com",
        "passwordHash": hashed_pass,
        "pin": hashed_pin, # PIN 123456
        "fullName": "Budi Setiawan",
        "role": UserRole.OPERATOR.value,
        "isActive": True
    })
    await db.operator.create(data={
        "userId": op_user.id,
        "employeeCode": "EMP-OPR-001",
        "department": "Molding & Pressing",
        "shift": ShiftType.MORNING.value
    })

    print("Seeding completed successfully!")
    await disconnect_db()

if __name__ == "__main__":
    asyncio.run(main())
