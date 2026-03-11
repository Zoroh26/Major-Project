"""add zone to user

Revision ID: 2026031101
Revises: 2026031001
Create Date: 2026-03-11 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2026031101'
down_revision: Union[str, None] = '2026031001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('user', sa.Column(
        'zone', sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column('user', 'zone')
