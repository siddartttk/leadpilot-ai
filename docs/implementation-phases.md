# Implementation phase record

This records the implemented application and its [GitHub source publication](https://github.com/siddartttk/leadpilot-ai). Public hosting, paid-provider testing, and local PostgreSQL runtime validation remain pending. [GitHub Actions](https://github.com/siddartttk/leadpilot-ai/actions/workflows/ci.yml) records remote validation results.

## Shared startup

From the repository root, run these in separate PowerShell terminals:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-backend.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\start-frontend.ps1
```

Open `http://127.0.0.1:3000`. Use Ctrl+C to stop each process. Dependency installation, environment setup, and PostgreSQL alternatives are in README.

| Phase | Completed | Important files | Verification | Known issues / next step |
| --- | --- | --- | --- | --- |
| 1: Foundation and visual system | Next.js/FastAPI setup, schema, frozen migration, visual tokens, shell/navigation, 160-lead seed | `frontend/app`, `components/app.tsx`, `backend/app/models.py`, `migrations`, `seed.py` | Migration and seed executed; API/database and frontend health returned 200; dashboard rendered | SQLite local fallback; validate PostgreSQL when Docker is running |
| 2: Functional CRM | CRUD, detail, archive/restore, search/filter/sort, assignment, notes, activity, export, stage transitions | `components/leads.tsx`, `app/main.py`, `services.py` | Backend and browser workflow tests exercised persistent creation/edit/stage changes and CSV safety | Team membership and large-board paging deferred |
| 3: Qualification | Deterministic factors, categories, missing details, recalculation, optional typed extraction | `scoring.py`, `ai.py`, `schemas.py`, lead qualification panel | Identical-input and explanation tests passed; schema and simulated provider-failure tests passed | No paid provider request; extracted facts require human confirmation |
| 4: Communication and follow-ups | Seven draft purposes/four tones, save/edit/approve/copy, manual communication, task scheduling/reassignment/completion | `components/workflows.tsx`, `ai.py`, task/draft API routes | Full lead-to-draft-to-follow-up browser test passed; task offsets normalized to UTC | Semantic rewriting requires live mode; sending/device push deferred |
| 5: Analytics and automations | SQL cohort metrics/charts, source conversion, elapsed times, threshold settings, unique internal task automation | `analytics.py`, `services.py`, `components/dashboard.tsx`, workflow preferences | Aggregates compared with stored records; zero-denominator, filter, and idempotency tests passed | Proposal progression uses current stage; historical as-of reporting deferred |
| 6: Public demonstration | Landing, own visitor workspace, reset, test capture, synthetic disclosure, actual screenshots | `components/public.tsx`, demo/capture routes, `docs/screenshots` | Two-workspace isolation tests; capture duplicate/error workflow; responsive screenshots | Cross-site production embed and live hosting deferred |
| 7: Security and quality | Password/session/CSRF/origin checks, scoped access, rate/body limits, migration test, responsive navigation, accessibility review | `security.py`, `tests`, Playwright config, UI/CSS | Final results and measured timings are recorded in `testing.md` and `benchmark.json` | Production operational controls and account recovery remain documented |
| 8: Deployment and portfolio preparation | GitHub source publication, Docker/Compose, CI workflow, Windows scripts, README, architecture/security/API docs, case study, LinkedIn draft, walkthrough, customization scopes | `Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml`, `docs`, `README.md` | Production build executed locally; documentation links and screenshot files checked; remote checks recorded in GitHub Actions | Hosted deployment and verification remain pending |

The next deployment step is to review PostgreSQL CI results, configure HTTPS and operational controls, then host the application at an owner-authorized destination. A deployment is complete only after the hosted workflow is verified.
