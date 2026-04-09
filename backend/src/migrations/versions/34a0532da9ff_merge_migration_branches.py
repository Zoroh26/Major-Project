"""Merge migration branches

Revision ID: 34a0532da9ff
Revises: add_escalation_table, b613c62ee7f1
Create Date: 2026-04-07 10:30:58.466199

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '34a0532da9ff'
down_revision: Union[str, None] = ('add_escalation_table', 'b613c62ee7f1')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
