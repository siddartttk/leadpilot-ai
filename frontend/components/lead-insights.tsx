"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  ChartDonut,
  Target,
  ClockCounterClockwise,
  CalendarCheck,
  ArrowUpRight,
} from "@phosphor-icons/react";
import { api, money, date, initials } from "@/lib/api";
import type { Analytics, LeadPage } from "@/lib/types";
import { Loading, ErrorState, Empty, SectionHead, Score } from "./ui";

export const intelligenceColors = [
  "#55cddd",
  "#5a96ff",
  "#a092ec",
  "#dcad67",
  "#dc87b5",
  "#7fcfb5",
  "#9ea9c5",
];
export function LeadSummary({
  data,
  currency,
}: {
  data: Analytics;
  currency: string;
}) {
  const values = [
    {
      label: "Total leads",
      value: data.metrics.total.toLocaleString("en-IN"),
      note: "Eligible inquiries",
    },
    {
      label: "New leads",
      value: data.metrics.new.toLocaleString("en-IN"),
      note: "Ready for a first response",
    },
    {
      label: "Qualified leads",
      value: data.metrics.qualified.toLocaleString("en-IN"),
      note: "Current qualified stage",
    },
    {
      label: "Lead-to-win rate",
      value:
        data.metrics.conversion === null ? "—" : data.metrics.conversion + "%",
      note: "Won / eligible inquiries",
    },
    {
      label: "Active pipeline",
      value: money(data.metrics.pipeline, currency, true),
      note: "Recorded estimated value",
    },
    {
      label: "Won deals",
      value: data.metrics.won.toLocaleString("en-IN"),
      note: "Closed as won",
    },
  ];
  return (
    <>
      <div className="leads-period-label">
        <span>
          <i className="live-dot" />
          Workspace performance
        </span>
        <small>Last 12 months · all sources · non-archived leads</small>
      </div>
      <div className="lead-summary-grid">
        {values.map((v, i) => (
          <article className={"overview-stat stat-" + i} key={v.label}>
            <div>
              <strong>{v.value}</strong>
              <span>{v.label}</span>
            </div>
            <p>{v.note}</p>
          </article>
        ))}
      </div>
    </>
  );
}
export function LeadIntelligence({
  data,
  currency,
}: {
  data: Analytics;
  currency: string;
}) {
  const priority = useQuery({
    queryKey: ["priority-leads"],
    queryFn: () => api<LeadPage>("/leads?size=6&sort=score&active=true"),
  });
  return (
    <aside className="lead-intelligence">
      <section className="panel intel-sources">
        <SectionHead
          title="Lead sources"
          subtitle="Volume in the 12-month cohort"
        >
          <ChartDonut size={21} />
        </SectionHead>
        {data.metrics.total ? (
          <>
            <div className="donut-wrap">
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie
                    isAnimationActive={false}
                    data={data.sources}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={61}
                    outerRadius={84}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {data.sources.map((s, i) => (
                      <Cell key={s.name} fill={intelligenceColors[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#111d38",
                      border: "1px solid #465878",
                      borderRadius: 8,
                      color: "#eef3ff",
                    }}
                    itemStyle={{ color: "#eef3ff" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-label">
                <strong>{data.metrics.total}</strong>
                <span>inquiries</span>
              </div>
            </div>
            <div className="source-legend">
              {data.sources.map((s, i) => (
                <div key={s.name}>
                  <span>
                    <i
                      className="dot"
                      style={{ background: intelligenceColors[i] }}
                    />
                    {s.name}
                  </span>
                  <strong>{s.count}</strong>
                  <small>
                    {Math.round((s.count / data.metrics.total) * 100)}%
                  </small>
                </div>
              ))}
            </div>
          </>
        ) : (
          <Empty
            title="No source data yet"
            text="Incoming inquiries will build this view."
          />
        )}
      </section>
      <section className="panel priority-panel">
        <SectionHead
          title="Priority review"
          subtitle="Highest scores across active leads"
        >
          <Target size={21} />
        </SectionHead>
        {priority.isPending ? (
          <Loading />
        ) : priority.error ? (
          <ErrorState error={priority.error} />
        ) : priority.data.items.length ? (
          <>
            <div className="priority-list">
              {priority.data.items.map((lead, i) => (
                <Link
                  href={"/leads/" + lead.id}
                  className="priority-lead"
                  key={lead.id}
                >
                  <div className="priority-contact">
                    <span className={"avatar color-" + (i % 5)}>
                      {initials(lead.name)}
                    </span>
                    <div>
                      <strong>{lead.company || lead.name}</strong>
                      <small>{lead.name}</small>
                    </div>
                    <ArrowUpRight size={14} />
                  </div>
                  <div className="priority-score">
                    <span>Qualification</span>
                    <Score value={lead.score} />
                  </div>
                  <div className="score-track">
                    <i style={{ width: lead.score + "%" }} />
                  </div>
                  <div className="priority-value">
                    <span>{lead.assigned_to}</span>
                    <strong>{money(lead.budget, currency, true)}</strong>
                  </div>
                </Link>
              ))}
            </div>
            <p className="help">
              Business qualification scores. Review scope and missing details
              before prioritizing outreach.
            </p>
          </>
        ) : (
          <Empty
            title="Your next opportunity starts here"
            text="Add an inquiry to see its qualification."
          />
        )}
      </section>
    </aside>
  );
}
export function LeadActivity({ data }: { data: Analytics }) {
  return (
    <div className="lead-activity-grid">
      <section className="panel lead-recent-activity">
        <SectionHead
          title="Lead activity"
          subtitle="Recent changes in the 12-month cohort"
        >
          <ClockCounterClockwise size={20} />
        </SectionHead>
        {data.activity.length ? (
          data.activity.slice(0, 4).map((a) => (
            <Link
              href={"/leads/" + a.lead_id}
              className="intel-activity"
              key={a.id}
            >
              <span className="timeline-dot" />
              <div>
                <strong>{a.lead_name}</strong>
                <p>{a.text}</p>
                <small>{date(a.created_at, true)}</small>
              </div>
            </Link>
          ))
        ) : (
          <Empty
            title="A fresh workspace"
            text="Lead activity will appear as you work."
          />
        )}
      </section>
      <section className="panel lead-next-steps">
        <SectionHead
          title="Next conversations"
          subtitle={`${data.followups.today} due today · ${data.followups.overdue} overdue`}
        >
          <CalendarCheck size={20} />
        </SectionHead>
        {data.tasks.length ? (
          data.tasks.slice(0, 4).map((t) => (
            <Link
              href={"/leads/" + t.lead_id}
              className="intel-task"
              key={t.id}
            >
              <span className="task-circle">
                <CalendarCheck size={16} />
              </span>
              <div>
                <strong>{t.title}</strong>
                <small>{t.lead_name}</small>
              </div>
              <span>{date(t.due_at)}</span>
            </Link>
          ))
        ) : (
          <Empty
            title="You’re all caught up"
            text="No open tasks in this acquisition cohort."
          />
        )}
        <Link className="text-link" href="/follow-ups">
          Manage follow-ups <ArrowUpRight size={14} />
        </Link>
      </section>
    </div>
  );
}
