"use server";

import { revalidatePath } from "next/cache";
import type { TaskApprovalStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatShortDate, ymd } from "@/lib/calendar";
import { sendDailyCompletionReviewEmail } from "@/lib/email";
import {
  canAddDailyTaskFor,
  canApproveDailyTask,
  canDeleteDailyTask,
  canRequestDailyCompletion,
  canReviewDailyCompletion,
} from "@/lib/permissions";
import { requireViewer } from "@/lib/session";

/**
 * Daily tasks — the work that belongs to a person rather than a project.
 *
 * Kept apart from app/actions.ts because nothing here resolves a project: there
 * is no membership to look up and no ActivityLog to write, since that feed is
 * keyed by project. What a daily task has instead is an owner, and every rule
 * below turns on that one relation.
 *
 * As with the project actions, the browser could forge any of these calls by
 * hand, so each one re-reads the row from the database and checks the caller
 * against it. A hidden button grants nothing.
 */

const DENIED = "لا تملك صلاحية للقيام بهذا الإجراء" as const;
const NOT_FOUND = "المهمة غير موجودة" as const;

export type DailyTaskResult = { ok: true } | { ok: false; error: string };

/** `YYYY-MM-DD` → a Date at midday, so no time zone can shift the day. */
function parseDay(day: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const parsed = new Date(`${day}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** The signed-in user plus the daily task they are acting on, or null. */
async function viewerOnDailyTask(taskId: string) {
  const viewer = await requireViewer();
  const task = await prisma.dailyTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      day: true,
      ownerId: true,
      approvalStatus: true,
      startedAt: true,
      completedAt: true,
    },
  });
  return { viewer, task };
}

/**
 * Write down a daily task. It lands in PENDING_APPROVAL like a project task —
 * the same lifecycle, with the super admin holding the gate.
 */
export async function addDailyTask(input: {
  title: string;
  day: string;
  note?: string | null;
  /** Omitted means "for myself"; only a super admin may name someone else. */
  ownerId?: string;
}): Promise<DailyTaskResult> {
  const viewer = await requireViewer();
  const ownerId = input.ownerId?.trim() || viewer.id;
  if (!canAddDailyTaskFor(viewer, ownerId)) return { ok: false, error: DENIED };

  const title = input.title.trim();
  if (!title) return { ok: false, error: "عنوان المهمة مطلوب" };

  const day = parseDay(input.day);
  if (!day) return { ok: false, error: "تاريخ اليوم غير صحيح" };

  if (ownerId !== viewer.id) {
    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { id: true },
    });
    if (!owner) return { ok: false, error: "المستخدم غير موجود" };
  }

  await prisma.dailyTask.create({
    data: {
      title,
      note: input.note?.trim() || null,
      day,
      ownerId,
      addedById: viewer.id,
      approvalStatus: "PENDING_APPROVAL",
    },
  });

  revalidatePath("/");
  return { ok: true };
}

/** Super admin admits a pending daily task → ACTIVE, and the clock starts. */
export async function approveDailyTask(taskId: string): Promise<DailyTaskResult> {
  const { viewer, task } = await viewerOnDailyTask(taskId);
  if (!canApproveDailyTask(viewer)) return { ok: false, error: DENIED };
  if (!task) return { ok: false, error: NOT_FOUND };
  if (task.approvalStatus !== "PENDING_APPROVAL")
    return { ok: false, error: "المهمة ليست في انتظار الاعتماد" };

  await prisma.dailyTask.update({
    where: { id: taskId },
    data: {
      approvalStatus: "ACTIVE" as TaskApprovalStatus,
      startedAt: task.startedAt ?? new Date(),
    },
  });

  revalidatePath("/");
  return { ok: true };
}

/** Super admin turns a pending daily task away → REJECTED. */
export async function rejectDailyTask(taskId: string): Promise<DailyTaskResult> {
  const { viewer, task } = await viewerOnDailyTask(taskId);
  if (!canApproveDailyTask(viewer)) return { ok: false, error: DENIED };
  if (!task) return { ok: false, error: NOT_FOUND };
  if (task.approvalStatus !== "PENDING_APPROVAL")
    return { ok: false, error: "المهمة ليست في انتظار الاعتماد" };

  await prisma.dailyTask.update({
    where: { id: taskId },
    data: {
      approvalStatus: "REJECTED" as TaskApprovalStatus,
      startedAt: null,
    },
  });

  revalidatePath("/");
  return { ok: true };
}

/** The owner reports their daily task finished → PENDING_COMPLETION. */
export async function requestDailyCompletion(
  taskId: string,
  note?: string,
): Promise<DailyTaskResult> {
  const { viewer, task } = await viewerOnDailyTask(taskId);
  if (!task) return { ok: false, error: NOT_FOUND };
  if (!canRequestDailyCompletion(viewer, task.ownerId))
    return { ok: false, error: DENIED };
  if (task.approvalStatus !== "ACTIVE")
    return { ok: false, error: "المهمة غير نشطة" };

  await prisma.dailyTask.update({
    where: { id: taskId },
    data: {
      approvalStatus: "PENDING_COMPLETION" as TaskApprovalStatus,
      completionNote: note?.trim() || null,
      completionRequestedAt: new Date(),
      startedAt: task.startedAt ?? new Date(),
    },
  });

  await notifySuperAdminsOfDailyCompletion({
    taskTitle: task.title,
    day: ymd(task.day),
    requestedById: viewer.id,
    requestedByName: viewer.name,
    note: note?.trim() || null,
  });

  revalidatePath("/");
  return { ok: true };
}

/**
 * Tell the super admins a daily task is waiting on them.
 *
 * Best-effort, like the project-task notification: the request is already
 * recorded, and a bounced email must not make the owner think their click
 * failed. The tab shows the task under «في انتظار موافقة المدير» either way.
 */
async function notifySuperAdminsOfDailyCompletion(input: {
  taskTitle: string;
  day: string;
  requestedById: string;
  requestedByName: string;
  note: string | null;
}) {
  try {
    // canReviewDailyCompletion grants this to super admins and nobody else —
    // with no project there is no manager to fall back on.
    const reviewers = await prisma.user.findMany({
      where: {
        role: "SUPER_ADMIN",
        isActive: true,
        id: { not: input.requestedById },
      },
      select: { name: true, email: true },
    });

    if (reviewers.length === 0) {
      console.warn(
        `[email] daily task "${input.taskTitle}" awaits approval but there is no other super admin to notify`,
      );
      return;
    }

    await Promise.all(
      reviewers.map((u) =>
        sendDailyCompletionReviewEmail({
          to: u.email,
          reviewerName: u.name,
          taskTitle: input.taskTitle,
          dayLabel: formatShortDate(input.day),
          requestedByName: input.requestedByName,
          note: input.note,
        }),
      ),
    );
  } catch (err) {
    console.error("[email] daily completion-review notification failed:", err);
  }
}

/** Super admin signs off the completion → DONE. */
export async function approveDailyCompletion(
  taskId: string,
): Promise<DailyTaskResult> {
  const { viewer, task } = await viewerOnDailyTask(taskId);
  if (!canReviewDailyCompletion(viewer)) return { ok: false, error: DENIED };
  if (!task) return { ok: false, error: NOT_FOUND };
  if (task.approvalStatus !== "PENDING_COMPLETION")
    return { ok: false, error: "المهمة ليست في انتظار موافقة الإتمام" };

  const now = new Date();
  await prisma.dailyTask.update({
    where: { id: taskId },
    data: {
      approvalStatus: "DONE" as TaskApprovalStatus,
      managerApprovedAt: now,
      completedAt: now,
      startedAt: task.startedAt ?? now,
    },
  });

  revalidatePath("/");
  return { ok: true };
}

/** Super admin sends the completion back — the task returns to ACTIVE. */
export async function rejectDailyCompletion(
  taskId: string,
): Promise<DailyTaskResult> {
  const { viewer, task } = await viewerOnDailyTask(taskId);
  if (!canReviewDailyCompletion(viewer)) return { ok: false, error: DENIED };
  if (!task) return { ok: false, error: NOT_FOUND };
  if (task.approvalStatus !== "PENDING_COMPLETION")
    return { ok: false, error: "المهمة ليست في انتظار موافقة الإتمام" };

  await prisma.dailyTask.update({
    where: { id: taskId },
    data: {
      approvalStatus: "ACTIVE" as TaskApprovalStatus,
      completionNote: null,
      completionRequestedAt: null,
    },
  });

  revalidatePath("/");
  return { ok: true };
}

/**
 * Remove a daily task. An owner may withdraw one that never made it into the
 * list; anything live is the super admin's call — see canDeleteDailyTask.
 */
export async function deleteDailyTask(taskId: string): Promise<DailyTaskResult> {
  const { viewer, task } = await viewerOnDailyTask(taskId);
  if (!task) return { ok: false, error: NOT_FOUND };
  if (!canDeleteDailyTask(viewer, task.ownerId, task.approvalStatus))
    return { ok: false, error: DENIED };

  await prisma.dailyTask.delete({ where: { id: taskId } });

  revalidatePath("/");
  return { ok: true };
}
