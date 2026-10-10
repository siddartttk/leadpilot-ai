"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  MagnifyingGlass,
  Plus,
  DownloadSimple,
  ArrowLeft,
  PencilSimple,
  Archive,
  ArrowCounterClockwise,
  EnvelopeSimple,
  Buildings,
  Globe,
  Phone,
  CalendarBlank,
  ArrowRight,
} from "@phosphor-icons/react";
import { api, money, date, initials } from "@/lib/api";
import {
  Lead,
  LeadPage,
  Session,
  stages,
  sources,
  services,
  type Analytics,
} from "@/lib/types";
import { PageTitle, AddLeadLink } from "./app";
import {
  Loading,
  ErrorState,
  Empty,
  Badge,
  Score,
  Modal,
  SectionHead,
} from "./ui";
import { useNotice } from "./providers";
import { DraftEditor, TaskForm, TaskList } from "./workflows";
import { LeadSummary, LeadIntelligence, LeadActivity } from "./lead-insights";

export const leadSchema = z.object({
  name: z.string().min(2, "Enter at least 2 characters").max(100),
  email: z.email("Enter a valid email address"),
  company: z.string().max(120),
  phone: z.string().max(40),
  website: z
    .string()
    .regex(/^(https?:\/\/[^\s]+)?$/, "Use a full http:// or https:// address"),
  service: z.string().min(1),
  message: z
    .string()
    .min(10, "Tell us a little more (at least 10 characters)")
    .max(5000),
  source: z.string(),
  budget: z
    .string()
    .regex(/^\d*$/, "Enter a whole number")
    .refine((v) => !v || Number(v) <= 1000000000, "Budget is too large"),
  assigned_to: z.string().min(1).max(100),
  tags: z.string().max(400),
});
type FormFields = z.infer<typeof leadSchema>;
export function LeadForm({
  lead,
  onDone,
  capture = false,
}: {
  lead?: Lead;
  onDone: (lead: Lead) => void;
  capture?: boolean;
}) {
  const { run } = useNotice();
  const [consent, setConsent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormFields>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: lead?.name || "",
      email: lead?.email || "",
      company: lead?.company || "",
      phone: lead?.phone || "",
      website: lead?.website || "",
      service: lead?.service || services[0],
      message: lead?.message || "",
      source: lead?.source || "Website",
      budget: lead?.budget?.toString() || "",
      assigned_to: lead?.assigned_to || "Unassigned",
      tags: lead?.tags.join(", ") || "",
    },
  });
  const params = useSearchParams();
  async function submit(values: FormFields) {
    const body = {
      ...values,
      budget: values.budget ? Number(values.budget) : null,
      tags: values.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      ...(capture
        ? {
            consent,
            honeypot:
              (document.getElementById("company_fax") as HTMLInputElement)
                ?.value || "",
            utm_source: params.get("utm_source") || "",
            utm_campaign: params.get("utm_campaign") || "",
          }
        : {}),
    };
    const result = await run(
      () =>
        api<Lead>(
          capture ? "/capture" : lead ? "/leads/" + lead.id : "/leads",
          lead ? "PUT" : "POST",
          body,
        ),
      capture
        ? "Your test inquiry has been saved."
        : lead
          ? "Lead updated."
          : "Lead created.",
    );
    if (result) onDone(result);
  }
  return (
    <form className="lead-form" onSubmit={handleSubmit(submit)}>
      <div className="form-grid">
        <label>
          Full name *
          <input
            {...register("name")}
            autoComplete="name"
            placeholder="e.g. Maya Rao"
          />
          {errors.name && (
            <span className="field-error">{errors.name.message}</span>
          )}
        </label>
        <label>
          Email address *
          <input
            {...register("email")}
            type="email"
            placeholder={
              capture ? "Use a fictional email@example.com" : "maya@example.com"
            }
          />
          {errors.email && (
            <span className="field-error">{errors.email.message}</span>
          )}
        </label>
        <label>
          Company
          <input {...register("company")} placeholder="Company name" />
        </label>
        <label>
          Service interested in
          <select {...register("service")}>
            {services.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Estimated budget (INR)
          <input
            {...register("budget")}
            inputMode="numeric"
            placeholder="Leave blank if unknown"
          />
          {errors.budget && (
            <span className="field-error">{errors.budget.message}</span>
          )}
        </label>
        {!capture && (
          <label>
            Lead source
            <select {...register("source")}>
              {sources.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        )}
        {!capture && (
          <>
            <label>
              Phone
              <input {...register("phone")} placeholder="Optional" />
            </label>
            <label>
              Company website
              <input
                {...register("website")}
                placeholder="https://example.com"
              />
              {errors.website && (
                <span className="field-error">{errors.website.message}</span>
              )}
            </label>
            <label>
              Assigned to
              <input {...register("assigned_to")} list="assignees" />
              <datalist id="assignees">
                <option>Aditi Sharma</option>
                <option>Rohan Mehta</option>
                <option>Unassigned</option>
              </datalist>
            </label>
            <label>
              Tags
              <input
                {...register("tags")}
                placeholder="Separate tags with commas"
              />
            </label>
          </>
        )}
      </div>
      <label>
        Project inquiry *
        <textarea
          {...register("message")}
          rows={5}
          placeholder="What would you like to build? Include scope and timeline if known."
        />
        {errors.message && (
          <span className="field-error">{errors.message.message}</span>
        )}
      </label>
      {capture && (
        <>
          <label className="honeypot" aria-hidden="true">
            Leave blank
            <input id="company_fax" tabIndex={-1} autoComplete="off" />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={consent}
              required
              onChange={(e) => setConsent(e.target.checked)}
            />
            I understand this is a demo. I will only submit fictional
            information. Campaign parameters in the URL are stored with my test
            inquiry.
          </label>
        </>
      )}
      <div className="form-footer">
        <p>
          {capture
            ? "No external messages will be sent."
            : "Scoring is calculated from the information you provide."}
        </p>
        <button className="button primary" disabled={isSubmitting}>
          {isSubmitting
            ? "Saving…"
            : capture
              ? "Submit test inquiry"
              : lead
                ? "Save changes"
                : "Create lead"}
          <ArrowRight size={16} />
        </button>
      </div>
    </form>
  );
}
export function Leads({ session }: { session: Session }) {
  const pageSize = 8;
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(params.get("q") || "");
  const [debounced, setDebounced] = useState(q);
  const [status, setStatus] = useState(params.get("status") || "");
  const [source, setSource] = useState("");
  const [sort, setSort] = useState("created_at");
  const [archived, setArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [newLead, setNewLead] = useState(params.get("new") === "1");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(q);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);
  useEffect(() => {
    setQ(params.get("q") || "");
    setStatus(params.get("status") || "");
    setNewLead(params.get("new") === "1");
  }, [params]);
  const filters = new URLSearchParams({
    q: debounced,
    status,
    source,
    sort,
    archived: String(archived),
    page: String(page),
    size: String(pageSize),
  });
  const query = useQuery({
    queryKey: ["leads", filters.toString()],
    queryFn: () => api<LeadPage>("/leads?" + filters),
  });
  const overview = useQuery({
    queryKey: ["leads-overview"],
    queryFn: () => api<Analytics>("/analytics?days=365"),
  });
  return (
    <>
      <PageTitle
        eyebrow="LEAD INTELLIGENCE"
        title="Leads"
        description="Track every inquiry. Bring your next opportunity into focus."
      >
        <a className="button" href={"/api/leads/export?" + filters}>
          <DownloadSimple size={17} />
          Export
        </a>
        <button className="button primary" onClick={() => setNewLead(true)}>
          <Plus size={17} />
          Add lead
        </button>
      </PageTitle>
      {overview.data && (
        <LeadSummary
          data={overview.data}
          currency={session.workspace.currency}
        />
      )}
      <div className="lead-workspace-grid">
        <div className="lead-main-column">
          <section className="panel leads-panel">
            <div className="table-toolbar">
              <div className="tabs">
                <button
                  className={!archived ? "selected" : ""}
                  onClick={() => {
                    setArchived(false);
                    setPage(1);
                  }}
                >
                  All leads{" "}
                  <span>{!archived ? (query.data?.total ?? "…") : ""}</span>
                </button>
                <button
                  className={archived ? "selected" : ""}
                  onClick={() => {
                    setArchived(true);
                    setPage(1);
                  }}
                >
                  Archived
                </button>
              </div>
              <label className="search-input">
                <MagnifyingGlass size={18} />
                <input
                  aria-label="Search leads"
                  placeholder="Search name, company, email…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </label>
            </div>
            <div className="table-filters">
              <select
                aria-label="Filter by stage"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All stages</option>
                {stages.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <select
                aria-label="Filter by source"
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All sources</option>
                {sources.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <select
                aria-label="Sort leads"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="created_at">Newest first</option>
                <option value="score">Highest score</option>
                <option value="name">Name A–Z</option>
                <option value="budget">Highest budget</option>
                <option value="status">Stage A–Z</option>
              </select>
              <span>{query.data?.total ?? 0} records</span>
            </div>
            {query.isPending ? (
              <Loading />
            ) : query.error ? (
              <ErrorState error={query.error} />
            ) : query.data.items.length ? (
              <>
                <div className="table-scroll">
                  <table className="leads-table">
                    <thead>
                      <tr>
                        <th>Contact</th>
                        <th>Service / company</th>
                        <th>Stage</th>
                        <th>Score</th>
                        <th>Est. value</th>
                        <th>Source</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {query.data.items.map((lead, i) => (
                        <tr key={lead.id}>
                          <td>
                            <Link
                              className="contact-cell"
                              href={"/leads/" + lead.id}
                            >
                              <span className={"avatar color-" + (i % 5)}>
                                {initials(lead.name)}
                              </span>
                              <span>
                                <strong>{lead.name}</strong>
                                <small>{lead.email}</small>
                              </span>
                            </Link>
                          </td>
                          <td>
                            <strong>{lead.company || "Independent"}</strong>
                            <small>{lead.service}</small>
                          </td>
                          <td>
                            <Badge value={lead.status} />
                          </td>
                          <td>
                            <div className="table-score">
                              <Score value={lead.score} />
                              <div className="score-track">
                                <i style={{ width: lead.score + "%" }} />
                              </div>
                            </div>
                          </td>
                          <td className="numeric">
                            {money(
                              lead.budget,
                              session.workspace.currency,
                              true,
                            )}
                          </td>
                          <td>{lead.source}</td>
                          <td>{date(lead.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="pagination">
                  <span>
                    Showing {(page - 1) * pageSize + 1}–
                    {Math.min(page * pageSize, query.data.total)} of{" "}
                    {query.data.total}
                  </span>
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
                      disabled={page * pageSize >= query.data.total}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <Empty
                title="No leads found"
                text="Try another filter, or add your first inquiry."
              />
            )}
          </section>
          {overview.data && <LeadActivity data={overview.data} />}
        </div>
        {overview.data && (
          <LeadIntelligence
            data={overview.data}
            currency={session.workspace.currency}
          />
        )}
      </div>
      {newLead && (
        <Modal title="Add a new lead" onClose={() => setNewLead(false)}>
          <LeadForm onDone={(lead) => router.push("/leads/" + lead.id)} />
        </Modal>
      )}
    </>
  );
}
export function StageControl({
  lead,
  onDone,
}: {
  lead: Lead;
  onDone?: () => void;
}) {
  const { run } = useNotice();
  const [target, setTarget] = useState("");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  async function move(status: string, final_value?: number) {
    setSaving(true);
    const result = await run(
      () =>
        api("/leads/" + lead.id + "/stage", "PATCH", {
          status,
          loss_reason: reason,
          final_value: final_value ?? null,
        }),
      "Stage updated.",
    );
    setSaving(false);
    if (result) {
      setTarget("");
      onDone?.();
    }
  }
  return (
    <>
      <select
        aria-label={"Stage for " + lead.name}
        value={lead.status}
        disabled={saving}
        onChange={(e) => {
          const stage = e.target.value;
          if (stage === "Won" || stage === "Lost") {
            setTarget(stage);
            setValue(lead.budget?.toString() || "");
          } else void move(stage);
        }}
      >
        {stages.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      {target && (
        <Modal title={"Close as " + target} onClose={() => setTarget("")}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void move(target, target === "Won" ? Number(value) : undefined);
            }}
          >
            {target === "Won" ? (
              <label>
                Final deal value (INR)
                <input
                  type="number"
                  min={0}
                  max={1000000000}
                  required
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </label>
            ) : (
              <label>
                Loss reason (optional)
                <textarea
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
            )}
            <div className="form-footer">
              <button className="button primary" disabled={saving}>
                Confirm {target.toLowerCase()}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
export function LeadDetail({ id, session }: { id: string; session: Session }) {
  const { run } = useNotice();
  const [edit, setEdit] = useState(false);
  const [task, setTask] = useState(false);
  const [tab, setTab] = useState("Overview");
  const [note, setNote] = useState("");
  const [contact, setContact] = useState(false);
  const query = useQuery({
    queryKey: ["lead", id],
    queryFn: () => api<Lead>("/leads/" + id),
  });
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorState error={query.error} />;
  const lead = query.data;
  async function saveNote() {
    const done = await run(
      () =>
        api("/leads/" + id + (contact ? "/contact" : "/notes"), "POST", {
          body: note,
        }),
      contact ? "Communication recorded. No message was sent." : "Note saved.",
    );
    if (done) setNote("");
  }
  return (
    <>
      <Link href="/leads" className="back-link">
        <ArrowLeft size={15} />
        Back to leads
      </Link>
      <div className="lead-header">
        <span className="avatar large">{initials(lead.name)}</span>
        <div>
          <div className="heading-line">
            <h1>{lead.name}</h1>
            <Badge value={lead.status} />
            {lead.archived && <Badge value="Archived" />}
          </div>
          <p>
            {lead.company || "Independent inquiry"} <span>·</span>{" "}
            {lead.service}
          </p>
        </div>
        <div className="page-actions">
          <button className="button" onClick={() => setEdit(true)}>
            <PencilSimple size={16} />
            Edit lead
          </button>
          <button
            className="button"
            onClick={() =>
              run(
                () =>
                  api(
                    "/leads/" + id + "/archive?archived=" + !lead.archived,
                    "POST",
                  ),
                lead.archived ? "Lead restored." : "Lead archived.",
              )
            }
          >
            {lead.archived ? (
              <ArrowCounterClockwise size={16} />
            ) : (
              <Archive size={16} />
            )}{" "}
            {lead.archived ? "Restore" : "Archive"}
          </button>
        </div>
      </div>
      <div className="detail-grid">
        <aside>
          <section className="panel contact-panel">
            <SectionHead title="Contact details" />
            <p>
              <EnvelopeSimple size={17} />
              <span>{lead.email}</span>
            </p>
            <p>
              <Buildings size={17} />
              <span>{lead.company || "Company not provided"}</span>
            </p>
            {lead.phone && (
              <p>
                <Phone size={17} />
                {lead.phone}
              </p>
            )}
            {lead.website && (
              <p>
                <Globe size={17} />
                <a
                  href={lead.website}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Company website
                </a>
              </p>
            )}
            <hr />
            <dl>
              <div>
                <dt>Estimated value</dt>
                <dd>{money(lead.budget, session.workspace.currency)}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{lead.source}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>{lead.assigned_to}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{date(lead.created_at)}</dd>
              </div>
              <div>
                <dt>Last contacted</dt>
                <dd>
                  {lead.last_contacted
                    ? date(lead.last_contacted)
                    : "Not recorded"}
                </dd>
              </div>
              {lead.closed_at && (
                <div>
                  <dt>Closed</dt>
                  <dd>{date(lead.closed_at)}</dd>
                </div>
              )}
              {lead.final_value !== null && (
                <div>
                  <dt>Final value</dt>
                  <dd>{money(lead.final_value, session.workspace.currency)}</dd>
                </div>
              )}
            </dl>
            <label className="stage-label">
              Sales stage
              <StageControl lead={lead} />
            </label>
            <div className="tags">
              {lead.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            {lead.loss_reason && <p>Loss reason: {lead.loss_reason}</p>}
          </section>
          <section className="next-action">
            <div className="eyebrow">SUGGESTED NEXT STEP</div>
            <h3>{lead.qualification.next_action}</h3>
            <button className="text-link" onClick={() => setTask(true)}>
              Schedule a follow-up <ArrowRight size={16} />
            </button>
          </section>
        </aside>
        <div>
          <div className="detail-tabs tabs">
            {["Overview", "Drafts", "Follow-ups", "Activity"].map((t) => (
              <button
                className={tab === t ? "selected" : ""}
                key={t}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === "Overview" && (
            <>
              <section className="panel">
                <SectionHead
                  title="The original inquiry"
                  subtitle="Customer-supplied content; treat as untrusted input"
                />
                <p className="inquiry-text">{lead.message}</p>
              </section>
              <section className="panel qualification">
                <SectionHead
                  title="A score you can explain"
                  subtitle={lead.qualification.disclaimer}
                >
                  <Score value={lead.score} />
                </SectionHead>
                <div className="qualification-category">
                  <Badge value={lead.qualification.category} />
                  <span>Rules-based qualification</span>
                </div>
                {lead.qualification.factors.map((f) => (
                  <div className="factor" key={f.name}>
                    <div>
                      <strong>{f.name}</strong>
                      <span>
                        {f.points} / {f.max}
                      </span>
                    </div>
                    <div className="bar-track">
                      <div style={{ width: (f.points / f.max) * 100 + "%" }} />
                    </div>
                    <p>{f.reason}</p>
                  </div>
                ))}
                {lead.qualification.missing.length > 0 && (
                  <p className="missing-info">
                    Missing information: {lead.qualification.missing.join(", ")}
                  </p>
                )}
                <button
                  className="button small"
                  onClick={() =>
                    run(
                      () => api("/leads/" + id + "/qualify", "POST"),
                      "Qualification recalculated.",
                    )
                  }
                >
                  <ArrowCounterClockwise size={15} />
                  Recalculate score
                </button>
              </section>
              <section className="panel">
                <SectionHead title="Internal notes & communication" />
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void saveNote();
                  }}
                >
                  <textarea
                    aria-label="Internal note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    maxLength={5000}
                    required
                    placeholder="Add context for your team…"
                  />
                  <div className="form-footer">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={contact}
                        onChange={(e) => setContact(e.target.checked)}
                      />
                      Log as communication already made
                    </label>
                    <button className="button primary">Save note</button>
                  </div>
                </form>
                {lead.notes?.map((n) => (
                  <div className="saved-note" key={n.id}>
                    <div>
                      <strong>{n.author}</strong>
                      <small>{date(n.created_at, true)}</small>
                    </div>
                    <p>{n.body}</p>
                  </div>
                ))}
              </section>
            </>
          )}
          {tab === "Drafts" && <DraftEditor lead={lead} session={session} />}
          {tab === "Follow-ups" && (
            <section className="panel">
              <SectionHead title="Follow-ups">
                <button className="button small" onClick={() => setTask(true)}>
                  <Plus size={15} />
                  Schedule
                </button>
              </SectionHead>
              <TaskList tasks={lead.tasks || []} />
            </section>
          )}
          {tab === "Activity" && (
            <section className="panel">
              <SectionHead
                title="Activity timeline"
                subtitle="A traceable history of changes and manual actions"
              />
              {lead.activity?.map((a) => (
                <div className="timeline-item" key={a.id}>
                  <span className="timeline-dot" />
                  <div>
                    <strong>{a.text}</strong>
                    <small>{date(a.created_at, true)}</small>
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
      {edit && (
        <Modal title="Edit lead" onClose={() => setEdit(false)}>
          <LeadForm lead={lead} onDone={() => setEdit(false)} />
        </Modal>
      )}
      {task && (
        <Modal title="Schedule a follow-up" onClose={() => setTask(false)}>
          <TaskForm leadId={id} onDone={() => setTask(false)} />
        </Modal>
      )}
    </>
  );
}
export function Pipeline({ session }: { session: Session }) {
  const { run } = useNotice();
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [sort, setSort] = useState("score");
  const [drop, setDrop] = useState<{ lead: Lead; stage: string } | null>(null);
  const [finalValue, setFinalValue] = useState("");
  const [lossReason, setLossReason] = useState("");
  const query = useQuery({
    queryKey: ["pipeline", source, sort],
    queryFn: () =>
      api<LeadPage>(
        "/leads?size=200&source=" +
          encodeURIComponent(source) +
          "&sort=" +
          sort,
      ),
  });
  async function move(lead: Lead, stage: string) {
    if (lead.status === stage) return;
    if (stage === "Won" || stage === "Lost") {
      setDrop({ lead, stage });
      setFinalValue(lead.budget?.toString() || "");
      return;
    }
    await run(
      () => api("/leads/" + lead.id + "/stage", "PATCH", { status: stage }),
      "Pipeline updated.",
    );
  }
  const leads =
    query.data?.items.filter((l) =>
      (l.name + " " + l.company).toLowerCase().includes(search.toLowerCase()),
    ) || [];
  return (
    <>
      <PageTitle
        eyebrow="FROM FIRST HELLO TO CLOSED DEAL"
        title="Keep opportunity moving."
        description="Move leads between stages. Every change is saved and recorded."
      >
        <AddLeadLink />
      </PageTitle>
      <div className="filter-row">
        <label className="search-input">
          <MagnifyingGlass size={18} />
          <input
            placeholder="Find an opportunity…"
            aria-label="Search pipeline"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="filter-controls">
          <select
            aria-label="Pipeline source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="">All sources</option>
            {sources.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            aria-label="Pipeline sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="score">Highest score</option>
            <option value="budget">Highest value</option>
            <option value="created_at">Newest first</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>
      <p className="help">
        Drag a card, or use its stage selector with your keyboard. Showing up to
        200 records; use source filters to narrow larger workspaces.
      </p>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : (
        <div className="kanban">
          {stages.map((stage) => {
            const items = leads.filter((l) => l.status === stage);
            return (
              <section
                className="kanban-column"
                key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const lead = leads.find(
                    (l) => l.id === e.dataTransfer.getData("text/plain"),
                  );
                  if (lead) void move(lead, stage);
                }}
              >
                <div className="kanban-heading">
                  <Badge value={stage} />
                  <span>{items.length}</span>
                </div>
                <div className="kanban-total">
                  {money(
                    items.reduce((s, l) => s + (l.budget || 0), 0),
                    session.workspace.currency,
                    true,
                  )}
                </div>
                {items.map((lead) => (
                  <article
                    className="kanban-card"
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/plain", lead.id)
                    }
                    key={lead.id}
                  >
                    <Link href={"/leads/" + lead.id}>
                      <div className="kanban-card-top">
                        <span className="avatar">{initials(lead.name)}</span>
                        <Score value={lead.score} />
                      </div>
                      <h3>{lead.name}</h3>
                      <p>{lead.company}</p>
                      <span className="service-tag">{lead.service}</span>
                      <strong className="kanban-value">
                        {money(lead.budget, session.workspace.currency, true)}
                      </strong>
                    </Link>
                    <StageControl lead={lead} />
                    <div className="kanban-card-footer">
                      <span>{lead.source}</span>
                      <span>
                        <CalendarBlank size={12} />
                        {date(lead.created_at)}
                      </span>
                    </div>
                  </article>
                ))}
                {items.length === 0 && (
                  <div className="kanban-empty">Drop an opportunity here</div>
                )}
              </section>
            );
          })}
        </div>
      )}
      {drop && (
        <Modal title={"Close as " + drop.stage} onClose={() => setDrop(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const result = await run(
                () =>
                  api("/leads/" + drop.lead.id + "/stage", "PATCH", {
                    status: drop.stage,
                    final_value:
                      drop.stage === "Won" ? Number(finalValue) : null,
                    loss_reason: lossReason,
                  }),
                "Pipeline updated.",
              );
              if (result) setDrop(null);
            }}
          >
            {drop.stage === "Won" ? (
              <label>
                Final deal value (INR)
                <input
                  type="number"
                  min={0}
                  max={1000000000}
                  required
                  value={finalValue}
                  onChange={(e) => setFinalValue(e.target.value)}
                />
              </label>
            ) : (
              <label>
                Loss reason (optional)
                <textarea
                  value={lossReason}
                  maxLength={500}
                  onChange={(e) => setLossReason(e.target.value)}
                />
              </label>
            )}
            <button className="button primary">
              Confirm {drop.stage.toLowerCase()}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
