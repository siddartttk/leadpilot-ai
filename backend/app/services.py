from datetime import timedelta
from sqlalchemy import select
from fastapi import HTTPException
from .models import Lead, Activity, Task, now
from .scoring import qualify

def event(db, lead, kind, text, actor='System', at=None):
    db.add(Activity(workspace_id=lead.workspace_id,lead_id=lead.id,kind=kind,text=text,actor=actor,created_at=at or now()))

def automate(db,lead,workspace):
    lead.qualification = qualify(lead,workspace.high_threshold)
    lead.score = lead.qualification['score']
    if workspace.auto_task and lead.score>=workspace.high_threshold and not lead.archived and lead.status not in ('Won','Lost'):
        existing = db.scalar(select(Task).where(Task.lead_id==lead.id,Task.automation_key=='high-priority'))
        if not existing:
            db.add(Task(workspace_id=lead.workspace_id,lead_id=lead.id,title='Review high-priority inquiry',due_at=now()+timedelta(days=1),assigned_to=lead.assigned_to,automation_key='high-priority'))
            event(db,lead,'automation','High-priority review task created')

def create_lead(db,data,workspace,actor='System',utm=None):
    if db.scalar(select(Lead.id).where(Lead.workspace_id==workspace.id,Lead.email==data.email)):
        raise HTTPException(409,'A lead with this email already exists, including archived records.')
    lead = Lead(**data.model_dump(),workspace_id=workspace.id,currency=workspace.currency,utm=utm or {})
    db.add(lead)
    db.flush()
    automate(db,lead,workspace)
    event(db,lead,'created','Inquiry received',actor)
    return lead

def move_lead(db,lead,data,actor):
    previous = lead.status
    if previous==data.status: return lead
    if data.status=='Won' and data.final_value is None: raise HTTPException(422,'Enter the actual final value to close this deal as won')
    lead.status = data.status
    if data.status=='Contacted': lead.last_contacted = now()
    if data.status in ('Qualified','Proposal Sent','Negotiation','Won') and not lead.qualified_at: lead.qualified_at=now()
    lead.closed_at = now() if data.status in ('Won','Lost') else None
    lead.final_value = data.final_value if data.status=='Won' else None
    lead.loss_reason = data.loss_reason if data.status=='Lost' else ''
    event(db,lead,'stage',f'{previous} → {data.status}'+(f' · {lead.currency} {data.final_value:,}' if data.status=='Won' else '')+(f' · {data.loss_reason}' if data.loss_reason and data.status=='Lost' else ''),actor)
    return lead

def row_dict(row):
    return {column.name:getattr(row,column.name) for column in row.__table__.columns}

def lead_dict(row):
    result=row_dict(row)
    result.pop('workspace_id',None)
    return result
