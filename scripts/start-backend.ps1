$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..\backend')
& '..\.venv\Scripts\python.exe' -m alembic upgrade head
if ($LASTEXITCODE -ne 0) { throw 'Migration failed' }
& '..\.venv\Scripts\python.exe' -m uvicorn app.main:app --host 127.0.0.1 --port 8000
