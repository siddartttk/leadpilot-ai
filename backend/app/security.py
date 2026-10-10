import hashlib
import secrets
import threading
import time
from datetime import timedelta
from fastapi import Depends, HTTPException, Request, Response
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession
from .database import get_db
from .models import Session, Workspace, User, now
from .config import settings

passwords = PasswordHash.recommended()
_dummy_hash = passwords.hash('not-a-user-password-000')
_buckets: dict = {}
_lock = threading.Lock()

def limit(key, count=30, seconds=60):
    current = time.monotonic()
    with _lock:
        for old_key in list(_buckets):
            if _buckets[old_key][1] <= current: del _buckets[old_key]
        hits, until = _buckets.get(key,(0,current+seconds))
        if hits >= count: raise HTTPException(429,'Too many requests. Please try again later.',headers={'Retry-After':str(seconds)})
        _buckets[key] = (hits+1,until)

def origin_check(request: Request):
    origin = request.headers.get('origin')
    if origin and origin not in settings.allowed_origins.split(','):
        raise HTTPException(403,'Origin is not allowed')

def start_session(db, workspace, response, user=None):
    raw = secrets.token_urlsafe(32)
    session = Session(id=hashlib.sha256(raw.encode()).hexdigest(), workspace_id=workspace.id,user_id=user.id if user else None,csrf=secrets.token_urlsafe(32),expires_at=now()+timedelta(hours=8 if workspace.is_demo else 24))
    db.add(session)
    db.commit()
    response.set_cookie('lp_session',raw,httponly=True,secure=settings.cookie_secure,samesite='lax',max_age=28800 if workspace.is_demo else 86400,path='/')
    return session

def context(request: Request, db: DBSession = Depends(get_db)):
    raw = request.cookies.get('lp_session','')
    session = db.get(Session,hashlib.sha256(raw.encode()).hexdigest()) if raw else None
    if not session or session.expires_at < now(): raise HTTPException(401,'Sign in or start a demo to continue')
    if request.method not in ('GET','HEAD','OPTIONS'):
        origin_check(request)
        if not secrets.compare_digest(request.headers.get('x-csrf-token',''),session.csrf): raise HTTPException(403,'Invalid CSRF token')
    workspace = db.get(Workspace,session.workspace_id)
    user = db.get(User,session.user_id) if session.user_id else None
    if not workspace or (not workspace.is_demo and not user) or (user and user.workspace_id != workspace.id): raise HTTPException(401,'Session no longer available')
    if user and user.role == 'viewer' and request.method not in ('GET','HEAD','OPTIONS') and request.url.path != '/api/auth/logout': raise HTTPException(403,'Read-only role')
    return {'session':session,'workspace':workspace,'user':user,'actor':user.name if user else 'Demo visitor'}

def scoped(db, model, id, ctx):
    row = db.scalar(select(model).where(model.id==id,model.workspace_id==ctx['workspace'].id))
    if row is None: raise HTTPException(404,'Record not found')
    return row
