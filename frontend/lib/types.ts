export const stages = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal Sent",
  "Negotiation",
  "Won",
  "Lost",
];
export const sources = ["Website", "Referral", "Email", "Social", "Other"];
export const services = [
  "Website development",
  "E-commerce solutions",
  "AI automation",
  "Business analytics",
  "Customer support chatbots",
  "Custom software development",
];
export type Qualification = {
  score: number;
  category: string;
  missing: string[];
  next_action: string;
  mode: string;
  disclaimer: string;
  factors: { name: string; points: number; max: number; reason: string }[];
};
export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  service: string;
  message: string;
  source: string;
  budget: number | null;
  currency: string;
  status: string;
  assigned_to: string;
  tags: string[];
  score: number;
  qualification: Qualification;
  archived: boolean;
  created_at: string;
  updated_at: string;
  last_contacted: string | null;
  closed_at: string | null;
  final_value: number | null;
  loss_reason: string;
  tasks?: Task[];
  notes?: Note[];
  drafts?: Draft[];
  activity?: Activity[];
};
export type Task = {
  id: string;
  lead_id: string;
  lead_name?: string;
  title: string;
  notes: string;
  assigned_to: string;
  due_at: string;
  completed: boolean;
};
export type Note = {
  id: string;
  body: string;
  author: string;
  created_at: string;
};
export type Draft = {
  id: string;
  lead_id: string;
  body: string;
  tone: string;
  kind: string;
  approved: boolean;
  mode: string;
};
export type Activity = {
  id: string;
  lead_id: string;
  lead_name?: string;
  text: string;
  created_at: string;
  kind: string;
};
export type Session = {
  csrf: string;
  workspace: {
    id: string;
    name: string;
    currency: string;
    timezone: string;
    is_demo: boolean;
    high_threshold: number;
    auto_task: boolean;
  };
  user: { name: string; role: string };
  ai_mode: string;
};
export type LeadPage = {
  items: Lead[];
  total: number;
  page: number;
  size: number;
};
export type Metrics = {
  total: number;
  new: number;
  qualified: number;
  active: number;
  won: number;
  conversion: number | null;
  pipeline: number;
  overdue: number;
  won_value: number;
};
export type Analytics = {
  metrics: Metrics;
  previous: Metrics;
  trend: { date: string; count: number }[];
  stages: { name: string; count: number; value: number }[];
  sources: {
    name: string;
    count: number;
    won: number;
    conversion: number;
    value: number;
  }[];
  funnel: { name: string; count: number }[];
  followups: {
    total: number;
    completed: number;
    today: number;
    overdue: number;
    completion_rate: number | null;
  };
  tasks: Task[];
  activity: Activity[];
  average_qualification_days: number | null;
  average_close_days: number | null;
  definitions: Record<string, string>;
};
