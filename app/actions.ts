"use server";

import { revalidatePath } from "next/cache";
import { signOut } from "@/auth";
import type { TaskApprovalStatus, TaskStage, ProjectRole, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { nextStage } from "@/lib/labels";
import { sendMemberInviteEmail } from "@/lib/email";

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
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
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { stage: true },
  });
  if (!task) return;
  await moveTask(taskId, task.stage === "DONE" ? "IN_PROGRESS" : "DONE");
}

/** Board card click: advance one column, wrapping past the last back to NEW. */
export async function advanceTask(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { stage: true },
  });
  if (!task) return;
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
  creatorId?: string;
};

export async function createProject(
  input: CreateProjectInput,
): Promise<CreateProjectResult> {
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
    addedById: input.creatorId || input.ownerId || null,
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
            userId: input.creatorId || input.ownerId || null,
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
  addedById: string;
}): Promise<TaskActionResult> {
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
      addedById: input.addedById,
      approvalStatus: "PENDING_APPROVAL",
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: input.projectId,
      userId: input.addedById,
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
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, projectId: true, title: true, approvalStatus: true },
  });
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
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, projectId: true, title: true, approvalStatus: true },
  });
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
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, projectId: true, title: true, approvalStatus: true, startedAt: true, completedAt: true },
  });
  if (!task) return { ok: false, error: "المهمة غير موجودة" };
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
      message: `طلب تسجيل إتمام المهمة: "${task.title}"`,
    },
  });

  revalidatePath("/");
  revalidatePath(`/projects/${task.projectId}`);
  return { ok: true };
}

/**
 * Manager approves completion → DONE.
 */
export async function approveCompletion(taskId: string): Promise<TaskActionResult> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, projectId: true, title: true, approvalStatus: true, startedAt: true },
  });
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
      message: `وافق المدير على إتمام المهمة: "${task.title}"`,
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
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, projectId: true, title: true, approvalStatus: true },
  });
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
      message: `رفض المدير إتمام المهمة، وأُعيدت للعمل: "${task.title}"`,
    },
  });

  revalidatePath("/");
  revalidatePath(`/projects/${task.projectId}`);
  return { ok: true };
}

/**
 * Super-admin deletes any task from any project.
 */
export async function deleteTask(taskId: string): Promise<TaskActionResult> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, projectId: true, title: true },
  });
  if (!task) return { ok: false, error: "المهمة غير موجودة" };

  await prisma.task.delete({ where: { id: taskId } });

  await prisma.activityLog.create({
    data: {
      projectId: task.projectId,
      message: `حذف السوبر ادمن المهمة: "${task.title}"`,
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
  addedByName: string;
}): Promise<MemberActionResult> {
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
      message: `تمت إضافة ${user.name} كـ${input.role === "MANAGER" ? "مدير مشروع" : "عضو"} في المشروع`,
    },
  });

  // Fire-and-forget email (don't let email failure block the action)
  sendMemberInviteEmail({
    to: user.email,
    memberName: user.name,
    projectName: project.name,
    projectId: input.projectId,
    addedByName: input.addedByName,
    role: input.role,
  }).catch((err) => console.error("[email] failed:", err));

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
 */
export async function createUserSystem(input: {
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "MANAGER" | "MEMBER";
  department?: string;
  password?: string;
  projectId?: string;
  addedByName?: string;
}): Promise<CreateUserResult> {
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

  if (input.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { id: true, name: true },
    });
    if (project) {
      await prisma.projectMember.create({
        data: {
          userId: newUser.id,
          projectId: input.projectId,
          role: input.role === "MANAGER" ? "MANAGER" : "MEMBER",
        },
      });

      await prisma.activityLog.create({
        data: {
          projectId: input.projectId,
          message: `تم إنشاء حساب جديد لـ ${newUser.name} وإضافته للمشروع`,
        },
      });

      sendMemberInviteEmail({
        to: newUser.email,
        memberName: newUser.name,
        projectName: project.name,
        projectId: input.projectId,
        addedByName: input.addedByName || "مدير النظام",
        role: input.role === "MANAGER" ? "MANAGER" : "MEMBER",
      }).catch((err) => console.error("[email] failed:", err));
    }
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

