# API guide

Local schema explorer: `http://127.0.0.1:8000/api/docs` (disabled in production).

All private endpoints require the `lp_session` HttpOnly cookie. Mutations additionally require `X-CSRF-Token` from `/api/session`. Login, registration, and starting a demo are origin-checked and rate-limited. A viewer role is read-only except logout. All resource lookups include the session workspace; mismatched identifiers return 404.

| Method / route | Behavior |
| --- | --- |
| GET `/api/health` | Database connectivity |
| POST `/api/demo` | New isolated 160-lead demo and cookie |
| GET `/api/session` | Workspace, user, CSRF, active AI mode |
| POST `/api/auth/register`, `/login`, `/logout` | Private account/session lifecycle |
| GET/POST `/api/leads` | Filtered paginated listing / create |
| GET/PUT `/api/leads/{id}` | Detail including related records / validated edit |
| PATCH `/api/leads/{id}/stage` | Stage transition; Won requires `final_value` |
| POST `/api/leads/{id}/archive?archived=true` | Archive; false restores |
| POST `/api/leads/{id}/qualify` | Recalculate rules and optional internal task |
| POST `/api/leads/{id}/extract` | Structured facts with explicit output mode |
| POST `/api/leads/{id}/notes`, `/contact` | Internal note / manually recorded communication |
| GET `/api/leads/export` | Workspace-scoped CSV, filter-aware, formula-safe |
| GET/POST `/api/tasks` | List / schedule task with explicit timezone offset |
| PATCH `/api/tasks/{id}` | Complete, reopen, reschedule, reassign, update notes |
| POST `/api/drafts` | Generate and persist rules/live draft |
| PATCH `/api/drafts/{id}` | Save or approve; never send |
| GET `/api/analytics` | SQL-derived metrics, stages, sources, trend, tasks, activity |
| PATCH `/api/workspace` | Admin/demo preferences |
| POST `/api/demo/reset` | Reset only the current isolated demo |
| POST `/api/capture` | Validated demo inquiry with consent, honeypot, UTM fields |

Lead query parameters: `q`, `status`, `source`, `archived`, `active`, `sort`, `page`, `size` (≤200). `active=true` excludes Won and Lost records for priority review. Export includes up to 10,000 matching records. Detail relations are capped at 200 each. Tasks support `state`, exact `assigned_to`, `page`, `size`. Analytics supports `days` or explicit inclusive `start` and `end` YYYY-MM-DD; maximum 365 days, with optional `source`.

## Analytics definitions

The cohort is all non-archived leads created within the selected UTC acquisition dates and selected source. All panels, follow-ups, and activity use this cohort.

- Total: count of eligible leads.
- New/Qualified/Won: current stage counts.
- Active opportunities: current Qualified, Proposal Sent, or Negotiation leads.
- Conversion: currently Won / all eligible cohort leads. Zero denominator returns null, rendered as an em dash.
- Pipeline: recorded estimated budgets of leads excluding Won and Lost; unknown budget contributes zero.
- Won value: recorded final value, not estimated budget.
- Trends: equivalent immediately preceding acquisition cohort using **current** status. This is not a historical as-of snapshot; no ratio is shown when previous value is zero.
- Follow-up completion: completed / all tasks belonging to the cohort. Overdue is evaluated at request time.
- Qualification/close averages: elapsed days from creation to the retained milestone; close includes Won and Lost.
- Stage progression: contacted and qualified use retained milestone timestamps; proposal-or-later uses current stage. The UI explicitly distinguishes this from historical proposal reach.

Errors: 401 unauthenticated/expired, 403 origin/CSRF/role, 404 inaccessible resource, 409 duplicate/conflict, 413 body >32 KiB, 422 validation, 429 local rate limit, 502 unavailable/invalid AI provider response.
