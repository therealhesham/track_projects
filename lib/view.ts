import type { Prisma, ProjectStatus, TaskApprovalStatus, TaskStage } from "@prisma/client";
import { formatShortDate, ymd } from "./calendar";
import { APPROVAL_STATUS_LABEL, STATUS_LABEL } from "./labels";

/**
 * The database rows are shaped for storage; the screens want Arabic labels,
 * percentages and plain date strings. Everything in this module runs on the
 * server, so the client receives values it can render directly — no Date
 * objects crossing the boundary, no locale work in the browser, and no
 * hydration mismatch from relative timestamps.
 */

export const projectInclude = {
  owner: { select: { name: true } },
  tasks: {
    orderBy: { position: "asc" },
    include: {
      assignee: { select: { id: true, name: true } },
      addedBy: { select: { name: true } },
    },
  },
  activity: {
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { user: { select: { name: true } } },
  },
  members: {
    include: {
      user: { select: { id: true, name: true, email: true, department: true } },
    },
    orderBy: { joinedAt: "asc" },
  },
} satisfies Prisma.ProjectInclude;

export type ProjectRow = Prisma.ProjectGetPayload<{
  include: typeof projectInclude;
}>;

export type TaskView = {
  id: string;
  title: string;
  stage: TaskStage;
  done: boolean;
  assignee: string | null;
  assigneeId: string | null;
  addedBy: string | null;
  approvalStatus: TaskApprovalStatus;
  approvalStatusLabel: string;
  completionNote: string | null;
  /** `YYYY-MM-DD`, or null when the stamp is unset. */
  startedDay: string | null;
  completedDay: string | null;
  completionRequestedDay: string | null;
  /** Optional planned start date for the task. */
  startDate: string | null;
  /** Optional planned deadline for the task. */
  dueDate: string | null;
};

/** `who` is null for system-written entries, and for rows logged before the
 *  actor was recorded — the feed has to render both. */
export type ActivityView = { when: string; what: string; who: string | null };

export type MemberView = {
  userId: string;
  name: string;
  email: string;
  department: string | null;
  projectRole: "MANAGER" | "MEMBER";
};

export type ProjectView = {
  id: string;
  name: string;
  kicker: string | null;
  dept: string | null;
  owner: string | null;
  ownerId: string | null;
  githubUrl: string | null;
  status: ProjectStatus;
  statusLabel: string;
  note: string | null;
  startDate: string | null;
  due: string;
  tasks: TaskView[];
  activity: ActivityView[];
  members: MemberView[];
  pct: number;
  doneCount: number;
  total: number;
};

/** Rough Arabic relative time. Computed server-side so it never re-renders wrong. */
function relativeArabic(then: Date, now: Date): string {
  const mins = Math.max(0, Math.round((now.getTime() - then.getTime()) / 60000));
  if (mins < 2) return "الآن";
  if (mins < 60) return `قبل ${mins} دقيقة`;

  const hours = Math.round(mins / 60);
  if (hours < 24) return `قبل ${hours} ${hours <= 10 ? "ساعات" : "ساعة"}`;

  const days = Math.round(hours / 24);
  if (days === 1) return "أمس";
  if (days < 7) return `قبل ${days} أيام`;
  if (days < 14) return "قبل أسبوع";
  if (days < 30) return `قبل ${Math.round(days / 7)} أسابيع`;
  return formatShortDate(ymd(then));
}

export function toProjectView(row: ProjectRow, now: Date): ProjectView {
  const tasks: TaskView[] = row.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    stage: t.stage,
    done: t.approvalStatus === "DONE",
    assignee: t.assignee?.name ?? null,
    assigneeId: t.assignee?.id ?? null,
    addedBy: t.addedBy?.name ?? null,
    approvalStatus: t.approvalStatus,
    approvalStatusLabel: APPROVAL_STATUS_LABEL[t.approvalStatus],
    completionNote: t.completionNote ?? null,
    startedDay: t.startedAt ? ymd(t.startedAt) : null,
    completedDay: t.completedAt ? ymd(t.completedAt) : null,
    completionRequestedDay: t.completionRequestedAt ? ymd(t.completionRequestedAt) : null,
    startDate: t.startDate ? ymd(t.startDate) : null,
    dueDate: t.dueDate ? ymd(t.dueDate) : null,
  }));

  const doneCount = tasks.filter((t) => t.done).length;
  const total = tasks.filter((t) => t.approvalStatus !== "REJECTED").length;

  return {
    id: row.id,
    name: row.name,
    kicker: row.kicker,
    dept: row.department,
    owner: row.owner?.name ?? null,
    ownerId: row.ownerId ?? null,
    githubUrl: row.githubUrl ?? null,
    status: row.status,
    statusLabel: STATUS_LABEL[row.status],
    note: row.note,
    startDate: row.startDate ? ymd(row.startDate) : null,
    due: formatShortDate(row.dueDate ? ymd(row.dueDate) : null),
    tasks,
    activity: row.activity.map((a) => ({
      when: relativeArabic(a.createdAt, now),
      what: a.message,
      who: a.user?.name ?? null,
    })),
    members: row.members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      department: m.user.department,
      projectRole: m.role as "MANAGER" | "MEMBER",
    })),
    pct: total ? Math.round((doneCount / total) * 100) : 0,
    doneCount,
    total,
  };
}

export function metaLine(p: ProjectView): string {
  return [p.dept, p.owner, `التسليم ${p.due}`].filter(Boolean).join(" · ");
}

/** One task crossing into or out of work, for the calendar. */
export type MovementView = {
  day: string;
  kind: "start" | "end";
  taskId: string;
  taskTitle: string;
  projectName: string;
  owner: string | null;
};

export function movementsOf(
  projects: ProjectView[],
  viewer?: { id: string; role: string }
): MovementView[] {
  const out: MovementView[] = [];
  const isSuperAdmin = viewer?.role === "SUPER_ADMIN";

  for (const p of projects) {
    // Is this viewer a MANAGER on this specific project?
    const isManagerOfProject =
      viewer &&
      p.members.some(
        (m) => m.userId === viewer.id && m.projectRole === "MANAGER",
      );

    for (const t of p.tasks) {
      // Super Admin → sees everything
      if (isSuperAdmin) {
        // fall through — include all tasks
      }
      // Manager of this project → sees all tasks in that project
      else if (isManagerOfProject) {
        // fall through — include all tasks in this project
      }
      // Otherwise (Member, or Manager on a different project) → own tasks only
      else if (viewer && t.assigneeId !== viewer.id) {
        continue;
      }

      const base = {
        taskId: t.id,
        taskTitle: t.title,
        projectName: p.name,
        owner: t.assignee ?? p.owner,
      };
      if (t.startedDay) out.push({ ...base, day: t.startedDay, kind: "start" });
      if (t.completedDay) out.push({ ...base, day: t.completedDay, kind: "end" });
    }
  }
  return out;
}
