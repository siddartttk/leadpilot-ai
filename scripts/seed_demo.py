"""Creates a local baseline workspace. Public sessions receive independent copies."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from app.database import SessionLocal
from app.models import Workspace
from app.seed import seed_workspace
from sqlalchemy import select
with SessionLocal() as db:
    workspace=db.scalar(select(Workspace).where(Workspace.name=='Seed baseline'))
    if not workspace:
        workspace=Workspace(name='Seed baseline',is_demo=True); db.add(workspace); db.flush()
    seed_workspace(db,workspace); db.commit()
    print('Synthetic baseline ready. Use Explore Demo to create an isolated visitor workspace.')
