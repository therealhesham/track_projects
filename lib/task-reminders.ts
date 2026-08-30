/**
 * Due-date reminder sweep. Emails a task's assignee and its project's
 * manager(s) when a task's due date has passed, or falls within
 * DUE_SOON_DAYS days — skipping anything already DONE or REJECTED.
 *
 * Triggered over HTTP by app/api/cron/task-reminders/route.ts, which any
 * external scheduler (Vercel Cron, cron-job.org, a plain crontab + curl) can
 * hit on a timer. The logic lives here rather than in the route file so it
 * stays a plain function — easy to read, test, or call from elsewhere later.
 */
import { prisma } from "@/lib/db";
import {
  sendAssigneeTaskDueReminderEmail,
  sendManagerTaskDueSummaryEmail,
} from "@/lib/email";
import { formatShortDate, ymd } from "@/lib/calendar";

/** A task due within this many days counts as "close", not just "overdue". */
const DUE_SOON_DAYS = 3;

/** Calendar-day difference between two `YYYY-MM-DD` strings (a - b, in days). */
function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const diff = Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd);
  return Math.round(diff / 86_400_000);
}

function arDays(n: number): string {
  if (n === 1) return "يوم";
  if (n === 2) return "يومين";
  if (n <= 10) return "أيام";
  return "يوماً";
}

function statusLabel(daysLeft: number): string {
  if (daysLeft < 0) return `متأخرة ${Math.abs(daysLeft)} ${arDays(Math.abs(daysLeft))}`;
  if (daysLeft === 0) return "مستحقة اليوم";
  return `متبقّي ${daysLeft} ${arDays(daysLeft)}`;
}

type Row = {
  title: string;
  dueDateLabel: string;
  statusLabel: string;
  isOverdue: boolean;
  assignee: { id: string; name: string; email: string } | null;
};

type ProjectGroup = {
  projectId: string;
  projectName: string;
  managerName: string;
  managers: { id: string; name: string; email: string }[];
  rows: Row[];
};

export type TaskReminderSweepResult = {
  projects: number;
  sent: number;
  failed: number;
};

export async function runTaskReminderSweep(): Promise<TaskReminderSweepResult> {
  const todayYmd = ymd(new Date());

  const tasks = await prisma.task.findMany({
    where: {
      dueDate: { not: null },
      approvalStatus: { notIn: ["DONE", "REJECTED"] },
    },
    select: {
      title: true,
      dueDate: true,
      projectId: true,
      assignee: { select: { id: true, name: true, email: true } },
      project: {
        select: {
          id: true,
          name: true,
          owner: { select: { name: true } },
          members: {
            where: { role: "MANAGER" },
            select: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      },
    },
  });

  const projects = new Map<string, ProjectGroup>();

  for (const task of tasks) {
    if (!task.dueDate) continue;
    const daysLeft = daysBetween(ymd(task.dueDate), todayYmd);
    const isOverdue = daysLeft < 0;
    if (!isOverdue && daysLeft > DUE_SOON_DAYS) continue;

    let group = projects.get(task.projectId);
    if (!group) {
      const managers = task.project.members.map((m) => m.user);
      group = {
        projectId: task.project.id,
        projectName: task.project.name,
        managerName: task.project.owner?.name ?? managers[0]?.name ?? "غير محدد",
        managers,
        rows: [],
      };
      projects.set(task.projectId, group);
    }

    group.rows.push({
      title: task.title,
      dueDateLabel: formatShortDate(ymd(task.dueDate)),
      statusLabel: statusLabel(daysLeft),
      isOverdue,
      assignee: task.assignee,
    });
  }

  let sent = 0;
  let failed = 0;

  for (const group of projects.values()) {
    if (group.managers.length === 0) {
      console.warn(
        `[task-reminders] project "${group.projectName}" has overdue/due-soon tasks but no manager to notify`,
      );
    }

    for (const manager of group.managers) {
      try {
        await sendManagerTaskDueSummaryEmail({
          to: manager.email,
          managerName: manager.name,
          projectName: group.projectName,
          projectId: group.projectId,
          tasks: group.rows.map((r) => ({
            title: r.title,
            assigneeName: r.assignee?.name ?? "غير مسند",
            dueDateLabel: r.dueDateLabel,
            statusLabel: r.statusLabel,
            isOverdue: r.isOverdue,
          })),
        });
        sent++;
      } catch (err) {
        failed++;
        console.error(`[task-reminders] failed to email manager ${manager.email}:`, err);
      }
    }

    const byAssignee = new Map<string, { name: string; email: string; rows: Row[] }>();
    for (const row of group.rows) {
      if (!row.assignee) continue;
      const entry = byAssignee.get(row.assignee.id) ?? {
        name: row.assignee.name,
        email: row.assignee.email,
        rows: [],
      };
      entry.rows.push(row);
      byAssignee.set(row.assignee.id, entry);
    }

    for (const assignee of byAssignee.values()) {
      try {
        await sendAssigneeTaskDueReminderEmail({
          to: assignee.email,
          memberName: assignee.name,
          projectName: group.projectName,
          projectId: group.projectId,
          managerName: group.managerName,
          tasks: assignee.rows.map((r) => ({
            title: r.title,
            dueDateLabel: r.dueDateLabel,
            statusLabel: r.statusLabel,
            isOverdue: r.isOverdue,
          })),
        });
        sent++;
      } catch (err) {
        failed++;
        console.error(`[task-reminders] failed to email assignee ${assignee.email}:`, err);
      }
    }
  }

  return { projects: projects.size, sent, failed };
}
