"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Check,
  Copy,
  FloppyDisk,
  ArrowCounterClockwise,
  Plus,
  CalendarCheck,
  PencilSimple,
  FlowArrow,
  ShieldCheck,
  ChatText,
} from "@phosphor-icons/react";
import { api, date, utc } from "@/lib/api";
import type { Lead, LeadPage, Session, Draft, Task } from "@/lib/types";
import { PageTitle } from "./app";
import { Modal, SectionHead, Empty, Loading, ErrorState, Badge } from "./ui";
import { useNotice } from "./providers";

export function DraftEditor({
  lead,
  session,
}: {
  lead: Lead;
  session: Session;
}) {
  const { run, notify } = useNotice();
  const [kind, setKind] = useState("First response");
  const [tone, setTone] = useState("Professional");
  const [draft, setDraft] = useState<Draft | null>(lead.drafts?.[0] || null);
  const [body, setBody] = useState(lead.drafts?.[0]?.body || "");
  const [busy, setBusy] = useState(false);
  const [extraction, setExtraction] = useState<string>("");
  async function generate() {
    setBusy(true);
    const result = await run(
      () =>
        api<Draft>("/drafts", "POST", {
          lead_id: lead.id,
          kind,
          tone,
          existing_text: kind === "Rewrite" ? body : "",
        }),
      "Draft generated. Review every detail before approval.",
    );
    if (result) {
      setDraft(result);
      setBody(result.body);
    }
    setBusy(false);
  }
  async function save(approved: boolean) {
    if (!draft) return;
    const result = await run(
      () => api<Draft>("/drafts/" + draft.id, "PATCH", { body, approved }),
      approved ? "Draft approved. No message was sent." : "Draft saved.",
    );
    if (result) setDraft(result);
  }
  async function extract() {
    setBusy(true);
    const result = await run(() =>
      api<{ mode: string; extraction: Record<string, unknown> }>(
        "/leads/" + lead.id + "/extract",
        "POST",
      ),
    );
    if (result) setExtraction(JSON.stringify(result.extraction, null, 2));
    setBusy(false);
  }
  return (
    <>
      <div className="assistant-grid">
        <section className="panel">
          <SectionHead
            title="Start with the facts"
            subtitle={lead.name + " · " + lead.company}
          />
          <div className="inquiry-quote">{lead.message}</div>
          <dl className="assistant-facts">
            <div>
              <dt>Requested service</dt>
              <dd>{lead.service}</dd>
            </div>
            <div>
              <dt>Missing information</dt>
              <dd>
                {lead.qualification.missing.join(", ") ||
                  "Confirm detailed scope"}
              </dd>
            </div>
          </dl>
          <button className="button small" disabled={busy} onClick={extract}>
            Extract inquiry facts
          </button>
          {extraction && <pre className="extraction">{extraction}</pre>}
          <p className="help">
            Extracted facts are suggestions. Confirm them in Edit lead before
            recalculating the transparent score.
          </p>
          <div className="assistant-safety">
            <ShieldCheck size={22} />
            <p>
              {session.ai_mode.startsWith("Live")
                ? "Live AI sends the inquiry, service, and budget to the configured external provider."
                : "Rules-based mode uses local templates. No information is sent to an AI provider."}
            </p>
          </div>
        </section>
        <section className="panel draft-panel">
          <SectionHead
            title="Make the next conversation count"
            subtitle="Draft, refine, review. You stay in control."
          />
          <div className="form-grid">
            <label>
              Message purpose
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                {[
                  "First response",
                  "Follow-up",
                  "Missing information",
                  "Summary",
                  "Rewrite",
                  "Meeting invitation",
                  "Proposal introduction",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Tone
              <select value={tone} onChange={(e) => setTone(e.target.value)}>
                {["Professional", "Friendly", "Concise", "Consultative"].map(
                  (v) => (
                    <option key={v}>{v}</option>
                  ),
                )}
              </select>
            </label>
          </div>
          <button
            className="button primary generate-button"
            disabled={busy}
            onClick={generate}
          >
            <ChatText size={18} />
            {busy ? "Working…" : draft ? "Regenerate draft" : "Generate draft"}
          </button>
          <div className="draft-label">
            <span>
              {draft
                ? draft.mode === "live"
                  ? "Live AI draft"
                  : "Rules-based example draft"
                : "Your draft will appear here"}
            </span>
            {draft && (
              <Badge
                value={
                  draft.approved && draft.body === body
                    ? "Approved"
                    : "Needs review"
                }
              />
            )}
          </div>
          <textarea
            aria-label="Draft message"
            className="draft-text"
            rows={13}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              kind === "Rewrite"
                ? "Paste your existing message, then generate a revised draft."
                : "Generate a draft, then edit it in your own voice."
            }
          />
          <div className="draft-actions">
            <button
              className="button small"
              disabled={!body}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(body);
                  notify("Draft copied.");
                } catch {
                  notify(
                    "Copy unavailable. Select and copy the draft text manually.",
                    true,
                  );
                }
              }}
            >
              <Copy size={15} />
              Copy
            </button>
            <button
              className="button small"
              disabled={!draft || !body}
              onClick={() => save(false)}
            >
              <FloppyDisk size={15} />
              Save draft
            </button>
            <button
              className="button primary small"
              disabled={!draft || !body}
              onClick={() => save(true)}
            >
              <Check size={15} />
              Approve draft
            </button>
          </div>
          <p className="help">
            Approval records your review. LeadPilot does not send emails or
            messages.
          </p>
          {kind === "Rewrite" && !session.ai_mode.startsWith("Live") && (
            <p className="help">
              Demo rewriting preserves your text and applies the selected
              greeting and closing. Semantic rewriting requires Live AI.
            </p>
          )}
        </section>
      </div>
      {lead.drafts && lead.drafts.length > 0 && (
        <section className="panel">
          <SectionHead title="Saved drafts" />
          {lead.drafts.map((d) => (
            <button
              className="draft-history"
              key={d.id}
              onClick={() => {
                setDraft(d);
                setBody(d.body);
                setKind(d.kind);
                setTone(d.tone);
              }}
            >
              <span>
                {d.kind} · {d.tone}
              </span>
              <Badge value={d.approved ? "Approved" : "Needs review"} />
            </button>
          ))}
        </section>
      )}
    </>
  );
}
export function Assistant({ session }: { session: Session }) {
  const params = useSearchParams();
  const [selected, setSelected] = useState(params.get("lead") || "");
  const leads = useQuery({
    queryKey: ["assistant-leads"],
    queryFn: () => api<LeadPage>("/leads?size=200&sort=score"),
  });
  const id = selected || leads.data?.items[0]?.id;
  const lead = useQuery({
    queryKey: ["lead", id],
    queryFn: () => api<Lead>("/leads/" + id),
    enabled: !!id,
  });
  return (
    <>
      <PageTitle
        eyebrow="THOUGHTFUL COMMUNICATION"
        title="A useful first draft. A human final word."
        description="Turn known project details into a message you can make your own."
      />
      <div className="assistant-select">
        <label>
          Choose a lead
          <select
            value={id || ""}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="" disabled>
              Select a lead
            </option>
            {leads.data?.items.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} · {l.company}
              </option>
            ))}
          </select>
        </label>
        <span className="mode-pill">
          <i />
          {session.ai_mode}
        </span>
      </div>
      {leads.isPending || (lead.isPending && id) ? (
        <Loading />
      ) : leads.error ? (
        <ErrorState error={leads.error} />
      ) : lead.error ? (
        <ErrorState error={lead.error} />
      ) : lead.data ? (
        <DraftEditor key={lead.data.id} lead={lead.data} session={session} />
      ) : (
        <Empty title="Add a lead to start drafting" />
      )}
    </>
  );
}
export function TaskForm({
  leadId,
  onDone,
}: {
  leadId?: string;
  onDone: () => void;
}) {
  const { run } = useNotice();
  const [lead, setLead] = useState(leadId || "");
  const [title, setTitle] = useState("Discuss project scope");
  const [due, setDue] = useState("");
  const [owner, setOwner] = useState("Unassigned");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const leads = useQuery({
    queryKey: ["task-leads"],
    queryFn: () => api<LeadPage>("/leads?size=200"),
    enabled: !leadId,
  });
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const result = await run(
          () =>
            api("/tasks", "POST", {
              lead_id: lead,
              title,
              due_at: due + ":00+05:30",
              assigned_to: owner,
              notes,
            }),
          "Follow-up scheduled.",
        );
        setBusy(false);
        if (result) onDone();
      }}
    >
      {!leadId && (
        <label>
          Lead
          <select
            required
            value={lead}
            onChange={(e) => setLead(e.target.value)}
          >
            <option value="">Choose a lead</option>
            {leads.data?.items.map((l) => (
              <option value={l.id} key={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Task title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          minLength={2}
          maxLength={200}
          required
        />
      </label>
      <div className="form-grid">
        <label>
          Due date & time (Asia/Kolkata)
          <input
            type="datetime-local"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            required
          />
        </label>
        <label>
          Assigned to
          <input
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            required
            maxLength={100}
          />
        </label>
      </div>
      <label>
        Notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={2000}
        />
      </label>
      <div className="form-footer">
        <p>Reminder appears in the app.</p>
        <button className="button primary" disabled={busy}>
          Schedule follow-up
        </button>
      </div>
    </form>
  );
}
export function TaskList({ tasks }: { tasks: Task[] }) {
  const { run } = useNotice();
  const [editing, setEditing] = useState<Task | null>(null);
  const [due, setDue] = useState("");
  const [owner, setOwner] = useState("");
  const [notes, setNotes] = useState("");
  if (!tasks.length)
    return (
      <Empty
        title="No follow-ups here"
        text="Schedule a task to keep the conversation moving."
      />
    );
  return (
    <>
      {tasks.map((task) => (
        <div
          className={"followup-row " + (task.completed ? "completed" : "")}
          key={task.id}
        >
          <button
            className={"task-check " + (task.completed ? "checked" : "")}
            aria-label={(task.completed ? "Reopen " : "Complete ") + task.title}
            onClick={() =>
              run(
                () =>
                  api("/tasks/" + task.id, "PATCH", {
                    completed: !task.completed,
                  }),
                task.completed ? "Task reopened." : "Follow-up complete.",
              )
            }
          >
            <Check size={15} />
          </button>
          <div className="followup-text">
            <strong>{task.title}</strong>
            <span>
              {task.lead_name && (
                <Link href={"/leads/" + task.lead_id}>{task.lead_name} · </Link>
              )}
              {task.assigned_to}
            </span>
            {task.notes && <small>{task.notes}</small>}
          </div>
          <div className="followup-state">
            <Badge
              value={
                task.completed
                  ? "Completed"
                  : utc(task.due_at) < new Date()
                    ? "Overdue"
                    : "Upcoming"
              }
            />
            <small>{date(task.due_at, true)}</small>
          </div>
          <button
            aria-label={"Edit task " + task.title}
            className="icon-button"
            onClick={() => {
              setEditing(task);
              setDue(
                new Date(utc(task.due_at).getTime() + 330 * 60000)
                  .toISOString()
                  .slice(0, 16),
              );
              setOwner(task.assigned_to);
              setNotes(task.notes);
            }}
          >
            <PencilSimple size={17} />
          </button>
        </div>
      ))}
      {editing && (
        <Modal title="Edit follow-up" onClose={() => setEditing(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const done = await run(
                () =>
                  api("/tasks/" + editing.id, "PATCH", {
                    due_at: due + ":00+05:30",
                    assigned_to: owner,
                    notes,
                  }),
                "Follow-up updated.",
              );
              if (done) setEditing(null);
            }}
          >
            <label>
              Due date (Asia/Kolkata)
              <input
                type="datetime-local"
                required
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </label>
            <label>
              Assigned to
              <input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                required
                maxLength={100}
              />
            </label>
            <label>
              Notes
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={2000}
              />
            </label>
            <button className="button primary">Save changes</button>
          </form>
        </Modal>
      )}
    </>
  );
}
export function Followups({ session }: { session: Session }) {
  const [state, setState] = useState("open");
  const [assigned, setAssigned] = useState("");
  const [modal, setModal] = useState(false);
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["tasks", state, assigned, page],
    queryFn: () =>
      api<{ items: Task[]; total: number }>(
        "/tasks?state=" +
          state +
          "&assigned_to=" +
          encodeURIComponent(assigned) +
          "&page=" +
          page,
      ),
  });
  return (
    <>
      <PageTitle
        eyebrow="THE SMALL ACTIONS THAT MATTER"
        title="Never lose the next step."
        description={
          "Your follow-up schedule, in " + session.workspace.timezone + "."
        }
      >
        <button className="button primary" onClick={() => setModal(true)}>
          <Plus size={17} />
          Schedule follow-up
        </button>
      </PageTitle>
      <section className="panel">
        <div className="table-toolbar">
          <div className="tabs">
            {["open", "today", "overdue", "upcoming", "completed"].map((s) => (
              <button
                key={s}
                className={state === s ? "selected" : ""}
                onClick={() => {
                  setState(s);
                  setPage(1);
                }}
              >
                {s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <label>
            <span className="sr-only">Filter by assigned user</span>
            <input
              aria-label="Filter by assigned user"
              placeholder="Assigned to (exact name)"
              value={assigned}
              onChange={(e) => {
                setAssigned(e.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>
        {query.isPending ? (
          <Loading />
        ) : query.error ? (
          <ErrorState error={query.error} />
        ) : (
          <>
            <TaskList tasks={query.data.items} />
            <div className="pagination">
              <span>{query.data.total} follow-ups</span>
              <div>
                <button
                  className="button small"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <span>Page {page}</span>
                <button
                  className="button small"
                  disabled={page * 50 >= query.data.total}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
      <p className="help">
        <CalendarCheck size={15} />
        In-app reminders only. Device notifications and external messages are
        not enabled.
      </p>
      {modal && (
        <Modal title="Schedule a follow-up" onClose={() => setModal(false)}>
          <TaskForm onDone={() => setModal(false)} />
        </Modal>
      )}
    </>
  );
}
export function Preferences({
  session,
  automations = false,
}: {
  session: Session;
  automations?: boolean;
}) {
  const { run } = useNotice();
  const [name, setName] = useState(session.workspace.name);
  const [threshold, setThreshold] = useState(session.workspace.high_threshold);
  const [auto, setAuto] = useState(session.workspace.auto_task);
  const [saving, setSaving] = useState(false);
  return (
    <>
      <PageTitle
        eyebrow={
          automations ? "CONSISTENT BY DESIGN" : "MAKE IT YOUR WORKSPACE"
        }
        title={
          automations
            ? "Good habits, built into the workflow."
            : "Workspace settings"
        }
        description={
          automations
            ? "Observable rules that keep opportunities organized. No autonomous outreach."
            : "Configure the essentials behind your lead workflow."
        }
      />
      <div className="settings-layout">
        <section className="panel">
          <SectionHead
            title={
              automations ? "Qualification workflow" : "Workspace preferences"
            }
            subtitle="Changes apply to future creation or explicit recalculation."
          />
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              await run(
                () =>
                  api("/workspace", "PATCH", {
                    name,
                    high_threshold: threshold,
                    auto_task: auto,
                  }),
                "Workspace preferences saved.",
              );
              setSaving(false);
            }}
          >
            <label>
              Workspace name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={120}
                required
              />
            </label>
            <div className="form-grid">
              <label>
                Currency
                <input value={session.workspace.currency} readOnly />
              </label>
              <label>
                Timezone
                <input value={session.workspace.timezone} readOnly />
              </label>
            </div>
            <p className="help">
              This MVP uses INR and Asia/Kolkata. Currency conversion and other
              workspace timezones are deferred.
            </p>
            <label>
              High-priority threshold (50–100)
              <input
                type="number"
                min={50}
                max={100}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                required
              />
            </label>
            <label className="checkbox-label setting-toggle">
              <input
                type="checkbox"
                checked={auto}
                onChange={(e) => setAuto(e.target.checked)}
              />
              <span>
                <strong>Create a high-priority review task</strong>
                <small>
                  At most one automatic review task per lead, due in 24 hours.
                </small>
              </span>
            </label>
            <button className="button primary" disabled={saving}>
              <FloppyDisk size={16} />
              Save preferences
            </button>
          </form>
        </section>
        <section className="panel">
          <SectionHead title="AI & data controls" />
          <div className="control-note">
            <ShieldCheck size={22} />
            <div>
              <h3>{session.ai_mode}</h3>
              <p>
                {session.workspace.is_demo
                  ? "Public demo sessions always use deterministic local rules and templates."
                  : "Live AI requires explicit server-side opt-in, a configured key, and a model."}
              </p>
            </div>
          </div>
          <div className="control-note">
            <ChatText size={22} />
            <div>
              <h3>Human-reviewed communication</h3>
              <p>
                Drafts can be edited, saved, approved, and copied. There is no
                sending integration.
              </p>
            </div>
          </div>
          <div className="control-note">
            <ArrowCounterClockwise size={22} />
            <div>
              <h3>Isolated demo data</h3>
              <p>
                Each demo is independent and expires after eight hours. Use
                Reset demo to restore its synthetic baseline.
              </p>
            </div>
          </div>
        </section>
      </div>
      {automations && (
        <section className="panel">
          <SectionHead
            title="Active workflow rules"
            subtitle="Every action stays inside your workspace"
          />
          {[
            {
              name: "New inquiry",
              trigger: "When a lead is created",
              action:
                "Validate → detect duplicate email → score → record activity.",
            },
            {
              name: "High-priority inquiry",
              trigger: "On creation or recalculation",
              action: auto
                ? "Create one internal review task when the score meets " +
                  threshold +
                  "."
                : "Automatic review task creation is disabled.",
            },
            {
              name: "Overdue follow-up",
              trigger: "When the due time passes",
              action:
                "Surface as overdue in the dashboard and task list. No background message is sent.",
            },
            {
              name: "Deal won",
              trigger: "When a user selects Won",
              action:
                "Require final value → record close date → update analytics → add activity.",
            },
          ].map((rule) => (
            <div className="workflow-rule" key={rule.name}>
              <span className="workflow-icon">
                <FlowArrow size={22} />
              </span>
              <div>
                <h3>{rule.name}</h3>
                <small>{rule.trigger}</small>
                <p>{rule.action}</p>
              </div>
              <Badge value="Internal" />
            </div>
          ))}
        </section>
      )}
    </>
  );
}
