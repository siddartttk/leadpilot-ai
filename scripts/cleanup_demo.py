"""Explicit operator maintenance: deletes expired demo workspaces only."""
import argparse
import sys
from datetime import timedelta
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from sqlalchemy import select, delete
from app.database import SessionLocal
from app.models import Workspace,Session,Draft,Note,Task,Activity,Lead,now
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--apply',action='store_true',help='Apply deletions. Default is dry-run.')
args=parser.parse_args()
with SessionLocal() as db:
    active=select(Session.workspace_id).where(Session.expires_at>now())
    ids=list(db.scalars(select(Workspace.id).where(Workspace.is_demo.is_(True),Workspace.name!='Seed baseline',Workspace.created_at<now()-timedelta(hours=8),Workspace.id.not_in(active))))
    print(f'{len(ids)} expired demo workspaces eligible for cleanup.')
    if args.apply:
        for model in (Draft,Note,Task,Activity,Lead,Session): db.execute(delete(model).where(model.workspace_id.in_(ids)))
        db.execute(delete(Workspace).where(Workspace.id.in_(ids)))
        db.commit();print('Expired demo workspaces deleted.')
    else: print('Dry-run only. Review, then rerun with --apply to delete these expired demo records.')
