import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, Boolean, DateTime, ForeignKey, JSON, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base

def uid(): return str(uuid.uuid4())
def now(): return datetime.now(timezone.utc).replace(tzinfo=None)

class Workspace(Base):
    __tablename__ = 'workspaces'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String(120), default='Northstar Studio')
    currency: Mapped[str] = mapped_column(String(3), default='INR')
    timezone: Mapped[str] = mapped_column(String(60), default='Asia/Kolkata')
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    high_threshold: Mapped[int] = mapped_column(Integer, default=75)
    auto_task: Mapped[bool] = mapped_column(Boolean, default=True)

class User(Base):
    __tablename__ = 'users'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    workspace_id: Mapped[str] = mapped_column(ForeignKey('workspaces.id'), index=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(String(20), default='admin')

class Session(Base):
    __tablename__ = 'sessions'
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(ForeignKey('workspaces.id'), index=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    csrf: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)

class Lead(Base):
    __tablename__ = 'leads'
    __table_args__ = (UniqueConstraint('workspace_id','email'), Index('ix_lead_workspace_created','workspace_id','created_at'))
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    workspace_id: Mapped[str] = mapped_column(ForeignKey('workspaces.id'), index=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(254))
    phone: Mapped[str] = mapped_column(String(40), default='')
    company: Mapped[str] = mapped_column(String(120), default='')
    website: Mapped[str] = mapped_column(String(300), default='')
    service: Mapped[str] = mapped_column(String(100))
    message: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(30), default='Website', index=True)
    budget: Mapped[int | None] = mapped_column(Integer, nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default='INR')
    status: Mapped[str] = mapped_column(String(30), default='New', index=True)
    assigned_to: Mapped[str] = mapped_column(String(100), default='Unassigned')
    tags: Mapped[list] = mapped_column(JSON, default=list)
    utm: Mapped[dict] = mapped_column(JSON, default=dict)
    score: Mapped[int] = mapped_column(Integer, default=0)
    qualification: Mapped[dict] = mapped_column(JSON, default=dict)
    archived: Mapped[bool] = mapped_column(Boolean, default=False)
    loss_reason: Mapped[str] = mapped_column(String(500), default='')
    final_value: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)
    last_contacted: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    qualified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

class Activity(Base):
    __tablename__ = 'activities'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    workspace_id: Mapped[str] = mapped_column(ForeignKey('workspaces.id'), index=True)
    lead_id: Mapped[str] = mapped_column(ForeignKey('leads.id'), index=True)
    kind: Mapped[str] = mapped_column(String(30))
    text: Mapped[str] = mapped_column(Text)
    actor: Mapped[str] = mapped_column(String(100), default='System')
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

class Note(Base):
    __tablename__ = 'notes'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    workspace_id: Mapped[str] = mapped_column(ForeignKey('workspaces.id'), index=True)
    lead_id: Mapped[str] = mapped_column(ForeignKey('leads.id'), index=True)
    body: Mapped[str] = mapped_column(Text)
    author: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

class Task(Base):
    __tablename__ = 'tasks'
    __table_args__ = (UniqueConstraint('lead_id','automation_key'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    workspace_id: Mapped[str] = mapped_column(ForeignKey('workspaces.id'), index=True)
    lead_id: Mapped[str] = mapped_column(ForeignKey('leads.id'), index=True)
    title: Mapped[str] = mapped_column(String(200))
    notes: Mapped[str] = mapped_column(Text, default='')
    assigned_to: Mapped[str] = mapped_column(String(100), default='Unassigned')
    due_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    automation_key: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

class Draft(Base):
    __tablename__ = 'drafts'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    workspace_id: Mapped[str] = mapped_column(ForeignKey('workspaces.id'), index=True)
    lead_id: Mapped[str] = mapped_column(ForeignKey('leads.id'), index=True)
    kind: Mapped[str] = mapped_column(String(40))
    tone: Mapped[str] = mapped_column(String(30))
    body: Mapped[str] = mapped_column(Text)
    mode: Mapped[str] = mapped_column(String(20))
    approved: Mapped[bool] = mapped_column(Boolean, default=False)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    token_usage: Mapped[dict] = mapped_column(JSON, default=dict)
