import random
from datetime import timedelta
from sqlalchemy import select
from .models import Workspace, Lead, Task, now
from .scoring import SERVICES, SOURCES, STAGES, qualify
from .services import event

def seed_workspace(db,workspace):
    if db.scalar(select(Lead.id).where(Lead.workspace_id==workspace.id).limit(1)): return
    rng=random.Random(42)
    first=['Aarav','Maya','Rohan','Ananya','Kabir','Isha','Arjun','Meera','Dev','Tara','Vikram','Nisha','Aditya','Leela','Neel','Sana']
    last=['Mehta','Rao','Kapoor','Shah','Nair','Das','Sethi','Iyer','Bose','Patel']
    companies=['Orbit','Cedar','Juniper','Meridian','Bluebird','Fern','Paperplane','Horizon','Bloom','Atlas']
    anchor=now().replace(hour=8,minute=0,second=0,microsecond=0)
    for i in range(160):
        service=SERVICES[i%6]
        status=rng.choices(STAGES,weights=[24,17,20,15,8,11,5])[0]
        created=anchor-timedelta(days=rng.randrange(0,150),hours=rng.randrange(0,7))
        budget=rng.choice([None,25000,50000,80000,120000,180000,250000,450000])
        message=f'We are exploring {service.lower()} for our business. '+rng.choice(['We need a proposal and would like to launch in 6 weeks. Please help us understand the delivery process.','Could you share more about your approach? We are still working out our scope.','We are ready to build this quarter and need a partner to help define requirements and next steps.'])
        lead=Lead(workspace_id=workspace.id,name=f'{first[i%16]} {last[(i//16)%10]}',email=f'contact{i+1:03}@example.com',company=f'{companies[i%10]} {['Commerce','Labs','Collective','Works','Digital'][i//10%5]}',service=service,message=message,source=rng.choices(SOURCES,weights=[40,25,18,12,5])[0],budget=budget,status=status,assigned_to=['Aditi Sharma','Rohan Mehta','Unassigned'][i%3],tags=['Synthetic'],created_at=created,updated_at=created+timedelta(days=1),currency='INR')
        lead.qualification=qualify(lead)
        lead.score=lead.qualification['score']
        if status in ('Qualified','Proposal Sent','Negotiation','Won'): lead.qualified_at=min(created+timedelta(days=3),anchor)
        if status in ('Won','Lost'): lead.closed_at=min(created+timedelta(days=12),anchor)
        if status=='Won': lead.final_value=budget or 50000
        if status not in ('New',): lead.last_contacted=min(created+timedelta(days=1),anchor)
        db.add(lead); db.flush()
        event(db,lead,'created','Synthetic inquiry received',at=created)
        if status!='New': event(db,lead,'stage',f'New → {status}',actor='Demo seed',at=lead.closed_at or lead.qualified_at or lead.last_contacted)
        if i%4==0:
            db.add(Task(workspace_id=workspace.id,lead_id=lead.id,title=['Discuss project scope','Review proposal feedback','Confirm project timeline'][i%3],due_at=anchor+timedelta(days=(i%13)-4,hours=i%6),assigned_to=lead.assigned_to,completed=i%5==0,notes='Synthetic follow-up task.'))
    db.flush()
