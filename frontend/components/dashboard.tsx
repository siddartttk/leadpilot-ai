"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  ArrowUpRight,
  UsersThree,
  Target,
  TrendUp,
  CurrencyInr,
  CalendarBlank,
  ArrowRight,
  Clock,
  CheckCircle,
} from "@phosphor-icons/react";
import { api, money, date } from "@/lib/api";
import type { Analytics, Session, Metrics } from "@/lib/types";
import { sources } from "@/lib/types";
import { PageTitle, AddLeadLink, TextLink } from "./app";
import { Loading, ErrorState, SectionHead, Empty } from "./ui";
const colors = [
  "#55cddd",
  "#5a96ff",
  "#a092ec",
  "#dcad67",
  "#dc87b5",
  "#7fcfb5",
  "#9ea9c5",
];
export function Dashboard({
  session,
  analytics = false,
}: {
  session: Session;
  analytics?: boolean;
}) {
  const [days, setDays] = useState("180");
  const [source, setSource] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const params = new URLSearchParams({
    days,
    source,
    ...(start ? { start } : {}),
    ...(end ? { end } : {}),
  });
  const query = useQuery({
    queryKey: ["analytics", params.toString()],
    queryFn: () => api<Analytics>("/analytics?" + params),
  });
  return (
    <>
      <PageTitle
        eyebrow={analytics ? "PERFORMANCE & INSIGHTS" : "YOUR SALES, IN FOCUS"}
        title={
          analytics ? "Sales analytics" : "A clearer view. A smarter next move."
        }
        description={
          analytics
            ? "Understand the sources, stages, and actions behind your pipeline."
            : "Here’s what’s happening across your pipeline."
        }
      >
        <AddLeadLink />
      </PageTitle>
      <div className="filter-row">
        <div className="view-caption">
          <span className="live-dot" />
          Database-backed workspace overview
        </div>
        <div className="filter-controls">
          <label className="select-wrap">
            <span className="sr-only">Lead source</span>
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">All sources</option>
              {sources.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="select-wrap">
            <CalendarBlank size={16} />
            <span className="sr-only">Reporting period</span>
            <select
              value={days}
              onChange={(e) => {
                setDays(e.target.value);
                setStart("");
                setEnd("");
              }}
            >
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="180">Last 6 months</option>
              <option value="365">Last 12 months</option>
            </select>
          </label>
        </div>
      </div>
      {analytics && (
        <div className="custom-dates">
          <label>
            From (UTC)
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            Through (UTC)
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <p>All panels use the same lead acquisition cohort.</p>
        </div>
      )}
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => query.refetch()} />
      ) : (
        <DashboardContent
          data={query.data}
          currency={session.workspace.currency}
          analytics={analytics}
        />
      )}
    </>
  );
}
function DashboardContent({
  data,
  currency,
  analytics,
}: {
  data: Analytics;
  currency: string;
  analytics: boolean;
}) {
  const cards: {
    key: keyof Metrics;
    title: string;
    definition: string;
    icon: typeof UsersThree;
    money?: boolean;
    suffix?: string;
  }[] = [
    {
      key: "total",
      title: "Total leads",
      definition: "Non-archived leads in this cohort",
      icon: UsersThree,
    },
    {
      key: "qualified",
      title: "Qualified leads",
      definition: "Currently in the Qualified stage",
      icon: Target,
    },
    {
      key: "pipeline",
      title: "Active pipeline value",
      definition: "Estimated value, excluding Won and Lost",
      icon: CurrencyInr,
      money: true,
    },
    {
      key: "conversion",
      title: "Lead-to-win rate",
      definition: "Won ÷ all leads in this cohort",
      icon: TrendUp,
      suffix: "%",
    },
  ];
  const trend = aggregateWeeks(data.trend);
  const total = data.metrics.total;
  return (
    <>
      <div className="kpi-grid">
        {cards.map((card, i) => {
          const current = data.metrics[card.key];
          const previous = data.previous[card.key];
          const delta =
            previous && current !== null
              ? Math.round(((current - previous) / previous) * 100)
              : null;
          return (
            <article className="kpi" key={card.key}>
              <div className="kpi-label">
                {card.title}
                <span className={"kpi-icon tone-" + i}>
                  <card.icon size={19} />
                </span>
              </div>
              <div className="kpi-value">
                {current === null
                  ? "—"
                  : card.money
                    ? money(current, currency, true)
                    : current.toLocaleString("en-IN") + (card.suffix || "")}
              </div>
              <div className="kpi-bottom">
                {delta !== null ? (
                  <span className={"trend " + (delta < 0 ? "negative" : "")}>
                    {delta > 0 ? "+" : ""}
                    {delta}% <ArrowUpRight size={12} />
                  </span>
                ) : (
                  <span className="neutral-tag">
                    {total ? "Cohort snapshot" : "No leads yet"}
                  </span>
                )}
                <span>
                  {delta !== null
                    ? "vs. prior cohort"
                    : card.key === "conversion"
                      ? "Won / eligible leads"
                      : "Calculated from records"}
                </span>
              </div>
              <p>{card.definition}</p>
            </article>
          );
        })}
      </div>
      <div className="secondary-kpis">
        {[
          { label: "New inquiries", value: data.metrics.new, color: "blue" },
          {
            label: "Active opportunities",
            value: data.metrics.active,
            color: "teal",
          },
          { label: "Won deals", value: data.metrics.won, color: "green" },
          {
            label: "Overdue follow-ups",
            value: data.metrics.overdue,
            color: "coral",
          },
        ].map((v) => (
          <div key={v.label}>
            <i className={"dot " + v.color} />
            <span>{v.label}</span>
            <strong>{v.value}</strong>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel acquisition">
          <SectionHead
            title="Lead acquisition"
            subtitle="A steady view of incoming opportunities"
          >
            <div className="legend">
              <i className="dot teal" />
              New leads
            </div>
          </SectionHead>
          <div className="chart-summary">
            <strong>{total}</strong>
            <span>leads in selected period</span>
          </div>
          <div
            className="chart"
            role="img"
            aria-label={
              "Lead acquisition chart. " +
              total +
              " leads in the selected period."
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trend}
                margin={{ top: 10, right: 15, left: -25, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="tealArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#599aff" stopOpacity={0.22} />
                    <stop
                      offset="100%"
                      stopColor="#599aff"
                      stopOpacity={0.015}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="#849bc82b"
                  vertical={false}
                  strokeDasharray="3 4"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => date(v)}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={45}
                  tick={{ fontSize: 11, fill: "#a4b8dc" }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#a4b8dc" }}
                />
                <Tooltip
                  labelFormatter={(v) => "Week of " + date(String(v))}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #607cac",
                    background: "#111d38",
                    color: "#eef3ff",
                  }}
                />
                <Area
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="count"
                  name="Leads"
                  stroke="#67cbe8"
                  strokeWidth={2.5}
                  fill="url(#tealArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="panel-foot">
            Weekly totals · {data.trend.length} days · Acquisition date in UTC
          </div>
        </section>
        <section className="panel source-panel">
          <SectionHead
            title="Where leads come from"
            subtitle="Lead volume by recorded source"
          />
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height={177}>
              <PieChart>
                <Pie
                  isAnimationActive={false}
                  data={data.sources}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={78}
                  paddingAngle={3}
                  stroke="none"
                >
                  {data.sources.map((s, i) => (
                    <Cell key={s.name} fill={colors[i % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-label">
              <strong>{total}</strong>
              <span>total leads</span>
            </div>
          </div>
          <div className="source-legend">
            {data.sources.map((s, i) => (
              <div key={s.name}>
                <span>
                  <i className="dot" style={{ background: colors[i] }} />
                  {s.name}
                </span>
                <strong>{s.count}</strong>
                <small>
                  {total ? Math.round((s.count / total) * 100) : 0}%
                </small>
              </div>
            ))}
          </div>
        </section>
        <section className="panel pipeline-overview">
          <SectionHead
            title="Your pipeline at a glance"
            subtitle="Current stages, with estimated opportunity values"
          >
            <TextLink href="/pipeline">View pipeline</TextLink>
          </SectionHead>
          <div className="pipeline-bars">
            {data.stages.map((s, i) => (
              <Link
                href={"/leads?status=" + encodeURIComponent(s.name)}
                className="stage-stat"
                key={s.name}
              >
                <div className="stage-stat-label">
                  <i className="dot" style={{ background: colors[i] }} />
                  <span>{s.name}</span>
                  <strong>{s.count}</strong>
                </div>
                <div className="bar-track">
                  <div
                    style={{
                      width: `${total ? (s.count / total) * 100 : 0}%`,
                      background: colors[i],
                    }}
                  />
                </div>
                <strong className="stage-money">
                  {money(s.value, currency, true)}
                </strong>
              </Link>
            ))}
          </div>
        </section>
        <section className="panel follow-panel">
          <SectionHead
            title="Next on your list"
            subtitle={`${data.followups.today} due today · ${data.followups.overdue} overdue`}
          >
            <TextLink href="/follow-ups">All follow-ups</TextLink>
          </SectionHead>
          {data.tasks.length ? (
            data.tasks.map((task) => (
              <Link
                href={"/leads/" + task.lead_id}
                className="task-line"
                key={task.id}
              >
                <span className="task-circle">
                  <CalendarBlank size={17} />
                </span>
                <div>
                  <strong>{task.title}</strong>
                  <span>{task.lead_name}</span>
                </div>
                <span className="task-date">
                  {date(task.due_at)}
                  <ArrowRight size={13} />
                </span>
              </Link>
            ))
          ) : (
            <Empty
              title="You’re all caught up"
              text="No open follow-ups in this lead cohort."
            />
          )}
        </section>
        <section className="panel activity-panel">
          <SectionHead
            title="Recent activity"
            subtitle="The latest movements in this lead cohort"
          />
          {data.activity.length ? (
            data.activity.slice(0, 5).map((a) => (
              <Link
                href={"/leads/" + a.lead_id}
                className="activity-line"
                key={a.id}
              >
                <span className={"activity-icon " + a.kind}>
                  <CheckCircle size={16} />
                </span>
                <div>
                  <strong>{a.lead_name}</strong>
                  <span>{a.text}</span>
                </div>
                <small>{date(a.created_at)}</small>
              </Link>
            ))
          ) : (
            <Empty />
          )}
        </section>
      </div>
      {analytics && (
        <>
          <div className="analytics-extra">
            <section className="panel">
              <SectionHead
                title="Stage progression"
                subtitle="Milestones and current-stage indicators"
              />
              {data.funnel.map((f, i) => (
                <div className="funnel-row" key={f.name}>
                  <span>{f.name}</span>
                  <div className="bar-track">
                    <div
                      style={{
                        width: `${total ? (f.count / total) * 100 : 0}%`,
                        background: colors[i],
                      }}
                    />
                  </div>
                  <strong>{f.count}</strong>
                </div>
              ))}
              <p className="help">{data.definitions.funnel}</p>
            </section>
            <section className="panel">
              <SectionHead
                title="Value by stage"
                subtitle="Estimated budgets; unknown values count as zero"
              />
              <div className="chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.stages}
                    layout="vertical"
                    margin={{ left: 25, right: 20 }}
                  >
                    <XAxis
                      type="number"
                      tickFormatter={(v) => money(v, currency, true)}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      width={75}
                    />
                    <Tooltip formatter={(v) => money(Number(v), currency)} />
                    <Bar
                      isAnimationActive={false}
                      dataKey="value"
                      radius={[0, 3, 3, 0]}
                    >
                      {data.stages.map((s, i) => (
                        <Cell key={s.name} fill={colors[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
          <div className="summary-strip">
            <div>
              <Clock size={20} />
              <strong>{data.average_qualification_days ?? "—"} days</strong>
              <span>Average time to qualification</span>
            </div>
            <div>
              <CalendarBlank size={20} />
              <strong>{data.average_close_days ?? "—"} days</strong>
              <span>Average time to close (won or lost)</span>
            </div>
            <div>
              <CurrencyInr size={20} />
              <strong>{money(data.metrics.won_value, currency)}</strong>
              <span>Recorded won deal value</span>
            </div>
            <div>
              <CheckCircle size={20} />
              <strong>{data.followups.completion_rate ?? "—"}%</strong>
              <span>Follow-up completion</span>
            </div>
          </div>
          <section className="panel">
            <SectionHead
              title="Source performance"
              subtitle="Current outcomes for the selected acquisition cohort"
            />
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Leads</th>
                    <th>Won</th>
                    <th>Win rate</th>
                    <th>Won value</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sources.map((s) => (
                    <tr key={s.name}>
                      <td>{s.name}</td>
                      <td>{s.count}</td>
                      <td>{s.won}</td>
                      <td>{s.conversion}%</td>
                      <td>{money(s.value, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      <details className="metric-definitions">
        <summary>How these metrics are calculated</summary>
        {Object.entries(data.definitions).map(([key, value]) => (
          <p key={key}>
            <strong>{key}: </strong>
            {value}
          </p>
        ))}
      </details>
    </>
  );
}
function aggregateWeeks(points: { date: string; count: number }[]) {
  const weeks: { date: string; count: number }[] = [];
  points.forEach((p, i) => {
    if (i % 7 === 0) weeks.push({ date: p.date, count: 0 });
    weeks[weeks.length - 1].count += p.count;
  });
  return weeks;
}
