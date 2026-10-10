# Known limitations and deferred work

## Verified local scope

The app runs as a local Next.js/FastAPI product with persistent SQLite data, isolated demos, private accounts, full lead workflows, deterministic scoring/drafting, tasks, and database-derived analytics. Test details are in `testing.md`.

## Infrastructure

- PostgreSQL schema support, driver, Compose, and CI configuration are prepared; local PostgreSQL execution is not verified because Docker's engine was unavailable.
- Source is published on [GitHub](https://github.com/siddartttk/leadpilot-ai), with [automated validation](https://github.com/siddartttk/leadpilot-ai/actions/workflows/ci.yml). No hosted application, domain, TLS ingress, or production backups have been created.
- Live provider requests are disabled by default and have not been made. Timeout and invalid-output paths are tested with simulated responses.
- Rate limiting is process-local and needs trusted ingress controls for distributed/public use.
- Windows builds use standard Next.js output to avoid symlink privilege requirements; Linux/Docker builds use standalone output.

## Product boundaries

- Private account recovery, email verification, invitations, team membership administration, and multiple workspaces per account are deferred. Assignments are workspace-local text labels.
- The capture form writes into an isolated demo session. A production cross-site embed, dedicated workspace capture token, CAPTCHA, and verified consent policy are future work. SAMEORIGIN framing remains enabled.
- No email sending, OAuth, push notifications, imported inboxes, or autonomous external actions are implemented.
- Currency is whole INR; display timezone is Asia/Kolkata. Multi-currency conversion and workspace timezone editing are deferred.
- Pipeline and lead pickers cap at 200 records, details at 200 related records, export at 10,000. Lead/task tables are paginated.
- Rules use keyword detection and can misinterpret negation or exploratory language. Factor weights are code-configured; threshold/internal-task creation are editable.
- Local rewriting preserves the original text and applies greeting/closing/tone templates. Semantic rewriting needs Live AI.
- Live extraction is advisory. Users confirm facts in Edit Lead before rules recalculate; no automated provider facts overwrite original inquiries.
- Stage progression records contact/qualification milestones but uses current stage for proposal-or-later; retrospective proposal reach and point-in-time reporting need additional milestone records.
- Analytics compares acquisition cohorts using current stages. Trends are not historical as-of snapshots, causal attribution, or measured customer business improvements.
- Automation runs on explicit lead operations or time-derived task views; there is no background scheduler or device notification service.
- Demo sessions expire but require the documented operator cleanup to remove stored data. Private deletion requests currently require operator assistance; archive only hides records.
- Privacy/terms content is a draft and needs operator identity, jurisdiction, contact details, and legal review before customer rollout.

## Honest portfolio use

Show the actual application and label all synthetic data. Do not imply customer adoption, measured conversion lift, revenue results, compliance certification, live email delivery, hosted availability, or a tested paid-model integration.
