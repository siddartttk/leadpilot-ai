"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  SquaresFour,
  UsersThree,
  Kanban,
  ChatText,
  CalendarCheck,
  ChartBar,
  FlowArrow,
  GearSix,
  ArrowUpRight,
  ArrowRight,
  MagnifyingGlass,
  List,
  X,
  SignOut,
  ArrowCounterClockwise,
  PaperPlaneTilt,
  Plus,
  ShieldCheck,
} from "@phosphor-icons/react";
import { api, ApiError, setCsrf, initials } from "@/lib/api";
import type { Session } from "@/lib/types";
import { useNotice } from "./providers";
import { Loading, ErrorState } from "./ui";
import { Dashboard } from "./dashboard";
import { Leads, LeadDetail, Pipeline } from "./leads";
import { Assistant, Followups, Preferences } from "./workflows";
import { Landing, Auth, Capture, Legal } from "./public";

const navigation = [
  { path: "/dashboard", label: "Overview", icon: SquaresFour },
  { path: "/leads", label: "Leads", icon: UsersThree },
  { path: "/pipeline", label: "Sales pipeline", icon: Kanban },
  { path: "/ai-assistant", label: "AI assistant", icon: ChatText },
  { path: "/follow-ups", label: "Follow-ups", icon: CalendarCheck },
  { path: "/analytics", label: "Analytics", icon: ChartBar },
  { path: "/automations", label: "Automations", icon: FlowArrow },
];
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <PaperPlaneTilt size={24} weight="fill" />
      </span>
      <span>
        LeadPilot<span className="ai-label">AI</span>
      </span>
    </span>
  );
}
export function App() {
  const path = usePathname();
  if (path === "/") return <Landing />;
  if (path === "/login") return <Auth />;
  if (path === "/privacy" || path === "/terms") return <Legal kind={path} />;
  return <Workspace path={path} />;
}
function Workspace({ path }: { path: string }) {
  const router = useRouter();
  const client = useQueryClient();
  const { run } = useNotice();
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const [search, setSearch] = useState("");
  const session = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      let data: Session;
      try {
        data = await api<Session>("/session");
      } catch (error) {
        if (
          (path === "/demo" || path === "/capture") &&
          error instanceof ApiError &&
          error.status === 401
        )
          data = await api<Session>("/demo", "POST");
        else throw error;
      }
      setCsrf(data.csrf);
      return data;
    },
    staleTime: Infinity,
  });
  if (session.isPending) return <Loading />;
  if (session.error) {
    if (session.error instanceof ApiError && session.error.status === 401)
      return <Auth />;
    return <ErrorState error={session.error} retry={() => session.refetch()} />;
  }
  const current = session.data;
  const title =
    path === "/demo"
      ? "Overview"
      : navigation.find((n) => path.startsWith(n.path))?.label ||
        (path === "/capture" ? "Test inquiry" : "Workspace settings");
  async function logout() {
    const done = await run(() => api("/auth/logout", "POST"));
    if (done) {
      client.clear();
      setCsrf("");
      router.push("/");
    }
  }
  async function reset() {
    if (
      window.confirm(
        "Reset your isolated demo? This discards changes in this demo session only.",
      )
    )
      await run(
        () => api("/demo/reset", "POST"),
        "Demo restored to its synthetic baseline.",
      );
  }
  return (
    <div className="app-shell">
      {open && (
        <button
          aria-label="Close navigation"
          className="nav-backdrop"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={"sidebar " + (open ? "is-open" : "")}
        inert={compact && !open}
        aria-hidden={compact && !open}
      >
        <Link href="/dashboard" className="brand-link">
          <Brand />
        </Link>
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        >
          <X size={22} />
        </button>
        <div className="workspace-label">
          <span className="workspace-avatar">
            N<span>↗</span>
          </span>
          <div>
            <strong>{current.workspace.name}</strong>
            <small>
              {current.workspace.is_demo
                ? "Demo workspace"
                : "Private workspace"}
            </small>
          </div>
        </div>
        <p className="nav-section">WORKSPACE</p>
        <nav>
          {navigation.map((n) => (
            <Link
              key={n.path}
              href={n.path}
              title={n.label}
              aria-label={n.label}
              onClick={() => setOpen(false)}
              className={
                path.startsWith(n.path) ||
                (path === "/demo" && n.path === "/dashboard")
                  ? "active"
                  : ""
              }
            >
              <n.icon
                size={20}
                weight={path.startsWith(n.path) ? "fill" : "regular"}
              />
              <span>{n.label}</span>
              {n.path === "/ai-assistant" && (
                <small className="nav-ai">AI</small>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-tip">
            <span className="tip-eyebrow">
              <ShieldCheck size={16} />{" "}
              {current.workspace.is_demo
                ? "A safe space to explore"
                : "Your private workspace"}
            </span>
            <p>
              {current.workspace.is_demo
                ? "Fictional leads. Real workflows. Every change stays in your demo."
                : "Lead intelligence with human review at every step."}
            </p>
            <Link href="/capture">
              Try the inquiry form <ArrowUpRight size={14} />
            </Link>
          </div>
          <Link
            className={
              "settings-link " + (path === "/settings" ? "active" : "")
            }
            href="/settings"
          >
            <GearSix size={20} />
            Settings
          </Link>
          <div className="profile">
            <span className="avatar">{initials(current.user.name)}</span>
            <div>
              <strong>{current.user.name}</strong>
              <small>
                {current.user.role === "demo"
                  ? "Exploring LeadPilot"
                  : current.user.role}
              </small>
            </div>
            <button
              aria-label="Sign out"
              className="icon-button"
              onClick={logout}
            >
              <SignOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <Link className="header-brand" href="/dashboard">
            <Brand />
          </Link>
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <List size={24} />
            </button>
            <span>Workspace</span>
            <span>/</span>
            <strong>{title}</strong>
          </div>
          <nav className="header-nav" aria-label="Primary navigation">
            {navigation.map((n) => (
              <Link
                key={n.path}
                href={n.path}
                aria-label={"Go to " + n.label}
                className={
                  path.startsWith(n.path) ||
                  (path === "/demo" && n.path === "/dashboard")
                    ? "active"
                    : ""
                }
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="topbar-right">
            <form
              className="global-search"
              onSubmit={(e) => {
                e.preventDefault();
                router.push("/leads?q=" + encodeURIComponent(search));
              }}
            >
              <MagnifyingGlass size={18} />
              <input
                aria-label="Search all leads"
                placeholder="Search leads…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <kbd>↵</kbd>
            </form>
            <span className="mode-pill">
              <i />
              {current.ai_mode.startsWith("Live")
                ? "Live AI"
                : "Rules-based mode"}
            </span>
            <span className="avatar top-avatar" title={current.user.name}>
              {initials(current.user.name)}
            </span>
          </div>
        </header>
        {current.workspace.is_demo && (
          <div className="demo-banner">
            <span>
              <span className="mini-label">DEMO</span> You’re exploring
              Northstar Studio. All leads and metrics are synthetic.
            </span>
            <button onClick={reset}>
              <ArrowCounterClockwise size={14} />
              Reset demo
            </button>
          </div>
        )}
        <main id="main-content" className="main-content">
          {path === "/dashboard" || path === "/demo" ? (
            <Dashboard session={current} />
          ) : path === "/analytics" ? (
            <Dashboard session={current} analytics />
          ) : path === "/leads" ? (
            <Leads session={current} />
          ) : path.startsWith("/leads/") ? (
            <LeadDetail id={path.split("/")[2]} session={current} />
          ) : path === "/pipeline" ? (
            <Pipeline session={current} />
          ) : path === "/ai-assistant" ? (
            <Assistant session={current} />
          ) : path === "/follow-ups" ? (
            <Followups session={current} />
          ) : path === "/automations" || path === "/settings" ? (
            <Preferences
              session={current}
              automations={path === "/automations"}
            />
          ) : path === "/capture" ? (
            <Capture />
          ) : (
            <ErrorState error={new Error("This page does not exist.")} />
          )}
        </main>
        <footer className="app-footer">
          <span>LeadPilot AI · Thoughtful sales, better organized.</span>
          <div>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <span>Times in Asia/Kolkata</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="page-actions">{children}</div>
    </div>
  );
}
export function AddLeadLink() {
  return (
    <Link className="button primary" href="/leads?new=1">
      <Plus size={17} />
      Add lead
    </Link>
  );
}
export function TextLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link className="text-link" href={href}>
      {children}
      <ArrowRight size={15} />
    </Link>
  );
}
