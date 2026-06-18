"""Add Escalation model with tracking fields

Revision ID: add_escalation_table
Revises: 
Create Date: 2024-04-07 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_escalation_table'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create escalation table
    op.create_table(
        'escalation',
        sa.Column('uuid', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('zone_uuid', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('assigned_to_uuid', postgresql.UUID(
            as_uuid=True), nullable=True),
        sa.Column('created_by_uuid', postgresql.UUID(
            as_uuid=True), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('priority', sa.String(20),
                  nullable=False, server_default='medium'),
        sa.Column('status', sa.String(20), nullable=False,
                  server_default='pending'),
        sa.Column('action_taken', sa.Text(), nullable=True),
        sa.Column('is_acted_upon', sa.Boolean(),
                  nullable=False, server_default='false'),
        sa.Column('is_false_alarm', sa.Boolean(),
                  nullable=False, server_default='false'),
        sa.Column('acted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('camera_uuid', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_deleted', sa.Boolean(),
                  nullable=False, server_default='false'),
        sa.ForeignKeyConstraint(['assigned_to_uuid'], [
                                'user.uuid'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(
            ['camera_uuid'], ['camera.uuid'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by_uuid'], [
                                'user.uuid'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(
            ['zone_uuid'], ['zone.uuid'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('uuid'),
        sa.UniqueConstraint('uuid')
    )

    # Create indexes
    op.create_index('ix_escalation_uuid', 'escalation', ['uuid'])
    op.create_index('ix_escalation_zone_uuid', 'escalation', ['zone_uuid'])
    op.create_index('ix_escalation_assigned_to_uuid',
                    'escalation', ['assigned_to_uuid'])
    op.create_index('ix_escalation_created_by_uuid',
                    'escalation', ['created_by_uuid'])
    op.create_index('ix_escalation_title', 'escalation', ['title'])
    op.create_index('ix_escalation_priority', 'escalation', ['priority'])
    op.create_index('ix_escalation_status', 'escalation', ['status'])
    op.create_index('ix_escalation_is_acted_upon',
                    'escalation', ['is_acted_upon'])
    op.create_index('ix_escalation_is_false_alarm',
                    'escalation', ['is_false_alarm'])
    op.create_index('ix_escalation_camera_uuid', 'escalation', ['camera_uuid'])
    op.create_index('ix_escalation_created_at', 'escalation', ['created_at'])
    op.create_index('ix_escalation_resolved_at', 'escalation', ['resolved_at'])
    op.create_index('ix_escalation_is_deleted', 'escalation', ['is_deleted'])
    op.create_index('ix_escalation_zone_status',
                    'escalation', ['zone_uuid', 'status'])
    op.create_index('ix_escalation_assigned_status',
                    'escalation', ['assigned_to_uuid', 'status'])
    op.create_index('ix_escalation_created_at_zone',
                    'escalation', ['created_at', 'zone_uuid'])


def downgrade() -> None:
    # Drop table and indexes
    op.drop_table('escalation')
