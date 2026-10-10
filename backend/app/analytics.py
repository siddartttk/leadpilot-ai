from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from sqlalchemy import select, func, case
from .models import Lead, Task, Activity, now
from .scoring import STAGES, SOURCES

def analytics(db,workspace,start,end,source=None):
    filters=[Lead.workspace_id==workspace.id,Lead.archived.is_(False),Lead.created_at>=start,Lead.created_at<end]
    if source: filters.append(Lead.source==source)
    def metrics(a,b):
        conditions=[Lead.workspace_id==workspace.id,Lead.archived.is_(False),Lead.created_at>=a,Lead.created_at<b]
        if source: conditions.append(Lead.source==source)
        result=db.execute(select(func.count(Lead.id),func.sum(case((Lead.status=='New',1),else_=0)),func.sum(case((Lead.status=='Qualified',1),else_=0)),func.sum(case((Lead.status.in_(['Qualified','Proposal Sent','Negotiation']),1),else_=0)),func.sum(case((Lead.status=='Won',1),else_=0)),func.sum(case((Lead.status.not_in(['Won','Lost']),func.coalesce(Lead.budget,0)),else_=0)),func.sum(case((Lead.status=='Won',func.coalesce(Lead.final_value,0)),else_=0))).where(*conditions)).one()
        total,new,qualified,active,won,pipeline,won_value=[v or 0 for v in result]
        return dict(total=total,new=new,qualified=qualified,active=active,won=won,conversion=round(won/total*100,1) if total else None,pipeline=pipeline,won_value=won_value)
    current=metrics(start,end)
    previous=metrics(start-(end-start),start)
    stages=[{'name':stage,'count':0,'value':0} for stage in STAGES]
    for name,count,value in db.execute(select(Lead.status,func.count(),func.sum(func.coalesce(Lead.budget,0))).where(*filters).group_by(Lead.status)):
        next(v for v in stages if v['name']==name).update(count=count,value=value)
    source_rows=[]
    for name,count,won,value in db.execute(select(Lead.source,func.count(),func.sum(case((Lead.status=='Won',1),else_=0)),func.sum(case((Lead.status=='Won',func.coalesce(Lead.final_value,0)),else_=0))).where(*filters).group_by(Lead.source)):
        source_rows.append(dict(name=name,count=count,won=won,conversion=round(won/count*100,1),value=value))
    days={str(day):count for day,count in db.execute(select(func.date(Lead.created_at),func.count()).where(*filters).group_by(func.date(Lead.created_at)))}
    trend=[]
    for offset in range((end.date()-start.date()).days):
        day=start+timedelta(days=offset)
        trend.append({'date':day.strftime('%Y-%m-%d'),'count':days.get(day.strftime('%Y-%m-%d'),0)})
    eligible=select(Lead.id).where(*filters)
    task_filters=[Task.workspace_id==workspace.id,Task.lead_id.in_(eligible)]
    today=now().replace(tzinfo=timezone.utc).astimezone(ZoneInfo(workspace.timezone)).replace(hour=0,minute=0,second=0,microsecond=0).astimezone(timezone.utc).replace(tzinfo=None)
    overdue=db.scalar(select(func.count()).select_from(Task).where(*task_filters,Task.completed.is_(False),Task.due_at<now())) or 0
    current['overdue']=overdue
    task_total=db.scalar(select(func.count()).select_from(Task).where(*task_filters)) or 0
    task_done=db.scalar(select(func.count()).select_from(Task).where(*task_filters,Task.completed.is_(True))) or 0
    tasks=db.execute(select(Task,Lead.name).join(Lead,Lead.id==Task.lead_id).where(*task_filters,Task.completed.is_(False)).order_by(Task.due_at).limit(5)).all()
    activities=db.execute(select(Activity,Lead.name).join(Lead,Lead.id==Activity.lead_id).where(Activity.workspace_id==workspace.id,Activity.lead_id.in_(eligible)).order_by(Activity.created_at.desc()).limit(6)).all()
    # Average elapsed times are calculated by the database, using its native interval representation.
    def average_elapsed(column):
        interval=(func.julianday(column)-func.julianday(Lead.created_at)) if db.bind.dialect.name=='sqlite' else func.extract('epoch',column-Lead.created_at)/86400.0
        value=db.scalar(select(func.avg(interval)).where(*filters,column.is_not(None)))
        return round(value,1) if value is not None else None
    reached=[]
    conditions=[None,Lead.last_contacted.is_not(None),Lead.qualified_at.is_not(None),Lead.status.in_(['Proposal Sent','Negotiation','Won']),Lead.status=='Won']
    for name,condition in zip(['Received','Contacted','Qualified','Proposal or later','Won'],conditions):
        clauses=filters+([condition] if condition is not None else [])
        reached.append({'name':name,'count':db.scalar(select(func.count()).select_from(Lead).where(*clauses)) or 0})
    return {'metrics':current,'previous':previous,'stages':stages,'sources':source_rows,'trend':trend,'funnel':reached,'followups':{'total':task_total,'completed':task_done,'completion_rate':round(task_done/task_total*100,1) if task_total else None,'today':db.scalar(select(func.count()).select_from(Task).where(*task_filters,Task.completed.is_(False),Task.due_at>=today,Task.due_at<today+timedelta(days=1))) or 0,'overdue':overdue},'tasks':[{'id':t.id,'lead_id':t.lead_id,'lead_name':name,'title':t.title,'due_at':t.due_at,'assigned_to':t.assigned_to} for t,name in tasks],'activity':[{'id':a.id,'lead_id':a.lead_id,'lead_name':name,'text':a.text,'created_at':a.created_at,'kind':a.kind} for a,name in activities],'average_qualification_days':average_elapsed(Lead.qualified_at),'average_close_days':average_elapsed(Lead.closed_at),'period':{'start':start,'end':end,'source':source},'definitions':{'conversion':'Currently won / all non-archived leads created in the selected UTC date range. This is a cohort snapshot, not a causal conversion estimate.','pipeline':'Recorded estimated budgets of non-archived leads not currently Won or Lost. Unknown budgets count as zero.','funnel':'Contacted and qualified use retained milestone timestamps. Proposal or later uses current stage; it is not a historical reach count.','comparison':'Equivalent immediately preceding acquisition cohort, using current stages. No trend shown for zero denominator.','tasks':'Tasks belonging to the selected lead cohort. Overdue is computed against the current instant.'}}
