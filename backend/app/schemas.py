from datetime import datetime, timezone
from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

Stage = Literal['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost']
Source = Literal['Website', 'Referral', 'Email', 'Social', 'Other']
Service = Literal['Website development', 'E-commerce solutions', 'AI automation', 'Business analytics', 'Customer support chatbots', 'Custom software development']
Tone = Literal['Professional','Friendly','Concise','Consultative']
DraftKind = Literal['First response','Follow-up','Missing information','Summary','Rewrite','Meeting invitation','Proposal introduction']

class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)

class LeadInput(StrictModel):
    name: str = Field(min_length=2,max_length=100)
    email: EmailStr
    phone: str = Field(default='',max_length=40)
    company: str = Field(default='',max_length=120)
    website: str = Field(default='',max_length=300, pattern=r'^(https?://[^\s]+)?$')
    service: Service
    message: str = Field(min_length=10,max_length=5000)
    source: Source = 'Website'
    budget: int | None = Field(default=None,ge=0,le=1000000000)
    assigned_to: str = Field(default='Unassigned',min_length=1,max_length=100)
    tags: list[str] = Field(default_factory=list,max_length=10)
    @field_validator('email')
    @classmethod
    def normalize_email(cls,v): return v.lower()
    @field_validator('tags')
    @classmethod
    def limit_tags(cls,v):
        if any(len(t)>40 for t in v): raise ValueError('Tags must be at most 40 characters')
        return v

class StageInput(StrictModel):
    status: Stage
    loss_reason: str = Field(default='',max_length=500)
    final_value: int | None = Field(default=None,ge=0,le=1000000000)

class NoteInput(StrictModel):
    body: str = Field(min_length=1,max_length=5000)

class TaskInput(StrictModel):
    lead_id: str
    title: str = Field(min_length=2,max_length=200)
    due_at: datetime
    assigned_to: str = Field(default='Unassigned',min_length=1,max_length=100)
    notes: str = Field(default='',max_length=2000)
    @field_validator('due_at')
    @classmethod
    def utc_date(cls,v):
        if v.tzinfo is None: raise ValueError('Include a timezone offset')
        return v.astimezone(timezone.utc).replace(tzinfo=None)

class TaskUpdate(StrictModel):
    completed: bool | None = None
    due_at: datetime | None = None
    assigned_to: str | None = Field(default=None,min_length=1,max_length=100)
    notes: str | None = Field(default=None,max_length=2000)
    @field_validator('due_at')
    @classmethod
    def utc_date(cls,v):
        if v is None: return v
        return TaskInput.utc_date(v)

class DraftInput(StrictModel):
    lead_id: str
    kind: DraftKind = 'First response'
    tone: Tone = 'Professional'
    existing_text: str = Field(default='',max_length=5000)

class DraftUpdate(StrictModel):
    body: str = Field(min_length=1,max_length=8000)
    approved: bool = False

class Credentials(StrictModel):
    email: EmailStr
    password: str = Field(min_length=12,max_length=128)

class Register(Credentials):
    name: str = Field(min_length=2,max_length=100)
    workspace: str = Field(min_length=2,max_length=120)

class WorkspaceUpdate(StrictModel):
    name: str = Field(min_length=2,max_length=120)
    high_threshold: int = Field(ge=50,le=100)
    auto_task: bool

class CaptureInput(LeadInput):
    consent: bool
    honeypot: str = Field(default='',max_length=200)
    utm_source: str = Field(default='',max_length=100)
    utm_campaign: str = Field(default='',max_length=100)

class Extraction(StrictModel):
    service: str | None = Field(default=None,max_length=100)
    stated_budget: int | None = Field(default=None,ge=0,le=1000000000)
    timeline: str | None = Field(default=None,max_length=300)
    requirements: list[str] = Field(default_factory=list,max_length=20)
    missing_details: list[str] = Field(default_factory=list,max_length=20)
    evidence: list[str] = Field(default_factory=list,max_length=20)
    uncertain: list[str] = Field(default_factory=list,max_length=20)

class AIText(StrictModel):
    body: str = Field(min_length=1,max_length=8000)
