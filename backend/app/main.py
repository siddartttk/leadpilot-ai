import csv
import io
import json
import logging
import time
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from fastapi import FastAPI, Depends, HTTPException, Request, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select, func, delete, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession
from .config import settings
from .database import get_db
from .models import Workspace, User, Session, Lead, Task, Draft, Activity, Note, now
from . import schemas as s
from .security import context, scoped, start_session, passwords, _dummy_hash, limit, origin_check
from .services import create_lead, move_lead, automate, event, row_dict, lead_dict
from .seed import seed_workspace
from .analytics import analytics
from . import ai

app=FastAPI(title='LeadPilot AI',version='1.0.0',docs_url='/api/docs' if settings.app_env!='production' else None,redoc_url=None,openapi_url='/api/openapi.json' if settings.app_env!='production' else None)
app.add_middleware(CORSMiddleware,allow_origins=settings.allowed_origins.split(','),allow_credentials=True,allow_methods=['GET','POST','PUT','PATCH','DELETE'],allow_headers=['Content-Type','X-CSRF-Token'])
logger=logging.getLogger('leadpilot')
logging.basicConfig(level=logging.INFO)
# Keep search strings and contact details out of access logs; the middleware logs metadata only.
logging.getLogger('uvicorn.access').disabled=True

@app.middleware('http')
async def safety(request:Request,call_next):
    started=time.monotonic()
    if request.method in ('POST','PUT','PATCH'):
        content=b''
        async for chunk in request.stream():
            content+=chunk
            if len(content)>32768: return JSONResponse({'detail':'Request too large'},status_code=413)
        request._body=content
    try:
        limit(('api',request.client.host if request.client else 'local'),500,60)
        result=await call_next(request)
    except HTTPException as exc:
        result=JSONResponse({'detail':exc.detail},status_code=exc.status_code,headers=exc.headers)
    result.headers['X-Content-Type-Options']='nosniff'
    result.headers['Cache-Control']='no-store'
    logger.info(json.dumps({'method':request.method,'status':result.status_code,'duration_ms':round((time.monotonic()-started)*1000)}))
    return result

@app.exception_handler(IntegrityError)
async def conflict_handler(request,exc):
    return JSONResponse({'detail':'Record conflicts with an existing record. Refresh and try again.'},status_code=409)

@app.get('/api/health')
def health(db:DBSession=Depends(get_db)):
    db.execute(select(1))
    return {'status':'ok','database':db.bind.dialect.name}

def session_payload(ctx):
    workspace=ctx['workspace']
    return {'workspace':row_dict(workspace),'user':{'name':ctx['actor'],'role':ctx['user'].role if ctx['user'] else 'demo'},'csrf':ctx['session'].csrf,'ai_mode':'Live AI' if ai.live_enabled(workspace) else 'Rules-based demo mode'}

@app.get('/api/session')
def session_info(ctx=Depends(context)): return session_payload(ctx)

@app.post('/api/demo')
def demo(request:Request,response:Response,db:DBSession=Depends(get_db)):
    origin_check(request); limit(('demo',request.client.host),10,3600)
    workspace=Workspace(is_demo=True,name='Northstar Studio')
    db.add(workspace); db.flush(); seed_workspace(db,workspace)
    session=start_session(db,workspace,response)
    return session_payload({'workspace':workspace,'user':None,'actor':'Demo visitor','session':session})

@app.post('/api/auth/register')
def register(data:s.Register,request:Request,response:Response,db:DBSession=Depends(get_db)):
    origin_check(request); limit(('register',request.client.host),5,3600)
    if db.scalar(select(User.id).where(User.email==data.email.lower())): raise HTTPException(409,'Unable to create this account. Try signing in.')
    workspace=Workspace(name=data.workspace)
    db.add(workspace); db.flush()
    user=User(workspace_id=workspace.id,name=data.name,email=data.email.lower(),password_hash=passwords.hash(data.password))
    db.add(user); db.flush()
    session=start_session(db,workspace,response,user)
    return session_payload({'workspace':workspace,'user':user,'actor':user.name,'session':session})

@app.post('/api/auth/login')
def login(data:s.Credentials,request:Request,response:Response,db:DBSession=Depends(get_db)):
    origin_check(request); limit(('login',request.client.host),10,300)
    user=db.scalar(select(User).where(User.email==data.email.lower()))
    valid=passwords.verify(data.password,user.password_hash if user else _dummy_hash)
    if not user or not valid: raise HTTPException(401,'Email or password is incorrect')
    workspace=db.get(Workspace,user.workspace_id)
    session=start_session(db,workspace,response,user)
    return session_payload({'workspace':workspace,'user':user,'actor':user.name,'session':session})

@app.post('/api/auth/logout')
def logout(response:Response,ctx=Depends(context),db:DBSession=Depends(get_db)):
    db.delete(ctx['session']); db.commit(); response.delete_cookie('lp_session',path='/')
    return {'ok':True}

@app.post('/api/demo/reset')
def reset(ctx=Depends(context),db:DBSession=Depends(get_db)):
    workspace=ctx['workspace']
    if not workspace.is_demo: raise HTTPException(403,'Only demo workspaces can be reset')
    for model in (Draft,Note,Task,Activity,Lead): db.execute(delete(model).where(model.workspace_id==workspace.id))
    seed_workspace(db,workspace); db.commit()
    return {'ok':True}

def lead_query(ctx,q='',status='',source='',archived=False,active=False):
    query=select(Lead).where(Lead.workspace_id==ctx['workspace'].id,Lead.archived==archived)
    if q:
        escaped=q.replace('\\','\\\\').replace('%','\\%').replace('_','\\_')
        query=query.where(or_(Lead.name.ilike('%'+escaped+'%',escape='\\'),Lead.email.ilike('%'+escaped+'%',escape='\\'),Lead.company.ilike('%'+escaped+'%',escape='\\')))
    if status: query=query.where(Lead.status==status)
    if source: query=query.where(Lead.source==source)
    if active: query=query.where(Lead.status.not_in(['Won','Lost']))
    return query

@app.get('/api/leads/export')
def export(q:str=Query('',max_length=100),status:str='',source:str='',archived:bool=False,ctx=Depends(context),db:DBSession=Depends(get_db)):
    rows=db.scalars(lead_query(ctx,q,status,source,archived).order_by(Lead.created_at.desc()).limit(10000)).all()
    output=io.StringIO(); writer=csv.writer(output); writer.writerow(['Name','Email','Company','Service','Source','Status','Budget','Currency','Score'])
    def safe(value):
        text=str(value if value is not None else '')
        return "'"+text if text.lstrip().startswith(('=','+','-','@','\t','\r')) else text
    for lead in rows: writer.writerow([safe(getattr(lead,field)) for field in ['name','email','company','service','source','status','budget','currency','score']])
    return Response(output.getvalue(),media_type='text/csv',headers={'Content-Disposition':'attachment; filename="leadpilot-leads.csv"'})

@app.get('/api/leads')
def leads(q:str=Query('',max_length=100),status:str='',source:str='',archived:bool=False,active:bool=False,sort:str='created_at',page:int=Query(1,ge=1),size:int=Query(20,ge=1,le=200),ctx=Depends(context),db:DBSession=Depends(get_db)):
    query=lead_query(ctx,q,status,source,archived,active)
    total=db.scalar(select(func.count()).select_from(query.subquery()))
    order={'created_at':Lead.created_at.desc(),'score':Lead.score.desc(),'name':Lead.name.asc(),'budget':Lead.budget.desc(),'status':Lead.status.asc()}.get(sort,Lead.created_at.desc())
    rows=db.scalars(query.order_by(order,Lead.id).offset((page-1)*size).limit(size)).all()
    return {'items':[lead_dict(lead) for lead in rows],'total':total,'page':page,'size':size}

@app.post('/api/leads',status_code=201)
def add_lead(data:s.LeadInput,ctx=Depends(context),db:DBSession=Depends(get_db)):
    lead=create_lead(db,data,ctx['workspace'],ctx['actor']); db.commit(); return lead_dict(lead)

@app.get('/api/leads/{id}')
def detail(id:str,ctx=Depends(context),db:DBSession=Depends(get_db)):
    lead=scoped(db,Lead,id,ctx)
    result=lead_dict(lead)
    for key,model in [('tasks',Task),('notes',Note),('drafts',Draft),('activity',Activity)]:
        result[key]=[row_dict(row) for row in db.scalars(select(model).where(model.lead_id==id,model.workspace_id==ctx['workspace'].id).order_by(model.created_at.desc()).limit(200))]
    return result

@app.put('/api/leads/{id}')
def edit_lead(id:str,data:s.LeadInput,ctx=Depends(context),db:DBSession=Depends(get_db)):
    lead=scoped(db,Lead,id,ctx)
    for key,value in data.model_dump().items(): setattr(lead,key,value)
    automate(db,lead,ctx['workspace']); event(db,lead,'updated','Lead information updated',ctx['actor']); db.commit(); return lead_dict(lead)

@app.patch('/api/leads/{id}/stage')
def change_stage(id:str,data:s.StageInput,ctx=Depends(context),db:DBSession=Depends(get_db)):
    lead=move_lead(db,scoped(db,Lead,id,ctx),data,ctx['actor']); db.commit(); return lead_dict(lead)

@app.post('/api/leads/{id}/archive')
def archive(id:str,archived:bool=True,ctx=Depends(context),db:DBSession=Depends(get_db)):
    lead=scoped(db,Lead,id,ctx)
    if lead.archived!=archived:
        lead.archived=archived; event(db,lead,'archived' if archived else 'restored','Lead archived' if archived else 'Lead restored',ctx['actor'])
    db.commit(); return lead_dict(lead)

@app.post('/api/leads/{id}/qualify')
def qualify(id:str,ctx=Depends(context),db:DBSession=Depends(get_db)):
    lead=scoped(db,Lead,id,ctx); automate(db,lead,ctx['workspace']); db.commit(); return lead.qualification

@app.post('/api/leads/{id}/extract')
def extract(id:str,ctx=Depends(context),db:DBSession=Depends(get_db)):
    limit(('ai',ctx['workspace'].id),20,60)
    return ai.extract(scoped(db,Lead,id,ctx),ctx['workspace'])

@app.post('/api/leads/{id}/notes',status_code=201)
def add_note(id:str,data:s.NoteInput,ctx=Depends(context),db:DBSession=Depends(get_db)):
    lead=scoped(db,Lead,id,ctx); note=Note(workspace_id=lead.workspace_id,lead_id=id,body=data.body,author=ctx['actor'])
    db.add(note); event(db,lead,'note','Internal note added',ctx['actor']); db.commit(); return row_dict(note)

@app.post('/api/leads/{id}/contact')
def contact(id:str,data:s.NoteInput,ctx=Depends(context),db:DBSession=Depends(get_db)):
    lead=scoped(db,Lead,id,ctx); lead.last_contacted=now(); event(db,lead,'contact','Manually recorded communication: '+data.body,ctx['actor']); db.commit(); return {'ok':True}

@app.get('/api/tasks')
def tasks(assigned_to:str='',state:str='',page:int=Query(1,ge=1),size:int=Query(50,ge=1,le=200),ctx=Depends(context),db:DBSession=Depends(get_db)):
    query=select(Task,Lead.name).join(Lead,Lead.id==Task.lead_id).where(Task.workspace_id==ctx['workspace'].id,Lead.archived.is_(False))
    if assigned_to: query=query.where(Task.assigned_to==assigned_to)
    if state=='completed': query=query.where(Task.completed.is_(True))
    elif state=='overdue': query=query.where(Task.completed.is_(False),Task.due_at<now())
    elif state=='upcoming': query=query.where(Task.completed.is_(False),Task.due_at>=now())
    elif state=='today':
        today=now().replace(tzinfo=timezone.utc).astimezone(ZoneInfo(ctx['workspace'].timezone)).replace(hour=0,minute=0,second=0,microsecond=0).astimezone(timezone.utc).replace(tzinfo=None)
        query=query.where(Task.completed.is_(False),Task.due_at>=today,Task.due_at<today+timedelta(days=1))
    elif state=='open': query=query.where(Task.completed.is_(False))
    total=db.scalar(select(func.count()).select_from(query.subquery()))
    rows=db.execute(query.order_by(Task.completed,Task.due_at).offset((page-1)*size).limit(size)).all()
    return {'items':[{**row_dict(t),'lead_name':name} for t,name in rows],'total':total}

@app.post('/api/tasks',status_code=201)
def add_task(data:s.TaskInput,ctx=Depends(context),db:DBSession=Depends(get_db)):
    lead=scoped(db,Lead,data.lead_id,ctx); task=Task(**data.model_dump(),workspace_id=lead.workspace_id)
    db.add(task); event(db,lead,'task','Follow-up scheduled: '+data.title,ctx['actor']); db.commit(); return row_dict(task)

@app.patch('/api/tasks/{id}')
def update_task(id:str,data:s.TaskUpdate,ctx=Depends(context),db:DBSession=Depends(get_db)):
    task=scoped(db,Task,id,ctx)
    for key,value in data.model_dump(exclude_unset=True).items():
        if value is not None: setattr(task,key,value)
    event(db,scoped(db,Lead,task.lead_id,ctx),'task','Follow-up '+('completed' if task.completed else 'updated')+': '+task.title,ctx['actor']); db.commit(); return row_dict(task)

@app.post('/api/drafts',status_code=201)
def generate_draft(data:s.DraftInput,ctx=Depends(context),db:DBSession=Depends(get_db)):
    limit(('ai',ctx['workspace'].id),20,60)
    lead=scoped(db,Lead,data.lead_id,ctx)
    communication=list(db.scalars(select(Activity.text).where(Activity.workspace_id==lead.workspace_id,Activity.lead_id==lead.id,Activity.kind=='contact').order_by(Activity.created_at.desc()).limit(10)))
    body,mode,usage=ai.draft(lead,ctx['workspace'],data,communication)
    draft=Draft(workspace_id=lead.workspace_id,lead_id=lead.id,kind=data.kind,tone=data.tone,body=body,mode=mode,token_usage=usage)
    db.add(draft); event(db,lead,'draft','Draft generated for human review ('+mode+')',ctx['actor']); db.commit(); return row_dict(draft)

@app.patch('/api/drafts/{id}')
def save_draft(id:str,data:s.DraftUpdate,ctx=Depends(context),db:DBSession=Depends(get_db)):
    draft=scoped(db,Draft,id,ctx)
    draft.body=data.body; draft.approved=data.approved; draft.approved_at=now() if data.approved else None
    event(db,scoped(db,Lead,draft.lead_id,ctx),'draft','Draft approved; no message sent' if data.approved else 'Draft saved; review required',ctx['actor']); db.commit(); return row_dict(draft)

@app.get('/api/analytics')
def stats(days:int=Query(180,ge=1,le=365),source:str='',start:str='',end:str='',ctx=Depends(context),db:DBSession=Depends(get_db)):
    try:
        finish=datetime.strptime(end,'%Y-%m-%d')+timedelta(days=1) if end else now().replace(hour=0,minute=0,second=0,microsecond=0)+timedelta(days=1)
        begin=datetime.strptime(start,'%Y-%m-%d') if start else finish-timedelta(days=days)
        if not 0<(finish-begin).days<=365: raise ValueError()
    except ValueError: raise HTTPException(422,'Choose a valid date range of 1 to 365 days')
    return analytics(db,ctx['workspace'],begin,finish,source or None)

@app.patch('/api/workspace')
def preferences(data:s.WorkspaceUpdate,ctx=Depends(context),db:DBSession=Depends(get_db)):
    if ctx['user'] and ctx['user'].role!='admin': raise HTTPException(403,'Workspace admin required')
    workspace=ctx['workspace']
    for key,value in data.model_dump().items(): setattr(workspace,key,value)
    # Threshold changes affect future qualification; existing records change only on explicit recalculation.
    db.commit(); return row_dict(workspace)

@app.post('/api/capture',status_code=201)
def capture(data:s.CaptureInput,request:Request,ctx=Depends(context),db:DBSession=Depends(get_db)):
    if not ctx['workspace'].is_demo: raise HTTPException(403,'This capture endpoint is reserved for isolated demo sessions')
    limit(('capture',request.client.host),10,300)
    if data.honeypot or not data.consent: raise HTTPException(422,'Please acknowledge the demo privacy notice')
    lead_data=s.LeadInput(**data.model_dump(exclude={'consent','honeypot','utm_source','utm_campaign'}))
    lead_data.source='Website'; lead_data.assigned_to='Unassigned'
    lead=create_lead(db,lead_data,ctx['workspace'],'Demo capture',{'source':data.utm_source,'campaign':data.utm_campaign}); db.commit()
    return {'id':lead.id,'message':'Your test inquiry is saved in this isolated demo workspace.'}
