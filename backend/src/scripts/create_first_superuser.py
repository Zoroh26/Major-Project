import asyncio
import logging
from uuid6 import uuid7 #126
from datetime import UTC, datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, MetaData, String, Table, insert, select
from sqlalchemy.dialects.postgresql import UUID

from ..app.core.config import settings
from ..app.core.db.database import AsyncSession, async_engine, local_session
from ..app.core.security import get_password_hash
from ..app.models.user import User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def create_first_user(session: AsyncSession) -> None:
    try:
        name = settings.ADMIN_NAME
        email = settings.ADMIN_EMAIL
        username = settings.ADMIN_USERNAME
        hashed_password = get_password_hash(settings.ADMIN_PASSWORD)

        query = select(User).filter_by(email=email)
        result = await session.execute(query)
        user = result.scalar_one_or_none()

        if user is None:
            user_create = User(
                email=email,
                hashed_password=hashed_password,
                role="admin"
            )
            session.add(user_create)
            await session.commit()
            logger.info(f"Admin user {email} created successfully.")
        else:
            logger.info(f"Admin user {email} already exists.")

        # Seed Security Accounts
        zones = ["top-left", "top-right", "bottom-left", "bottom-right"]
        for zone in zones:
            guard_email = f"security_{zone.replace('-', '_')}@example.com"
            query = select(User).filter_by(email=guard_email)
            result = await session.execute(query)
            guard = result.scalar_one_or_none()

            if guard is None:
                guard_pass = get_password_hash("Guard123!")
                new_guard = User(
                    email=guard_email,
                    hashed_password=guard_pass,
                    role="security",
                    zone=zone
                )
                session.add(new_guard)
                await session.commit()
                logger.info(f"Security guard {guard_email} created successfully.")

    except Exception as e:
        logger.error(f"Error creating admin user: {e}")


async def main():
    async with local_session() as session:
        await create_first_user(session)


if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(main())
