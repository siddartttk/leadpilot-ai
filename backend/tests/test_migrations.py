import os
import subprocess
import sys
from pathlib import Path
from sqlalchemy import create_engine,inspect

def test_frozen_initial_migration(tmp_path):
    url='sqlite:///'+str(tmp_path/'migration.db').replace('\\','/')
    environment={**os.environ,'DATABASE_URL':url}
    result=subprocess.run([sys.executable,'-m','alembic','upgrade','head'],cwd=Path(__file__).resolve().parents[1],env=environment,capture_output=True,text=True)
    assert result.returncode==0,result.stderr
    engine=create_engine(url)
    assert set(inspect(engine).get_table_names())=={'alembic_version','workspaces','users','sessions','leads','activities','notes','tasks','drafts'}
    engine.dispose()
    result=subprocess.run([sys.executable,'-m','alembic','check'],cwd=Path(__file__).resolve().parents[1],env=environment,capture_output=True,text=True)
    assert result.returncode==0,result.stderr
