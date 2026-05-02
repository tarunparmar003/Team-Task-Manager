export type Role = 'ADMIN' | 'MEMBER';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type Status = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  role: Role;
  memberCount: number;
  taskCount: number;
  createdAt: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  joinedAt: string;
}

export interface ProjectDetail {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  myRole: Role;
  taskCount: number;
  members: Member[];
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: Priority;
  status: Status;
  assignedToId: string | null;
  assignedTo: { id: string; name: string; email: string } | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardGlobal {
  totalTasks: number;
  byStatus: Record<Status, number>;
  myAssignedTasks: number;
  overdueTasks: number;
}

export interface DashboardProject {
  totalTasks: number;
  byStatus: Record<Status, number>;
  overdueTasks: number;
  tasksPerUser: Array<{
    user: { id: string; name: string; email: string } | null;
    count: number;
  }>;
}
