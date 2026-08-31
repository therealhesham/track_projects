"use server";

import { revalidatePath } from "next/cache";
import { signOut } from "@/auth";
import type { TaskApprovalStatus, TaskStage, ProjectRole, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { nextStage } from "@/lib/labels";
import {
  sendCompletionReviewEmail,
  sendMemberInviteEmail,
  sendNewUserWelcomeEmail,
} from "@/lib/email";
import {
  canAddTask,
  canApproveTask,
  canCreateProject,
  canDeleteTask,
  canEditProject,
  canManageMembers,
  canManageUsers,
  canMoveTask,
  canRequestCompletion,
  canReviewCompletion,
} from "@/lib/permissions";
import { requireViewer } from "@/lib/session";

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

// ── Authorisation ────────────────────────────────────────────────────────────

/**
 * Every action below runs on a request the browser could have forged by hand —
 * hiding a button in the UI grants nothing. So each one starts here: who is
 * calling, and what is their standing on *this* project.
 *
 * The two axes are the ones in lib/permissions: the account-wide role from the
 * session, and the per-project role from the membership row. Both are read from
 * the server; nothing the caller sends is trusted for identity.
 */
const DENIED = "لا تملك صلاحية للقيام بهذا الإجراء" as const;

/** The signed-in user plus their ProjectRole on `projectId`, or null if none. */
async function viewerOn(projectId: string) {
  const viewer = await requireViewer();
  const membership = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: viewer.id, projectId } },
    select: { role: true },
  });
  return { viewer, membership: membership?.role ?? null };
}

/** Same, resolved from a task rather than a project. */
async function viewerOnTask(taskId: string) {
  const viewer = await requireViewer();
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      projectId: true,
      title: true,
      approvalStatus: true,
      assigneeId: true,
      stage: true,
      startedAt: true,
      completedAt: true,
    },
  });
  if (!task) return { viewer, task: null, membership: null };

  const membership = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: viewer.id, projectId: task.projectId } },
    select: { role: true },
  });
  return { viewer, task, membership: membership?.role ?? null };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Keep a task's timestamps consistent with the column it sits in:
 * back to NEW clears both stamps, any working column starts the clock if it was
 * not already running, and only DONE carries a completion stamp.
 */
function stampsFor(
  stage: TaskStage,
  current: { startedAt: Date | null; completedAt: Date | null },
) {
  if (stage === "NEW") return { startedAt: null, completedAt: null };
  return {
    startedAt: current.startedAt ?? new Date(),
    completedAt: stage === "DONE" ? (current.completedAt ?? new Date()) : null,
  };
}

async function moveTask(taskId: string, stage: TaskStage) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, startedAt: true, completedAt: true },
  });
  if (!task) return;

  await prisma.task.update({
    where: { id: taskId },
    data: { stage, ...stampsFor(stage, task) },
  });
  revalidatePath("/");
}

// ── Board actions (existing) ─────────────────────────────────────────────────

/** Checkbox toggle in the detail panel: done ↔ in-progress (legacy). */
export async function toggleTask(taskId: string) {
  const { viewer, task, membership } = await viewerOnTask(taskId);
  if (!task) return;
  if (!canMoveTask(viewer, membership)) return;
  await moveTask(taskId, task.stage === "DONE" ? "IN_PROGRESS" : "DONE");
}

/** Board card click: advance one column, wrapping past the last back to NEW. */
export async function advanceTask(taskId: string) {
  const { viewer, task, membership } = await viewerOnTask(taskId);
  if (!task) return;
  if (!canMoveTask(viewer, membership)) return;
  await moveTask(taskId, nextStage(task.stage));
}

// ── Project creation (existing) ──────────────────────────────────────────────

export type CreateProjectResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type CreateProjectInput = {
  name: string;
  kicker?: string;
  dept?: string;
  due?: string;
  note?: string;
  ownerId?: string;
  githubUrl?: string;
  members?: { userId: string; role: "MANAGER" | "MEMBER" }[];
  tasks?: { title: string; assigneeId?: string }[];
};

export async function createProject(
  input: CreateProjectInput,
): Promise<CreateProjectResult> {
  const viewer = await requireViewer();
  if (!canCreateProject(viewer)) return { ok: false, error: DENIED };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "اسم المشروع مطلوب" };

  const dueStr = (input.due || "").trim();
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(dueStr)
    ? new Date(`${dueStr}T12:00:00`)
    : null;

  // Build members list, ensuring owner is included as MANAGER if provided
  const memberMap = new Map<string, "MANAGER" | "MEMBER">();
  if (input.members) {
    for (const m of input.members) {
      if (m.userId) memberMap.set(m.userId, m.role);
    }
  }
  if (input.ownerId) {
    memberMap.set(input.ownerId, "MANAGER");
  }
  // A non-super-admin creator who left themselves off the list would lose the
  // project the moment it exists — projectScope only reaches what you joined.
  if (viewer.role !== "SUPER_ADMIN" && !memberMap.has(viewer.id)) {
    memberMap.set(viewer.id, "MANAGER");
  }

  const membersCreate = Array.from(memberMap.entries()).map(([userId, role]) => ({
    userId,
    role,
  }));

  // Build tasks list
  const validTasks = (input.tasks || [])
    .map((t) => ({ title: t.title.trim(), assigneeId: t.assigneeId || null }))
    .filter((t) => t.title.length > 0);

  const tasksCreate = validTasks.map((t, position) => ({
    title: t.title,
    stage: "NEW" as TaskStage,
    position,
    approvalStatus: "ACTIVE" as TaskApprovalStatus,
    assigneeId: t.assigneeId,
    addedById: viewer.id,
  }));

  const project = await prisma.project.create({
    data: {
      name,
      kicker: input.kicker?.trim() || "مشروع مضاف",
      department: input.dept?.trim() || null,
      githubUrl: input.githubUrl?.trim() || null,
      status: "PLANNING",
      note: input.note?.trim() || null,
      dueDate: parsedDate,
      ownerId: input.ownerId || null,
      members: membersCreate.length > 0 ? { create: membersCreate } : undefined,
      tasks: tasksCreate.length > 0 ? { create: tasksCreate } : undefined,
      activity: {
        create: [
          {
            message:
              tasksCreate.length > 0
                ? `تم إنشاء المشروع وإضافة ${tasksCreate.length} مهام أولية`
                : "تم إنشاء المشروع",
            userId: viewer.id,
          },
        ],
      },
    },
    select: { id: true },
  });

  revalidatePath("/");
  return { ok: true, id: project.id };
}

// ── Task CRUD ────────────────────────────────────────────────────────────────

export type TaskActionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Add a task to a project (manager or member).
 * The task starts as PENDING_APPROVAL — a super-admin must approve it before
 * it becomes visible to the team as ACTIVE.
 */
export async function addTask(input: {
  projectId: string;
  title: string;
  assigneeId?: string;
  startDate?: string | null;
  dueDate?: string | null;
}): Promise<TaskActionResult> {
  const { viewer, membership } = await viewerOn(input.projectId);
  if (!canAddTask(viewer, membership)) return { ok: false, error: DENIED };

  const title = input.title.trim();
  if (!title) return { ok: false, error: "عنوان المهمة مطلوب" };

  const maxPos = await prisma.task.aggregate({
    where: { projectId: input.projectId },
    _max: { position: true },
  });

  await prisma.task.create({
    data: {
      projectId: input.projectId,
      title,
      stage: "NEW",
      position: (maxPos._max.position ?? -1) + 1,
      assigneeId: input.assigneeId || null,
      addedById: viewer.id,
      approvalStatus: "PENDING_APPROVAL",
      startDate: input.startDate ? new Date(input.startDate) : null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: input.projectId,
      userId: viewer.id,
      message: `تمت إضافة مهمة جديدة: "${title}" — في انتظار الاعتماد`,
    },
  });

  revalidatePath("/");
  revalidatePath(`/projects/${input.projectId}`);
  return { ok: true };
}


/**
 * Super-admin approves a pending task → ACTIVE.
 */
export async function approveTask(taskId: string): Promise<TaskActionResult> {
  const { viewer, task } = await viewerOnTask(taskId);
  if (!canApproveTask(viewer)) return { ok: false, error: DENIED };
  if (!task) return { ok: false, error: "المهمة غير موجودة" };
  if (task.approvalStatus !== "PENDING_APPROVAL")
    return { ok: false, error: "المهمة ليست في انتظار الاعتماد" };

  await prisma.task.update({
    where: { id: taskId },
    data: { approvalStatus: "ACTIVE" as TaskApprovalStatus },
  });

  await prisma.activityLog.create({
    data: {
      projectId: task.projectId,
      userId: viewer.id,
      message: `تم اعتماد المهمة: "${task.title}"`,
    },
  });

  revalidatePath("/");
  revalidatePath(`/projects/${task.projectId}`);
  return { ok: true };
}

/**
 * Super-admin rejects a pending task → REJECTED.
 */
export async function rejectTask(taskId: string): Promise<TaskActionResult> {
  const { viewer, task } = await viewerOnTask(taskId);
  if (!canApproveTask(viewer)) return { ok: false, error: DENIED };
  if (!task) return { ok: false, error: "المهمة غير موجودة" };
  if (task.approvalStatus !== "PENDING_APPROVAL")
    return { ok: false, error: "المهمة ليست في انتظار الاعتماد" };

  await prisma.task.update({
    where: { id: taskId },
    data: { approvalStatus: "REJECTED" as TaskApprovalStatus },
  });

  await prisma.activityLog.create({
    data: {
      projectId: task.projectId,
      userId: viewer.id,
      message: `تم رفض المهمة: "${task.title}"`,
    },
  });

  revalidatePath("/");
  revalidatePath(`/projects/${task.projectId}`);
  return { ok: true };
}

/**
 * Assignee requests completion of their task → PENDING_COMPLETION.
 */
export async function requestCompletion(
  taskId: string,
  note?: string,
): Promise<TaskActionResult> {
  const { viewer, task } = await viewerOnTask(taskId);
  if (!task) return { ok: false, error: "المهمة غير موجودة" };
  if (!canRequestCompletion(viewer, task.assigneeId))
    return { ok: false, error: DENIED };
  if (task.approvalStatus !== "ACTIVE")
    return { ok: false, error: "المهمة غير نشطة" };

  await prisma.task.update({
    where: { id: taskId },
    data: {
      approvalStatus: "PENDING_COMPLETION" as TaskApprovalStatus,
      completionNote: note?.trim() || null,
      completionRequestedAt: new Date(),
      stage: "REVIEW",
      startedAt: task.startedAt ?? new Date(),
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: task.projectId,
      userId: viewer.id,
      message: `طلب تسجيل إتمام المهمة: "${task.title}"`,
    },
  });

  await notifyManagersOfCompletionRequest({
    projectId: task.projectId,
    taskTitle: task.title,
    requestedById: viewer.id,
    requestedByName: viewer.name,
    note: note?.trim() || null,
  });

  revalidatePath("/");
  revalidatePath(`/projects/${task.projectId}`);
  return { ok: true };
}

/**
 * Email every manager of the project — and its owner, the "المسؤول" shown on
 * the projects table — that a task is waiting on them.
 *
 * Delivery is best-effort: the request itself has already been recorded, and a
 * bounced notification must not make the member think their click failed. The
 * board still shows the task under PENDING_COMPLETION either way.
 */
async function notifyManagersOfCompletionRequest(input: {
  projectId: string;
  taskTitle: string;
  requestedById: string;
  requestedByName: string;
  note: string | null;
}) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: {
        name: true,
        owner: { select: { id: true, name: true, email: true } },
        members: {
          // Whoever can sign this off — canReviewCompletion in lib/permissions
          // grants that to a project MANAGER. Super admins can approve too but
          // are not mailed: they oversee every project and would drown.
          where: { role: "MANAGER" },
          select: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    if (!project) return;

    const managers = project.members.map((m) => m.user);
    // The owner is expected to also hold a MANAGER membership (see the
    // schema's note on Project.ownerId), so this is usually a no-op dedupe —
    // but the database cannot enforce that, so guard it here too.
    const withOwner =
      project.owner && !managers.some((u) => u.id === project.owner!.id)
        ? [...managers, project.owner]
        : managers;

    // A manager reporting their own task does not need to mail themselves.
    const recipients = withOwner.filter((u) => u.id !== input.requestedById);

    if (recipients.length === 0) {
      console.warn(
        `[email] task "${input.taskTitle}" awaits approval but project ${input.projectId} has no manager to notify`,
      );
      return;
    }

    await Promise.all(
      recipients.map((u) =>
        sendCompletionReviewEmail({
          to: u.email,
          managerName: u.name,
          taskTitle: input.taskTitle,
          projectName: project.name,
          projectId: input.projectId,
          requestedByName: input.requestedByName,
          note: input.note,
        }),
      ),
    );
  } catch (err) {
    console.error("[email] completion-review notification failed:", err);
  }
}

/**
 * Manager approves completion → DONE.
 */
export async function approveCompletion(taskId: string): Promise<TaskActionResult> {
  const { viewer, task, membership } = await viewerOnTask(taskId);
  if (!canReviewCompletion(viewer, membership))
    return { ok: false, error: DENIED };
  if (!task) return { ok: false, error: "المهمة غير موجودة" };
  if (task.approvalStatus !== "PENDING_COMPLETION")
    return { ok: false, error: "المهمة ليست في انتظار موافقة الإتمام" };

  const now = new Date();
  await prisma.task.update({
    where: { id: taskId },
    data: {
      approvalStatus: "DONE" as TaskApprovalStatus,
      stage: "DONE",
      managerApprovedAt: now,
      completedAt: now,
      startedAt: task.startedAt ?? now,
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: task.projectId,
      userId: viewer.id,
      message: `تمت الموافقة على إتمام المهمة: "${task.title}"`,
    },
  });

  revalidatePath("/");
  revalidatePath(`/projects/${task.projectId}`);
  return { ok: true };
}

/**
 * Manager rejects completion — task returns to ACTIVE.
 */
export async function rejectCompletion(taskId: string): Promise<TaskActionResult> {
  const { viewer, task, membership } = await viewerOnTask(taskId);
  if (!canReviewCompletion(viewer, membership))
    return { ok: false, error: DENIED };
  if (!task) return { ok: false, error: "المهمة غير موجودة" };
  if (task.approvalStatus !== "PENDING_COMPLETION")
    return { ok: false, error: "المهمة ليست في انتظار موافقة الإتمام" };

  await prisma.task.update({
    where: { id: taskId },
    data: {
      approvalStatus: "ACTIVE" as TaskApprovalStatus,
      stage: "IN_PROGRESS",
      completionNote: null,
      completionRequestedAt: null,
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: task.projectId,
      userId: viewer.id,
      message: `تم رفض إتمام المهمة، وأُعيدت للعمل: "${task.title}"`,
    },
  });

  revalidatePath("/");
  revalidatePath(`/projects/${task.projectId}`);
  return { ok: true };
}

/**
 * Deletes a task outright. A super admin may do this anywhere; a project's
 * own manager may do it within that project.
 */
export async function deleteTask(taskId: string): Promise<TaskActionResult> {
  const { viewer, task, membership } = await viewerOnTask(taskId);
  if (!canDeleteTask(viewer, membership)) return { ok: false, error: DENIED };
  if (!task) return { ok: false, error: "المهمة غير موجودة" };

  await prisma.task.delete({ where: { id: taskId } });

  await prisma.activityLog.create({
    data: {
      projectId: task.projectId,
      userId: viewer.id,
      message: `تم حذف المهمة: "${task.title}"`,
    },
  });

  revalidatePath("/");
  revalidatePath(`/projects/${task.projectId}`);
  return { ok: true };
}

// ── Member management ─────────────────────────────────────────────────────────

export type MemberActionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Super-admin adds an existing user to a project.
 * Sends an invitation email to the new member.
 */
export async function addProjectMember(input: {
  projectId: string;
  userId: string;
  role: "MANAGER" | "MEMBER";
}): Promise<MemberActionResult> {
  const { viewer, membership } = await viewerOn(input.projectId);
  if (!canManageMembers(viewer, membership)) return { ok: false, error: DENIED };

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) return { ok: false, error: "المستخدم غير موجود" };

  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { id: true, name: true },
  });
  if (!project) return { ok: false, error: "المشروع غير موجود" };

  // Upsert membership (update role if already a member)
  await prisma.projectMember.upsert({
    where: { userId_projectId: { userId: input.userId, projectId: input.projectId } },
    update: { role: input.role as ProjectRole },
    create: { userId: input.userId, projectId: input.projectId, role: input.role as ProjectRole },
  });

  await prisma.activityLog.create({
    data: {
      projectId: input.projectId,
      userId: viewer.id,
      message: `تمت إضافة ${user.name} كـ${input.role === "MANAGER" ? "مدير مشروع" : "عضو"} في المشروع`,
    },
  });

  try {
    await sendMemberInviteEmail({
      to: user.email,
      memberName: user.name,
      projectName: project.name,
      projectId: input.projectId,
      addedByName: viewer.name,
      role: input.role,
    });
  } catch (err) {
    console.error("[email] failed:", err);
  }

  revalidatePath("/");
  revalidatePath(`/projects/${input.projectId}`);
  return { ok: true };
}

/**
 * Super-admin removes a member from a project.
 */
export async function removeProjectMember(input: {
  projectId: string;
  userId: string;
}): Promise<MemberActionResult> {
  const { viewer, membership: mine } = await viewerOn(input.projectId);
  if (!canManageMembers(viewer, mine)) return { ok: false, error: DENIED };

  const membership = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: input.userId, projectId: input.projectId } },
    select: { user: { select: { name: true } } },
  });
  if (!membership) return { ok: false, error: "العضو غير موجود في هذا المشروع" };

  await prisma.projectMember.delete({
    where: { userId_projectId: { userId: input.userId, projectId: input.projectId } },
  });

  await prisma.activityLog.create({
    data: {
      projectId: input.projectId,
      userId: viewer.id,
      message: `تمت إزالة ${membership.user.name} من المشروع`,
    },
  });

  revalidatePath("/");
  revalidatePath(`/projects/${input.projectId}`);
  return { ok: true };
}

/**
 * Super-admin or Manager changes a member's role in a project.
 */
export async function updateProjectMemberRole(input: {
  projectId: string;
  userId: string;
  role: "MANAGER" | "MEMBER";
}): Promise<MemberActionResult> {
  const { viewer, membership: mine } = await viewerOn(input.projectId);
  if (!canManageMembers(viewer, mine)) return { ok: false, error: DENIED };

  const membership = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: input.userId, projectId: input.projectId } },
    select: { user: { select: { name: true } } },
  });
  if (!membership) return { ok: false, error: "العضو غير موجود في هذا المشروع" };

  await prisma.projectMember.update({
    where: { userId_projectId: { userId: input.userId, projectId: input.projectId } },
    data: { role: input.role as ProjectRole },
  });

  await prisma.activityLog.create({
    data: {
      projectId: input.projectId,
      userId: viewer.id,
      message: `تم تعديل دور ${membership.user.name} إلى ${input.role === "MANAGER" ? "مدير مشروع" : "عضو"}`,
    },
  });

  revalidatePath("/");
  revalidatePath(`/projects/${input.projectId}`);
  return { ok: true };
}

// ── Project dates ─────────────────────────────────────────────────────────────

export type UpdateDatesResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Super-admin updates project start and end (due) dates.
 */
export async function updateProjectDates(input: {
  projectId: string;
  startDate: string | null;  // YYYY-MM-DD or null
  dueDate:   string | null;  // YYYY-MM-DD or null
}): Promise<UpdateDatesResult> {
  const { viewer, membership } = await viewerOn(input.projectId);
  if (!canEditProject(viewer, membership)) return { ok: false, error: DENIED };

  const parseDate = (s: string | null) =>
    s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00`) : null;

  await prisma.project.update({
    where: { id: input.projectId },
    data: {
      startDate: parseDate(input.startDate),
      dueDate:   parseDate(input.dueDate),
    },
  });

  revalidatePath("/");
  revalidatePath(`/projects/${input.projectId}`);
  return { ok: true };
}

/**
 * Super-admin or Manager updates project details.
 */
export async function updateProjectDetails(input: {
  projectId: string;
  name: string;
  kicker?: string | null;
  department?: string | null;
  status: "PLANNING" | "ACTIVE" | "BLOCKED" | "DONE";
  ownerId?: string | null;
  githubUrl?: string | null;
  note?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { viewer, membership } = await viewerOn(input.projectId);
  if (!canEditProject(viewer, membership)) return { ok: false, error: DENIED };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "اسم المشروع مطلوب" };

  await prisma.project.update({
    where: { id: input.projectId },
    data: {
      name,
      kicker: input.kicker?.trim() || null,
      department: input.department?.trim() || null,
      status: input.status as any,
      ownerId: input.ownerId || null,
      githubUrl: input.githubUrl?.trim() || null,
      note: input.note?.trim() || null,
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: input.projectId,
      userId: viewer.id,
      message: `تم تعديل بيانات المشروع: "${name}"`,
    },
  });

  revalidatePath("/");
  revalidatePath(`/projects/${input.projectId}`);
  return { ok: true };
}

/**
 * Update project GitHub URL.
 */
export async function updateProjectGithubUrl(input: {
  projectId: string;
  githubUrl: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { viewer, membership } = await viewerOn(input.projectId);
  if (!canEditProject(viewer, membership)) return { ok: false, error: DENIED };

  const url = input.githubUrl ? input.githubUrl.trim() : null;

  await prisma.project.update({
    where: { id: input.projectId },
    data: {
      githubUrl: url,
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: input.projectId,
      userId: viewer.id,
      message: url ? `تم ربط المستودع على GitHub: ${url}` : "تم إلغاء ربط مستودع GitHub",
    },
  });

  revalidatePath("/");
  revalidatePath(`/projects/${input.projectId}`);
  return { ok: true };
}

// ── User Management ──────────────────────────────────────────────────────────

export type CreateUserResult =
  | { ok: true; user: { id: string; name: string; email: string } }
  | { ok: false; error: string };

/**
 * Super-admin creates a new system user account.
 * Optionally joins the user to a project immediately.
 *
 * `role` is the account-wide role; `projectRole` is the separate per-project
 * one. The caller passes both because they answer different questions — see
 * lib/permissions. When `projectRole` is omitted we fall back to deriving it
 * from the account role, which is only a guess.
 */
export async function createUserSystem(input: {
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "MANAGER" | "MEMBER";
  department?: string;
  password?: string;
  projectId?: string;
  projectRole?: "MANAGER" | "MEMBER";
}): Promise<CreateUserResult> {
  // Minting an account — and choosing its account-wide role — is the one thing
  // reserved entirely for a super admin.
  const viewer = await requireViewer();
  if (!canManageUsers(viewer)) return { ok: false, error: DENIED };

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name) return { ok: false, error: "اسم المستخدم مطلوب" };
  if (!email || !email.includes("@"))
    return { ok: false, error: "البريد الإلكتروني غير صحيح" };

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing)
    return { ok: false, error: "هذا البريد الإلكتروني مسجل بالفعل لمستخدم آخر" };

  const rawPass =
    input.password?.trim() || process.env.SEED_PASSWORD || "123456789";
  const passwordHash = await bcrypt.hash(rawPass, 10);

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      role: input.role as UserRole,
      department: input.department?.trim() || null,
      passwordHash,
    },
  });

  let projectName: string | undefined;
  if (input.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { id: true, name: true },
    });
    if (project) {
      projectName = project.name;
      await prisma.projectMember.create({
        data: {
          userId: newUser.id,
          projectId: input.projectId,
          role:
            (input.projectRole as ProjectRole | undefined) ??
            (input.role === "MEMBER" ? "MEMBER" : "MANAGER"),
        },
      });

      await prisma.activityLog.create({
        data: {
          projectId: input.projectId,
          userId: viewer.id,
          message: `تم إنشاء حساب جديد لـ ${newUser.name} وإضافته للمشروع`,
        },
      });
    }
  }

  try {
    await sendNewUserWelcomeEmail({
      to: newUser.email,
      userName: newUser.name,
      userEmail: newUser.email,
      password: rawPass,
      role: input.role,
      department: input.department,
      addedByName: viewer.name,
      projectName,
      projectId: input.projectId,
    });
  } catch (err) {
    console.error("[email] welcome email failed:", err);
  }

  revalidatePath("/");
  if (input.projectId) {
    revalidatePath(`/projects/${input.projectId}`);
  }

  return {
    ok: true,
    user: { id: newUser.id, name: newUser.name, email: newUser.email },
  };
}

