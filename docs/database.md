# Database and migrations

| Table | Purpose |
| --- | --- |
| workspaces | Tenant boundary, demo flag, currency/timezone, rule preferences |
| users | One workspace per account; Argon2 password hash and role |
| sessions | SHA-256 of opaque random cookie token, CSRF token, expiration |
| leads | Contact and inquiry, current stage, qualification snapshot, milestone dates |
| activities | Append-only route-generated event history |
| notes | Internal lead notes |
| tasks | Due dates, assignments, completion, unique automation key |
| drafts | Editable text, output mode, approval timestamp, provider token usage |

Each child record carries a workspace foreign key. Lead email is normalized and unique within a workspace, including archived records. `(lead_id, automation_key)` prevents duplicate automatic tasks. Workspace, stage, source, creation date, and due date indexes support common queries.

Apply migrations from `backend` with `python -m alembic upgrade head`. The initial revision freezes table definitions; subsequent model changes require a new reviewed revision. Never edit an applied migration to change a deployed schema.

The optional seed script creates an operator-only `Seed baseline` workspace. Public demos independently generate 160 synthetic leads using seed 42 and dates relative to the current day. The baseline cannot be reached through a public session. Reset Demo recreates records only in the authenticated demo workspace. Synthetic identity, service, budget, and source distributions are reproducible; UUIDs and timestamps naturally differ by session/date.

To inspect expired demos, run `python ../scripts/cleanup_demo.py` from `backend`. It is a dry run. After reviewing the count, `--apply` deletes only expired demo workspaces and their dependent records. Private workspaces and `Seed baseline` are excluded. Expiration alone does not remove stored records.

Back up PostgreSQL before production migrations. SQLite backup requires a consistent database snapshot; do not copy a file during writes without SQLite's backup facility. Docker's named volume persists across `docker compose down`; do not use `down -v` unless intentional data deletion is authorized.
