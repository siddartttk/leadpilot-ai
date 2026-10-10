# Validation report

Final validation was performed locally on Windows with Python 3.12, Node.js 24, Next.js production output, FastAPI, installed Chrome, and persistent SQLite. The demonstration contains 160 synthetic leads per isolated workspace. Results are specific to this environment.

## Executed checks

| Check | Result / scope |
| --- | --- |
| Initial database migration and seed | Applied successfully; 160-lead synthetic baseline created |
| Backend integration and migration suite | 13 tests passed after the final functional backend changes |
| Strict TypeScript and lint | Passed; also enforced by the final production build |
| Production Next.js build | Passed on Windows using standard output; Linux config prepares standalone output |
| Backend dependency audit | No known vulnerabilities found in the audited requirements after upgrades |
| Frontend production dependency audit | No known vulnerabilities found after the PostCSS override |
| Local health checks | API/database and frontend returned HTTP 200 |
| Production browser suite | 6 tests passed in 21.2 seconds after the midnight workspace refresh |
| Automated accessibility | No serious/critical findings on the four audited pages under the tested axe rules |

The backend suite verifies creation/edit/archive/restore, search/source filtering, case-normalized duplicate detection, invalid/extra inputs, score explanations and consistency, task idempotency, stage histories and closing values, notes/manual communication, task offsets and the Today filter, completion/reassignment, draft editing/approval, analytics against stored records, workspace/resource isolation, authentication/expiration/logout, viewer enforcement, CSRF/origin checks, capture consent/honeypot/UTM handling, CSV formula safety, typed AI output/failure handling, body/rate limits, and a fresh frozen migration with no detected schema drift.

The final backend run emitted one test-client deprecation warning about the framework's future `httpx2` preference. Tests passed. The application provider adapter uses the configured `httpx` dependency; no live provider was contacted.

## Browser test scope

Playwright runs against the production frontend and the local API. It covers:

1. Delayed dashboard loading, a simulated API error, and successful retry.
2. Lead creation/edit, score display, draft generation/edit/save/approval, qualification stage, follow-up scheduling/completion, reload persistence, updated dashboard count, search, archive/restore.
3. Test inquiry capture, duplicate error, keyboard pipeline movement, and a filtered empty state.
4. Private registration, empty dashboard, logout, and login.
5. Route navigation, desktop (1440 px), tablet (768 px), mobile (390 px), mobile drawer, hidden-navigation focus protection, dashboard/lead workspace overflow checks, six summary cards, priority entries, and actual screenshots.
6. Automated axe checks for serious/critical WCAG A/AA findings on landing, dashboard, lead list, and login.

All six browser tests passed in the final run. Automated accessibility checks cover these four pages at the tested desktop viewport; they do not establish complete WCAG conformance. Native dialogs and stage selectors provide keyboard alternatives, and reduced-motion preference is respected.

## Measured local performance

The executed `scripts/benchmark_local.py` made 30 sequential measured requests per endpoint after one warm-up request, against a loopback API with one process and 160 synthetic SQLite leads.

| Endpoint | Median | p95 |
| --- | ---: | ---: |
| Lead search (`q=Maya`, page size 20) | 34.33 ms | 53.26 ms |
| 180-day dashboard analytics | 53.92 ms | 68.82 ms |

These include HTTP and serialization on this machine. They are not production, concurrency, large-database, or network benchmarks. Raw context/results are in `benchmark.json`. The final frontend build reported a 331 kB first-load JavaScript estimate for the shared application route; this is build output, not a measured browser load-time result.

## Repeat locally

From `backend`: `..\.venv\Scripts\python.exe -m pytest -q`.

From `frontend`: `pnpm typecheck`, `pnpm lint`, and `pnpm build`. Keep the API running, start the production frontend with `pnpm start` in a separate terminal, then run `pnpm test`. Local browser tests use Chrome; CI installs Playwright Chromium. Test traces and HTML reports are ignored by Git.

## Verification limits

- PostgreSQL/Docker runtime was not executed locally. [GitHub Actions](https://github.com/siddartttk/leadpilot-ai/actions/workflows/ci.yml) runs PostgreSQL browser workflows and records remote results separately from these Windows/SQLite checks.
- Live AI was not called; schema failures and timeouts were simulated. Public demos always use rules mode.
- No hosted service, external messaging, device notifications, account recovery, or operational production readiness is claimed.
- Visual review inspected actual desktop/mobile/landing screenshots. Mobile screenshot tests check dashboard and lead-workspace overflow and navigation; every possible browser/device combination has not been tested.
