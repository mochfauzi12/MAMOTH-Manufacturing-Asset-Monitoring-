from prisma import Prisma

# Singleton prisma instance
db = Prisma(auto_register=True)

async def connect_db():
    if not db.is_connected():
        await db.connect()

async def disconnect_db():
    if db.is_connected():
        await db.disconnect()
