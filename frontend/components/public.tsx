"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Target,
  ChatText,
  CheckCircle,
  FlowArrow,
  ChartBar,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import { api, setCsrf } from "@/lib/api";
import type { Session } from "@/lib/types";
import { Brand } from "./app";
import { useNotice } from "./providers";
import { LeadForm } from "./leads";

export function DemoButton({
  className = "button primary large-button",
}: {
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const { run } = useNotice();
  const router = useRouter();
  const client = useQueryClient();
  return (
    <button
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const result = await run(() => api<Session>("/demo", "POST"));
        if (result) {
          client.clear();
          setCsrf(result.csrf);
          client.setQueryData(["session"], result);
          router.push("/dashboard");
        }
        setBusy(false);
      }}
    >
      {busy ? "Preparing your workspace…" : "Explore the demo"}
      <ArrowRight size={18} />
    </button>
  );
}
export function Landing() {
  return (
    <div className="landing">
      <nav className="public-nav">
        <Link href="/">
          <Brand />
        </Link>
        <div>
          <a href="#workflow">The workflow</a>
          <a href="#inside">Inside LeadPilot</a>
          <Link href="/login">
            Sign in <ArrowUpRight size={14} />
          </Link>
          <DemoButton className="button primary" />
        </div>
      </nav>
      <main id="main-content">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="live-dot" />
              LESS ADMIN. MORE OPPORTUNITY.
            </div>
            <h1>
              Every inquiry has potential.
              <br />
              <span>Give it a clear next step.</span>
            </h1>
            <p>
              Meet LeadPilot AI. A focused sales workspace that brings your
              leads, qualification, conversations, and follow-ups into one clear
              view.
            </p>
            <div className="hero-actions">
              <DemoButton />
              <a className="text-link" href="#inside">
                Take a closer look <ArrowUpRight size={17} />
              </a>
            </div>
            <div className="hero-note">
              <ShieldCheck size={16} />
              No account needed · Fictional data · Your own isolated demo
            </div>
          </div>
          <div className="hero-aside">
            <div className="hero-stamp">
              <PaperPlaneTilt size={44} weight="fill" />
            </div>
            <p>
              A little less scattered.
              <br />A lot more considered.
            </p>
            <div className="hero-rule" />
            <span>BUILT FOR SERVICE BUSINESSES</span>
          </div>
        </section>
        <section className="product-preview" id="inside">
          <div className="preview-caption">
            <span>
              <i className="live-dot" />
              THE WORKSPACE, IN ACTION
            </span>
            <span>Northstar Studio · Synthetic demonstration</span>
          </div>
          <Link href="/demo" aria-label="Open the interactive demo">
            <Image
              unoptimized
              src="/screenshots/dashboard.png"
              alt="Actual LeadPilot dashboard with database-backed metrics, lead acquisition, source breakdown, and follow-up tasks"
              width="1440"
              height="1000"
            />
          </Link>
          <div className="preview-bottom">
            <span>One place to see what matters. And what happens next.</span>
            <Link href="/demo">
              Try the real workflow <ArrowRight size={17} />
            </Link>
          </div>
        </section>
        <section className="workflow-section" id="workflow">
          <div className="workflow-intro">
            <span className="eyebrow">FROM INQUIRY TO OPPORTUNITY</span>
            <h2>
              A connected workflow.
              <br />A considered approach.
            </h2>
            <p>
              Built around the everyday work of a small service business, from
              the first inquiry to the final follow-up.
            </p>
          </div>
          <div className="workflow-steps">
            {[
              {
                n: "01",
                icon: FlowArrow,
                title: "Bring inquiries into focus",
                text: "Capture and organize leads, record their context, and keep every stage change in a traceable history.",
              },
              {
                n: "02",
                icon: Target,
                title: "Know why a lead matters",
                text: "See a transparent 0–100 score with factor contributions and missing details. Business rules, clearly explained.",
              },
              {
                n: "03",
                icon: ChatText,
                title: "Make room for better conversations",
                text: "Create a useful first draft, edit it, and approve it. Communication stays under human control.",
              },
              {
                n: "04",
                icon: ChartBar,
                title: "See the work behind the numbers",
                text: "Explore calculated pipeline value, source performance, and follow-ups with explicit metric definitions.",
              },
            ].map((s) => (
              <div className="workflow-step" key={s.n}>
                <span>{s.n}</span>
                <s.icon size={25} />
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="trust-band">
          <div>
            <span className="eyebrow">PRACTICAL AI. HONEST ENGINEERING.</span>
            <h2>Useful with or without a model.</h2>
            <p>
              The demo runs on deterministic rules and local templates. Private
              workspaces can opt into an OpenAI-compatible provider. Every
              output is labeled, every message reviewed.
            </p>
            <div className="tech-tags">
              <span>Next.js + TypeScript</span>
              <span>FastAPI</span>
              <span>SQLAlchemy + PostgreSQL</span>
              <span>Explainable scoring</span>
            </div>
          </div>
          <DemoButton />
        </section>
      </main>
      <footer className="public-footer">
        <Brand />
        <span>Turn every inquiry into an opportunity.</span>
        <div>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/login">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
export function Auth() {
  const [create, setCreate] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [busy, setBusy] = useState(false);
  const { run } = useNotice();
  const client = useQueryClient();
  const router = useRouter();
  return (
    <div className="auth-page">
      <Link href="/">
        <Brand />
      </Link>
      <section id="main-content" className="auth-card">
        <div className="eyebrow">YOUR NEXT CHAPTER</div>
        <h1>{create ? "A workspace of your own." : "Welcome back."}</h1>
        <p>
          {create
            ? "Create a private workspace with an empty lead database."
            : "Sign in to your private sales workspace."}
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const result = await run(() =>
              api<Session>(create ? "/auth/register" : "/auth/login", "POST", {
                email,
                password,
                ...(create ? { name, workspace } : {}),
              }),
            );
            if (result) {
              client.clear();
              setCsrf(result.csrf);
              client.setQueryData(["session"], result);
              router.push("/dashboard");
            }
            setBusy(false);
          }}
        >
          {create && (
            <>
              <label>
                Your name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  maxLength={100}
                  required
                />
              </label>
              <label>
                Workspace name
                <input
                  value={workspace}
                  onChange={(e) => setWorkspace(e.target.value)}
                  minLength={2}
                  maxLength={120}
                  required
                />
              </label>
            </>
          )}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              aria-label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={12}
              maxLength={128}
              required
              autoComplete={create ? "new-password" : "current-password"}
            />
            <small>At least 12 characters</small>
          </label>
          <button className="button primary" disabled={busy}>
            {busy ? "Please wait…" : create ? "Create workspace" : "Sign in"}
            <ArrowRight size={17} />
          </button>
        </form>
        <button
          className="text-link auth-toggle"
          onClick={() => setCreate(!create)}
        >
          {create
            ? "Already have a workspace? Sign in"
            : "New here? Create a private workspace"}
        </button>
        <div className="auth-divider">Just exploring?</div>
        <DemoButton className="button" />
      </section>
      <p className="help">
        Portfolio MVP · Password recovery and email verification are not yet
        enabled.
      </p>
      <Link href="/privacy" className="text-link">
        Privacy & demo data
      </Link>
    </div>
  );
}
export function Capture() {
  const [done, setDone] = useState("");
  return (
    <div className="capture-page">
      <div className="eyebrow">NORTHSTAR STUDIO · FICTIONAL AGENCY</div>
      <h1>Let’s build something useful.</h1>
      <p>
        Tell us about your next digital project. This is a test inquiry form
        connected to your isolated demo.
      </p>
      {done ? (
        <section className="panel capture-success">
          <CheckCircle size={44} />
          <h2>Your inquiry has a home.</h2>
          <p>Your test inquiry was saved. No external message was sent.</p>
          <Link className="button primary" href={"/leads/" + done}>
            View your inquiry <ArrowRight size={17} />
          </Link>
          <button className="button" onClick={() => setDone("")}>
            Submit another
          </button>
        </section>
      ) : (
        <section className="panel">
          <LeadForm capture onDone={(lead) => setDone(lead.id)} />
        </section>
      )}
      <p className="help">
        Use fictional details and example.com email addresses.{" "}
        <Link href="/privacy">Read the demo data notice.</Link>
      </p>
    </div>
  );
}
export function Legal({ kind }: { kind: string }) {
  return (
    <div className="legal-page">
      <Link href="/">
        <Brand />
      </Link>
      <article id="main-content">
        <span className="eyebrow">DRAFT POLICY · PORTFOLIO MVP</span>
        <h1>
          {kind === "/privacy"
            ? "Privacy & demonstration data"
            : "Terms of use"}
        </h1>
        <p className="legal-notice">
          This is draft product information for a demonstration application. It
          has not been reviewed by a lawyer and is not a compliance
          certification.
        </p>
        {kind === "/privacy" ? (
          <>
            <h2>What the application stores</h2>
            <p>
              Lead contact details, inquiries, optional budgets, notes, tasks,
              drafts, stage history, and account information are stored in the
              configured database. Passwords are hashed with Argon2. A necessary
              HttpOnly cookie identifies your session. No advertising or
              analytics tracking is built in.
            </p>
            <h2>The public demonstration</h2>
            <p>
              Northstar Studio, its contacts, and all seeded business results
              are fictional. Use only fictional test data. Each demo session has
              its own workspace and expires after eight hours. Expiration stops
              access; it does not itself delete records. The operator must run
              the documented cleanup command to remove expired demo workspaces.
              Reset Demo replaces only your current synthetic workspace
              contents.
            </p>
            <h2>AI processing</h2>
            <p>
              Demo mode uses deterministic local rules and templates. When an
              operator explicitly enables Live AI for private workspaces, the
              configured external provider receives the inquiry text, service,
              budget, business context, and any rewrite text. Avoid sensitive
              information in inquiries. Provider terms and retention must be
              assessed before live use.
            </p>
            <h2>Retention and requests</h2>
            <p>
              Private records remain until removed by the operator. Archiving
              hides a lead; it does not delete it. Export is available to
              authenticated workspace users. A production operator must
              establish retention periods and a verified contact channel for
              access or deletion requests before collecting real customer data.
            </p>
            <h2>Security and limitations</h2>
            <p>
              Workspace checks, scoped queries, session expiration, CSRF checks,
              validation, and local rate limits are implemented. No claim of
              GDPR, DPDP, SOC 2, HIPAA, or other certification is made. See the
              deployment documentation for production controls still needed.
            </p>
          </>
        ) : (
          <>
            <h2>Purpose</h2>
            <p>
              LeadPilot AI is a portfolio MVP for evaluating lead management,
              explainable qualification, analytics, and human-reviewed message
              drafting. The public demo is for fictional inquiries only.
            </p>
            <h2>Your responsibilities</h2>
            <p>
              Use the application lawfully, keep credentials private, and do not
              submit sensitive information to public demos. Do not attempt to
              access other workspaces or abuse the capture and AI endpoints.
            </p>
            <h2>Qualification and drafts</h2>
            <p>
              Lead scores reflect configurable business rules, not
              scientifically validated conversion probabilities. Drafts may be
              incomplete or inaccurate. Review every statement before copying a
              message for external use. The application does not send messages.
            </p>
            <h2>Availability and outcomes</h2>
            <p>
              The demo is provided for evaluation without guarantees of
              availability, data durability, revenue, conversion improvements,
              or fitness for a particular business. Backups, operational
              monitoring, legal review, and security review are required before
              production use.
            </p>
            <h2>Before deployment</h2>
            <p>
              The operator must publish its legal identity, contact details,
              jurisdiction, retention policy, and appropriate reviewed terms
              before offering this service to customers.
            </p>
          </>
        )}
        <Link className="button" href="/">
          Back to LeadPilot <ArrowRight size={16} />
        </Link>
      </article>
    </div>
  );
}
