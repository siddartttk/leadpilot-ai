# LeadPilot AI: organizing the work behind an opportunity

Small service businesses often manage inquiries across spreadsheets and inboxes. This project explores a practical alternative: a single workspace for contact context, qualification, message drafts, pipeline stages, and follow-up tasks.

The intended audience is digital agencies, freelancers, consultants, and small B2B service teams. The demonstration uses fictional Northstar Studio and 160 synthetic inquiries across six digital services. No client data or measured commercial outcomes are presented.

## The working product

A visitor can open an isolated demo without credentials, capture a test inquiry, inspect its score, generate and edit a response, approve the draft, change the sales stage, and schedule or complete a follow-up. Each operation persists, creates activity where appropriate, and updates database-derived analytics. Private accounts begin with empty workspaces.

The score is a transparent 0–100 business heuristic with five factor contributions. Missing information is visible. Deterministic templates keep the demonstration useful without an API key; an optional OpenAI-compatible adapter supports typed extraction and drafting for explicitly enabled private workspaces. Draft approval is recorded, and sending remains outside this MVP.

## Engineering decisions

Next.js, React, strict TypeScript, React Hook Form, Zod, Recharts, and TanStack Query power the interface. FastAPI, Pydantic, SQLAlchemy, Alembic, and PostgreSQL configuration provide the backend foundation. Persistent SQLite makes local setup possible without a database service.

Security is enforced on the API: opaque expiring sessions, Argon2 password hashes, HttpOnly cookies, CSRF/origin checks, scoped record lookups, validation, bounded requests, and formula-safe export. Public demos receive independent workspaces. Automatic high-priority tasks have a unique per-lead key to avoid duplication.

Analytics uses SQL aggregation over a consistent acquisition cohort. Conversion is currently won divided by eligible leads; unknown budgets contribute zero to estimates, and zero-denominator percentages render as unavailable. Definitions are visible in the product.

## Validation and trade-offs

Backend integration tests exercise workflow persistence, scoring consistency, task automation, analytics, permissions, invalid inputs, capture, export, AI failures, and migrations. Browser tests exercise real user workflows and responsive layouts. See the accompanying test report for actual final results.

PostgreSQL/Docker runtime verification and real provider contract testing remain next steps. Public deployment, recovery/email verification, team administration, distributed abuse prevention, operational retention, and reviewed legal policies are also required before real customer rollout.

## Client applications

The foundation can be customized for agency discovery forms, real estate inquiries, consulting intake, course inquiries, and internal service pipelines. Each engagement requires discovery of the client's data, qualification rules, consent requirements, assignments, and integrations. The project demonstrates working engineering capabilities without claiming unmeasured business gains.
