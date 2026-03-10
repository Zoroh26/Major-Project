from app.core.db.database import local_session
from app.core.security import get_password_hash
from app.models.user import User
from sqlalchemy import select, text
import asyncio

async def seed():
    async with local_session() as session:
        # Patch table schemas quickly to avoid postgres errors about missing cols
        await session.execute(text("ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS zone VARCHAR(20) DEFAULT NULL;"))
        await session.execute(text("ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';"))
        await session.execute(text("ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS is_superuser BOOLEAN DEFAULT FALSE;"))
        await session.commit()

        # Admin
        email = "admin@example.com"
        hashed_password = get_password_hash("admin_secure_password")
        query = select(User).filter_by(email=email)
        result = await session.execute(query)
        user = result.scalar_one_or_none()
        
        if not user:
            user_create = User(email=email, hashed_password=hashed_password, role="admin")
            session.add(user_create)
            await session.commit()
            print(f"Created {email}")
        else:
            print(f"{email} already exists")
            
        # Security roles
        zones = ["top-left", "top-right", "bottom-left", "bottom-right"]
        for zone in zones:
            guard_email = f"security_{zone.replace('-', '_')}@example.com"
            query = select(User).filter_by(email=guard_email)
            result = await session.execute(query)
            guard = result.scalar_one_or_none()
            
            if not guard:
                guard_pass = get_password_hash("Guard123!")
                new_guard = User(
                    email=guard_email,
                    hashed_password=guard_pass,
                    role="security",
                    zone=zone
                )
                session.add(new_guard)
                await session.commit()
                print(f"Created {guard_email}")

asyncio.run(seed())
