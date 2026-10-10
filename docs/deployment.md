# Deployment preparation

The source is published at [siddartttk/leadpilot-ai](https://github.com/siddartttk/leadpilot-ai). GitHub publication does not deploy the application; a hosted demo is still pending. Live paid AI, hosted account provisioning, and external messages need separate owner authorization.

## Local PostgreSQL with Docker

Install/start Docker Desktop with Linux containers. From the repository root, create a root `.env` containing a strong `POSTGRES_PASSWORD` (use URL-safe characters, or URL-encode it in a manually configured database URL).

```powershell
docker compose up --build
```

Compose waits for PostgreSQL health, runs the migration, then serves the API and frontend on loopback ports 8000 and 3000. Demo sessions seed themselves. `docker compose down` stops services while retaining the named database volume. Avoid `down -v`, which deletes the database.

To use only PostgreSQL in Docker and run the application directly:

```powershell
docker compose up -d db
Set-Location backend
$env:DATABASE_URL = 'postgresql+psycopg://leadpilot:YOUR_PASSWORD@127.0.0.1:5432/leadpilot'
..\.venv\Scripts\python.exe -m alembic upgrade head
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Docker Desktop was installed but its engine was unavailable during local implementation. Compose and PostgreSQL runtime validation remain unexecuted locally. GitHub Actions runs browser tests against PostgreSQL; [its workflow page](https://github.com/siddartttk/leadpilot-ai/actions/workflows/ci.yml) records remote results separately from the Windows/SQLite test report.

## Without Docker

Use the persistent SQLite fallback described in README, or install PostgreSQL 16+, create an application-specific database/user, set `DATABASE_URL`, and apply the same migration. SQLite is suitable for a single-user local demonstration, not the intended multiuser deployment.

## Production topology

Deploy Next.js and FastAPI as separate services with a private API network and managed/self-hosted PostgreSQL. Dockerfiles run as non-root users. Build the frontend with `BACKEND_URL` pointing to the internal API address; Next.js rewrites capture this value at build time. Set `APP_ENV=production`, `COOKIE_SECURE=true`, and `ALLOWED_ORIGINS=https://your-approved-domain` for the API. Terminate TLS at a trusted ingress. Keep the database and API off the public network.

Use a dedicated migration job in a real deployment rather than multiple API replicas each migrating at startup. The included Compose file is local development configuration, not production TLS/ingress provisioning. Build images, scan them, run migrations on a disposable database, test tenant isolation, and exercise the complete hosted workflow before calling the deployment live.

## Live AI (optional, disabled by default)

After the owner approves provider cost and data processing, set the server-only variables from `.env.example`. Use an OpenAI-compatible chat completions provider supporting JSON output. `AI_MODEL` is configurable; validate its current availability and pricing with the selected provider. No live provider call was made during implementation. Demo accounts cannot activate live mode.

## Reopen / stop

Reopen this folder in your editor and run the two PowerShell startup scripts in separate terminals. Use Ctrl+C in each terminal to stop. Data remains in `backend/leadpilot.db` (SQLite) or the PostgreSQL volume. Expired demo cleanup is a dry run unless `--apply` is explicitly supplied.
