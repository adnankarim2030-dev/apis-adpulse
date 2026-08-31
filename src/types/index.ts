export type Role = "CEO" | "STAFF";
export type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type ProjectStatus =
  | "PLANNING"
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "ON_HOLD"
  | "AT_RISK"
  | "DELAYED"
  | "COMPLETED"
  | "CANCELLED";
export type TaskStatus = "NOT_STARTED" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED";

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: string | null;
  jobTitle?: string | null;
}

export interface ClientSummary {
  id: string;
  name: string;
  company?: string | null;
}

export interface ProjectListItem {
  id: string;
  name: string;
  code: string;
  status: ProjectStatus;
  priority: Priority;
  progressPercent: number;
  expectedCompletionDate: string | Date | null;
  department: string | null;
  client: ClientSummary | null;
  projectManager: { id: string; name: string } | null;
  _count: { tasks: number; members: number };
}

export interface TaskListItem {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | Date | null;
  progressPercent: number;
  projectId: string;
  project?: { id: string; name: string; code: string };
  assignedTo?: { id: string; name: string } | null;
}

export interface CeoDashboardData {
  kpis: {
    totalActiveProjects: number;
    completedProjects: number;
    atRiskProjects: number;
    overdueProjects: number;
    dueToday: number;
    dueThisWeek: number;
    totalStaff: number;
    activeStaff: number;
    pendingTasks: number;
    completedTasks: number;
  };
  projects: ProjectListItem[];
}

export interface StaffDashboardData {
  counts: {
    dueToday: number;
    overdue: number;
    upcoming: number;
    completed: number;
  };
  tasks: TaskListItem[];
}
