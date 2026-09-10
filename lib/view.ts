import type {
  Prisma,
  ProjectRole,
  ProjectStatus,
  TaskApprovalStatus,
  TaskStage,
  UserRole,
} from "@prisma/client";
import { formatLongDate, formatShortDate, ymd } from "./calendar";
import { APPROVAL_STATUS_LABEL, STATUS_LABEL } from "./labels";
import { openSubtaskCount, ROLE_LABEL } from "./permissions";

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
      subtasks: {
        orderBy: { position: "asc" },
        include: {
          assignee: { select: { id: true, name: true } },
          addedBy: { select: { name: true } },
        },
      },
    },
  },
  activity: {
    orderBy: { createdAt: "desc" },
    // The project page gives this a tab of its own, which can hold a real
    // history rather than the handful a sidebar card had room for. Still
    // capped: the feed is append-only and grows without limit. Surfaces that
    // only want a summary — the dashboard panel — slice what they need.
    take: 50,
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

/** One step of a task. Carries the parent's lifecycle, minus a `startDate`. */
export type SubtaskView = {
  id: string;
  taskId: string;
  title: string;
  done: boolean;
  assignee: string | null;
  assigneeId: string | null;
  addedBy: string | null;
  addedById: string | null;
  approvalStatus: TaskApprovalStatus;
  approvalStatusLabel: string;
  completionNote: string | null;
  startedDay: string | null;
  completedDay: string | null;
  /** Optional deadline for this step alone. */
  dueDate: string | null;
};

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
  /** The task's steps, in order. */
  subtasks: SubtaskView[];
  /**
   * How the steps stand: `subtaskTotal` excludes turned-away ones, the same way
   * `ProjectView.total` excludes turned-away tasks. Both zero when a task has no
   * steps, which is what the UI checks before showing a counter at all.
   */
  subtaskDone: number;
  subtaskTotal: number;
  /** Steps still open, which is what holds a completion request back. */
  openSubtasks: number;
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
  const tasks: TaskView[] = row.tasks.map((t) => {
    const subtasks: SubtaskView[] = t.subtasks.map((s) => ({
      id: s.id,
      taskId: s.taskId,
      title: s.title,
      done: s.approvalStatus === "DONE",
      assignee: s.assignee?.name ?? null,
      assigneeId: s.assignee?.id ?? null,
      addedBy: s.addedBy?.name ?? null,
      addedById: s.addedById ?? null,
      approvalStatus: s.approvalStatus,
      approvalStatusLabel: APPROVAL_STATUS_LABEL[s.approvalStatus],
      completionNote: s.completionNote ?? null,
      startedDay: s.startedAt ? ymd(s.startedAt) : null,
      completedDay: s.completedAt ? ymd(s.completedAt) : null,
      dueDate: s.dueDate ? ymd(s.dueDate) : null,
    }));

    return {
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
      subtasks,
      subtaskDone: subtasks.filter((s) => s.done).length,
      subtaskTotal: subtasks.filter((s) => s.approvalStatus !== "REJECTED").length,
      openSubtasks: openSubtaskCount(subtasks),
    };
  });

  const doneCount = tasks.filter((t) => t.done).length;
  const total = tasks.filter((t) => t.approvalStatus !== "REJECTED").length;

  // The tasks are the real answer, and they win the moment there are any. A
  // project with none would read 0%, which is worse than wrong — it is
  // plausible — so there `Project.progressPct` stands in, carrying the figure
  // for imported work whose history was never entered as tasks. Entering the
  // first task hands the percentage back to the count on its own; the stated
  // figure never has to be cleared by hand, and never masks a real tally.
  const pct =
    total > 0
      ? Math.round((doneCount / total) * 100)
      : Math.min(100, Math.max(0, row.progressPct ?? 0));

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
    pct,
    doneCount,
    total,
  };
}

// ── Daily tasks ─────────────────────────────────────────────────────────────

export const dailyTaskInclude = {
  owner: { select: { id: true, name: true } },
  addedBy: { select: { name: true } },
} satisfies Prisma.DailyTaskInclude;

export type DailyTaskRow = Prisma.DailyTaskGetPayload<{
  include: typeof dailyTaskInclude;
}>;

export type DailyTaskView = {
  id: string;
  title: string;
  note: string | null;
  /** `YYYY-MM-DD` — the day the task is planned for. Never null. */
  day: string;
  dayLabel: string;
  ownerId: string;
  owner: string;
  addedBy: string | null;
  approvalStatus: TaskApprovalStatus;
  approvalStatusLabel: string;
  completionNote: string | null;
  done: boolean;
  startedDay: string | null;
  completedDay: string | null;
};

export function toDailyTaskView(row: DailyTaskRow): DailyTaskView {
  return {
    id: row.id,
    title: row.title,
    note: row.note,
    day: ymd(row.day),
    dayLabel: formatShortDate(ymd(row.day)),
    ownerId: row.ownerId,
    owner: row.owner.name,
    addedBy: row.addedBy?.name ?? null,
    approvalStatus: row.approvalStatus,
    approvalStatusLabel: APPROVAL_STATUS_LABEL[row.approvalStatus],
    completionNote: row.completionNote,
    done: row.approvalStatus === "DONE",
    startedDay: row.startedAt ? ymd(row.startedAt) : null,
    completedDay: row.completedAt ? ymd(row.completedAt) : null,
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

// ── Users ───────────────────────────────────────────────────────────────────

/**
 * A `select`, deliberately, where the rest of this module uses `include`:
 * `include` would carry every scalar on the row — `passwordHash` among them —
 * into props that reach the browser. Listing the fields keeps the hash where it
 * belongs.
 */
export const userCardSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  isActive: true,
  createdAt: true,
  ownedProjects: {
    select: { id: true, name: true, kicker: true, status: true },
  },
  memberships: {
    select: {
      role: true,
      project: { select: { id: true, name: true, kicker: true, status: true } },
    },
    orderBy: { joinedAt: "asc" },
  },
  // Read for the per-project tallies below, so the counting happens here rather
  // than in a query per user per project.
  assignedTasks: {
    select: {
      approvalStatus: true,
      project: { select: { id: true, name: true, kicker: true, status: true } },
    },
  },
} satisfies Prisma.UserSelect;

export type UserCardRow = Prisma.UserGetPayload<{
  select: typeof userCardSelect;
}>;

/** One project as it appears under a person: how they are attached, and what
 *  of it is theirs. */
export type UserProjectView = {
  id: string;
  name: string;
  kicker: string | null;
  status: ProjectStatus;
  statusLabel: string;
  /** The accountable owner — "المسؤول" on the projects table. */
  isOwner: boolean;
  /** Their role on the membership, or null if they only carry tasks here. */
  projectRole: ProjectRole | null;
  relationLabel: string;
  /** Tasks assigned to *this* person on this project, rejected ones excluded. */
  taskTotal: number;
  taskDone: number;
  pct: number;
};

export type UserCardView = {
  id: string;
  name: string;
  /** Up to two letters for the avatar square. */
  initials: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  department: string | null;
  isActive: boolean;
  joined: string;
  projects: UserProjectView[];
  /** Across every project: what this person carries, and how much is done. */
  taskTotal: number;
  taskDone: number;
  pct: number;
};

/** Owner first, then the projects they run, then the rest. */
const RELATION_RANK = { owner: 0, MANAGER: 1, MEMBER: 2, none: 3 } as const;

function relationOf(p: UserProjectView) {
  if (p.isOwner) return "owner" as const;
  return p.projectRole ?? ("none" as const);
}

const RELATION_LABEL: Record<keyof typeof RELATION_RANK, string> = {
  owner: "المسؤول",
  MANAGER: "مدير المشروع",
  MEMBER: "عضو",
  none: "مكلَّف بمهام",
};

export function toUserCardView(row: UserCardRow): UserCardView {
  // A person reaches a project three ways — owning it, being a member of it, or
  // merely carrying a task on it — and the three overlap. Collect them into one
  // entry per project so nothing is listed twice.
  const byProject = new Map<string, UserProjectView>();

  const entryFor = (p: {
    id: string;
    name: string;
    kicker: string | null;
    status: ProjectStatus;
  }) => {
    let entry = byProject.get(p.id);
    if (!entry) {
      entry = {
        id: p.id,
        name: p.name,
        kicker: p.kicker,
        status: p.status,
        statusLabel: STATUS_LABEL[p.status],
        isOwner: false,
        projectRole: null,
        relationLabel: "",
        taskTotal: 0,
        taskDone: 0,
        pct: 0,
      };
      byProject.set(p.id, entry);
    }
    return entry;
  };

  for (const p of row.ownedProjects) entryFor(p).isOwner = true;
  for (const m of row.memberships) entryFor(m.project).projectRole = m.role;

  for (const t of row.assignedTasks) {
    const entry = entryFor(t.project);
    // Same rule as toProjectView: a turned-away task is not work anyone owes.
    if (t.approvalStatus === "REJECTED") continue;
    entry.taskTotal += 1;
    if (t.approvalStatus === "DONE") entry.taskDone += 1;
  }

  const projects = [...byProject.values()]
    .map((p) => ({
      ...p,
      relationLabel: RELATION_LABEL[relationOf(p)],
      pct: p.taskTotal ? Math.round((p.taskDone / p.taskTotal) * 100) : 0,
    }))
    .sort(
      (a, b) =>
        RELATION_RANK[relationOf(a)] - RELATION_RANK[relationOf(b)] ||
        a.name.localeCompare(b.name, "ar"),
    );

  const taskTotal = projects.reduce((n, p) => n + p.taskTotal, 0);
  const taskDone = projects.reduce((n, p) => n + p.taskDone, 0);

  return {
    id: row.id,
    name: row.name,
    initials: row.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => [...word][0])
      .join("")
      // A no-op on Arabic, which has no case; Latin names read better in caps.
      .toUpperCase(),
    email: row.email,
    role: row.role,
    roleLabel: ROLE_LABEL[row.role],
    department: row.department,
    isActive: row.isActive,
    joined: formatLongDate(ymd(row.createdAt)),
    projects,
    taskTotal,
    taskDone,
    pct: taskTotal ? Math.round((taskDone / taskTotal) * 100) : 0,
  };
}
