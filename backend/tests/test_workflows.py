import csv
import io
from datetime import timedelta
from fastapi.testclient import TestClient
from sqlalchemy import select,func
from app.main import app
from app.models import Lead,Task,User,Session,Workspace,now
from app.schemas import Extraction
from app import ai
from app.config import settings
from app.security import limit
from pydantic import ValidationError
import pytest

def test_crud_search_archive_restore(demo,lead_data):
    created=demo.post('/api/leads',json=lead_data);assert created.status_code==201
    lead=created.json();id=lead['id'];assert lead['score']==100
    assert sum(f['points'] for f in lead['qualification']['factors'])==lead['score']
    lead_data['company']='Revised Fictional Co'
    assert demo.put('/api/leads/'+id,json=lead_data).json()['company']==lead_data['company']
    assert demo.get('/api/leads?q=Revised').json()['total']==1
    assert demo.get('/api/leads?source=Referral&q=Revised').json()['total']==1
    assert demo.get('/api/leads?source=Website&q=Revised').json()['total']==0
    assert demo.post('/api/leads/'+id+'/archive').json()['archived']
    assert demo.get('/api/leads?q=Revised').json()['total']==0
    assert demo.get('/api/leads?q=Revised&archived=true').json()['total']==1
    assert not demo.post('/api/leads/'+id+'/archive?archived=false').json()['archived']
    assert demo.get('/api/leads/'+id).json()['company']==lead_data['company']

def test_deduplication_and_invalid_inputs(demo,lead_data):
    demo.post('/api/leads',json=lead_data)
    lead_data['email']='BUYER@EXAMPLE.COM'
    assert demo.post('/api/leads',json=lead_data).status_code==409
    for fields in [{'email':'bad'},{'budget':-1},{'message':'x'},{'service':'Unknown'},{'workspace_id':'other'},{'website':'javascript:alert(1)'},{'name':'a'*101}]:
        assert demo.post('/api/leads',json={**lead_data,**fields}).status_code==422
    assert demo.get('/api/leads?size=99999').status_code==422
    assert demo.get('/api/leads?q=%25').json()['total']==0

def test_qualification_and_automation_idempotency(demo,lead_data,setup):
    lead=demo.post('/api/leads',json=lead_data).json()
    scores=[demo.post('/api/leads/'+lead['id']+'/qualify').json() for _ in range(3)]
    assert all(s==scores[0] for s in scores)
    with setup() as db: assert db.scalar(select(func.count()).select_from(Task).where(Task.lead_id==lead['id']))==1
    incomplete={**lead_data,'email':'unknown@example.com','company':'','budget':None,'message':'Please tell me more about your services.'}
    result=demo.post('/api/leads',json=incomplete).json()
    assert result['qualification']['category']=='Needs more information'
    assert 'Budget' in result['qualification']['missing']

def test_pipeline_and_activity(demo,lead_data):
    id=demo.post('/api/leads',json=lead_data).json()['id']
    assert demo.patch('/api/leads/'+id+'/stage',json={'status':'Qualified'}).status_code==200
    assert demo.patch('/api/leads/'+id+'/stage',json={'status':'Won'}).status_code==422
    won=demo.patch('/api/leads/'+id+'/stage',json={'status':'Won','final_value':100000}).json()
    assert won['closed_at'] and won['final_value']==100000
    open_leads=demo.get('/api/leads?active=true&size=200').json()['items']
    assert all(lead['status'] not in ('Won','Lost') for lead in open_leads)
    assert id not in [lead['id'] for lead in open_leads]
    previous=demo.get('/api/leads/'+id).json()['activity']
    demo.patch('/api/leads/'+id+'/stage',json={'status':'Won','final_value':100000})
    assert demo.get('/api/leads/'+id).json()['activity']==previous
    reopened=demo.patch('/api/leads/'+id+'/stage',json={'status':'New'}).json()
    assert reopened['closed_at'] is None and reopened['final_value'] is None
    lost=demo.patch('/api/leads/'+id+'/stage',json={'status':'Lost','loss_reason':'Scope changed'}).json()
    assert lost['loss_reason']=='Scope changed'

def test_tasks_notes_and_drafts(demo,lead_data):
    id=demo.post('/api/leads',json=lead_data).json()['id']
    assert demo.post('/api/leads/'+id+'/notes',json={'body':'Reviewed scope'}).status_code==201
    assert demo.post('/api/leads/'+id+'/contact',json={'body':'Manual call recorded'}).status_code==200
    task=demo.post('/api/tasks',json={'lead_id':id,'title':'Call the buyer','due_at':'2026-10-10T10:00:00+05:30'}).json()
    assert task['due_at']=='2026-10-10T04:30:00'
    assert demo.patch('/api/tasks/'+task['id'],json={'completed':True}).json()['completed']
    assert demo.patch('/api/tasks/'+task['id'],json={'assigned_to':'Test owner','notes':'New context'}).json()['notes']=='New context'
    today=now().isoformat()+'Z'
    today_task=demo.post('/api/tasks',json={'lead_id':id,'title':'Today task','due_at':today}).json()
    assert today_task['id'] in [t['id'] for t in demo.get('/api/tasks?state=today').json()['items']]
    assert demo.post('/api/tasks',json={'lead_id':id,'title':'Bad task','due_at':'2026-10-10T10:00:00'}).status_code==422
    draft=demo.post('/api/drafts',json={'lead_id':id,'kind':'First response','tone':'Professional'}).json()
    assert draft['mode']=='rules' and not draft['approved']
    assert demo.patch('/api/drafts/'+draft['id'],json={'body':'Reviewed message','approved':True}).json()['approved']
    assert not demo.patch('/api/drafts/'+draft['id'],json={'body':'Changed message'}).json()['approved']
    detail=demo.get('/api/leads/'+id).json()
    assert detail['last_contacted'] and len(detail['notes'])==1 and len(detail['drafts'])==1

def test_analytics_consistent_with_database(demo,setup):
    stats=demo.get('/api/analytics?days=180').json()
    all_leads=demo.get('/api/leads?size=200').json()['items']
    assert stats['metrics']['total']==len(all_leads)==160
    won=[l for l in all_leads if l['status']=='Won']
    assert stats['metrics']['won']==len(won)
    assert stats['metrics']['conversion']==round(len(won)/160*100,1)
    assert stats['metrics']['pipeline']==sum(l['budget'] or 0 for l in all_leads if l['status'] not in ['Won','Lost'])
    assert sum(v['count'] for v in stats['trend'])==160
    assert sum(v['count'] for v in stats['sources'])==160
    filtered=demo.get('/api/analytics?source=Referral').json()
    assert filtered['metrics']['total']==sum(l['source']=='Referral' for l in all_leads)
    assert all(v['name']=='Referral' for v in filtered['sources'])
    assert demo.get('/api/analytics?start=bad').status_code==422
    assert demo.get('/api/analytics?start=2026-10-10&end=2025-01-01').status_code==422

def test_workspace_and_demo_isolation(demo,lead_data,setup):
    first=demo.post('/api/leads',json=lead_data).json()
    detail=demo.get('/api/leads/'+first['id']).json()
    draft=demo.post('/api/drafts',json={'lead_id':first['id']}).json()
    with TestClient(app) as other:
        info=other.post('/api/demo').json();other.headers['X-CSRF-Token']=info['csrf']
        assert other.get('/api/leads').json()['total']==160
        assert other.get('/api/leads/'+first['id']).status_code==404
        assert other.put('/api/leads/'+first['id'],json=lead_data).status_code==404
        assert other.patch('/api/tasks/'+detail['tasks'][0]['id'],json={'completed':True}).status_code==404
        assert other.patch('/api/drafts/'+draft['id'],json={'body':'forbidden'}).status_code==404
        assert other.post('/api/leads/'+first['id']+'/notes',json={'body':'forbidden'}).status_code==404
        assert other.post('/api/demo/reset').status_code==200
    assert demo.get('/api/leads').json()['total']==161
    assert demo.post('/api/demo/reset').status_code==200
    assert demo.get('/api/leads').json()['total']==160

def test_auth_csrf_roles_expiration_and_logout(client,setup,lead_data):
    assert client.get('/api/leads').status_code==401
    credentials={'email':'owner@example.com','password':'A-long-test-password-123'}
    response=client.post('/api/auth/register',json={**credentials,'name':'Owner','workspace':'Private workspace'})
    assert response.status_code==200
    cookie=response.headers['set-cookie'].lower();assert 'httponly' in cookie and 'samesite=lax' in cookie
    assert client.post('/api/leads',json=lead_data).status_code==403
    client.headers['X-CSRF-Token']=response.json()['csrf']
    assert client.get('/api/leads').json()['total']==0
    assert client.get('/api/analytics').json()['metrics']['conversion'] is None
    assert client.post('/api/demo/reset').status_code==403
    assert client.post('/api/leads',json=lead_data,headers={'Origin':'https://evil.example'}).status_code==403
    with setup() as db:
        user=db.scalar(select(User));assert user.password_hash.startswith('$argon2')
        user.role='viewer';db.commit()
    assert client.post('/api/leads',json=lead_data).status_code==403
    assert client.get('/api/leads').status_code==200
    with setup() as db:
        user=db.scalar(select(User));user.role='admin';db.commit()
    assert client.post('/api/auth/logout').status_code==200
    assert client.get('/api/session').status_code==401
    assert client.post('/api/auth/login',json={**credentials,'password':'Wrong-password-123'}).status_code==401
    response=client.post('/api/auth/login',json=credentials);assert response.status_code==200
    with setup() as db:
        for session in db.scalars(select(Session)): session.expires_at=now()-timedelta(seconds=1)
        db.commit()
    assert client.get('/api/leads').status_code==401

def test_capture_spam_consent_and_duplicates(demo,lead_data):
    assert demo.post('/api/capture',json={**lead_data,'consent':False}).status_code==422
    assert demo.post('/api/capture',json={**lead_data,'consent':True,'honeypot':'spam'}).status_code==422
    response=demo.post('/api/capture',json={**lead_data,'consent':True,'utm_source':'portfolio','utm_campaign':'test'})
    assert response.status_code==201
    saved=demo.get('/api/leads/'+response.json()['id']).json()
    assert saved['source']=='Website' and saved['utm']['campaign']=='test'
    assert demo.post('/api/capture',json={**lead_data,'consent':True}).status_code==409

def test_export_formula_safety_and_filters(demo,lead_data):
    demo.post('/api/leads',json={**lead_data,'name':'=HYPERLINK("bad")'})
    result=demo.get('/api/leads/export?q=HYPERLINK')
    assert result.status_code==200
    rows=list(csv.reader(io.StringIO(result.text)))
    assert len(rows)==2 and rows[1][0].startswith("'=")
    assert 'buyer@example.com' in result.text

def test_ai_schemas_and_failure_handling(demo,lead_data,monkeypatch):
    id=demo.post('/api/leads',json=lead_data).json()['id']
    with pytest.raises(ValidationError): Extraction(stated_budget=-10)
    with pytest.raises(ValidationError): Extraction(unexpected='bad')
    monkeypatch.setattr(settings,'ai_mode','live');monkeypatch.setattr(settings,'allow_live_ai',True);monkeypatch.setattr(settings,'ai_api_key','never-used-test-key')
    def fail(*a,**k): raise ai.httpx.ReadTimeout('test')
    monkeypatch.setattr(ai.httpx,'post',fail)
    assert demo.post('/api/drafts',json={'lead_id':id}).json()['mode']=='rules'
    class FakeWorkspace: is_demo=False
    assert ai.live_enabled(FakeWorkspace())
    with pytest.raises(Exception) as exc: ai.complete('test',{},ai.AIText)
    assert exc.value.status_code==502
    class BadResponse:
        def raise_for_status(self): pass
        def json(self): return {'choices':[{'message':{'content':'{"body":42}'}}]}
    monkeypatch.setattr(ai.httpx,'post',lambda *a,**k:BadResponse())
    with pytest.raises(Exception) as exc: ai.complete('test',{},ai.AIText)
    assert exc.value.status_code==502

def test_rate_limit_and_request_size(client):
    assert client.post('/api/demo',content='x'*32769).status_code==413
    for _ in range(3): limit('test-limit',3,60)
    with pytest.raises(Exception) as exc: limit('test-limit',3,60)
    assert exc.value.status_code==429
