# Security controls and limits

Implemented: opaque random database-backed sessions; stored session token hashes; Argon2 password hashing; generic login errors; HttpOnly SameSite=Lax cookies; CSRF tokens and origin checks for mutations; explicit tenant predicates on record access; admin-only private workspace settings; read-only viewer enforcement; schema validation; SQLAlchemy parameterization; body size limits; strict CORS; bounded lists; CSV formula escaping; structured logs that omit messages, credentials, and contact data.

Private session lifetime is 24 hours; demo lifetime is 8 hours. Logout revokes the current database session. Production startup requires Secure cookies. Serve frontend and API behind the same HTTPS origin; the frontend proxy avoids exposing API credentials to the browser.

Rate limits are in memory, keyed by the immediate client address or workspace. They are appropriate for a single-process demo, **not** a distributed abuse prevention service. Behind the Next.js proxy, API requests may share one client bucket; configure trusted ingress limits before external access. No arbitrary forwarded header is trusted. Public signup and demo creation have additional limits.

AI provider configuration is server-only. Demo sessions always use local rules even if a key is present. Live AI needs `AI_MODE=live`, `ALLOW_LIVE_AI=true`, and a key. A 20-second timeout, bounded tokens, typed output validation, and explicit failure messages protect the workflow. Inquiry text cannot call tools, read secrets, or change permissions. Provider output is untrusted and requires human review. Minimize personal information in free-text fields; emails and phone numbers are omitted from provider payloads.

## Required before real customer rollout

- Review authentication, threat model, policies, provider terms, and retention with qualified owners.
- Add verified account recovery, email verification, membership/invitation management, and operational administration.
- Configure TLS, ingress body limits/rate limits, backups, restore drills, monitoring, retention cleanup, secret rotation, and controlled migration jobs.
- Review dependencies regularly and run CI on PostgreSQL. Local SQLite checks do not replace PostgreSQL deployment checks.
- Add a deployment-specific Content Security Policy and frame policy. The current application uses SAMEORIGIN framing; arbitrary cross-site embedding is not enabled.
- Add encrypted backups and an operator process for verified data deletion/export requests.

No compliance certification is claimed. Legal pages are explicitly drafts. There is no email sending, device push, OAuth integration, or autonomous agent.
