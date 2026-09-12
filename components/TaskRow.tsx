"use client";

import { useState, useTransition } from "react";
import { Check, X, Trash2 } from "lucide-react";
import type { MemberView, TaskView } from "@/lib/view";
import { APPROVAL_STATUS_TAG } from "@/lib/labels";
import SubtaskList from "./SubtaskList";
import { deleteTask } from "@/app/actions";
import { canRequestCompletion } from "@/lib/permissions";
import { useRole } from "./RoleContext";
import DecisionDialog from "./DecisionDialog";
import DecisionNotes from "./DecisionNotes";
import { TASK_DECISIONS, type Decision } from "./decisions";

/**
 * One checkable task line with full approval-lifecycle actions.
 *
 * Action visibility by role:
 *   SUPER_ADMIN:       delete any task
 *   MANAGER (account): approve/reject completion requests, see all tasks
 *   project manager:   approve/reject pending tasks, delete tasks — both
 *                       scoped to their own project
 *   MEMBER:            request completion on their own active tasks
 */
export default function TaskRow({
  task,
  who,
  size = "desktop",
  isProjectManager,
  projectMembers = [],
}: {
  task: TaskView;
  /** Shown at the far end on desktop. */
  who?: string | null;
  size?: "desktop" | "mobile";
  /** Whether the viewer manages this specific project (ProjectRole, not the account-wide role). */
  isProjectManager: boolean;
  /** Offered in the assignee picker when adding a step. */
  projectMembers?: MemberView[];
}) {
  const { currentUser } = useRole();
  const mobile = size === "mobile";

  const [decision, setDecision] = useState<Decision | null>(null);
  const [pending, startTransition] = useTransition();

  const isSuperAdmin = currentUser.role === "SUPER_ADMIN";
  const isManager = currentUser.role === "MANAGER";
  const isMember = currentUser.role === "MEMBER";
  const isMyTask = task.assigneeId === currentUser.id;

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      await fn();
    });

  // ── Per-state action buttons ─────────────────────────────────────────────

  const ActionBar = () => {
    if (task.approvalStatus === "PENDING_APPROVAL") {
      if (!isProjectManager) return null;
      return (
        <div className="ms-auto flex items-center gap-1.5">
          <ActionBtn
            label="اعتماد"
            variant="accept"
            onClick={() => setDecision("admit")}
          />
          <ActionBtn
            label="رفض"
            variant="reject"
            onClick={() => setDecision("turnAway")}
          />
        </div>
      );
    }

    if (task.approvalStatus === "ACTIVE") {
      // Anyone who carries the task (or super admin) can request completion
      if (canRequestCompletion(currentUser, task.assigneeId)) {
        // Not while a step is still open — the same rule app/actions.ts enforces.
        if (task.openSubtasks > 0) {
          return (
            <div className="ms-auto text-[13px] text-gold-800">
              يتبقى {task.openSubtasks} مهمة فرعية قبل الإتمام
            </div>
          );
        }
        return (
          <div className="ms-auto">
            <ActionBtn
              label="تسجيل إتمام"
              variant="accept"
              onClick={() => setDecision("complete")}
            />
          </div>
        );
      }
      return null;
    }

    if (task.approvalStatus === "PENDING_COMPLETION") {
      if (isManager || isSuperAdmin) {
        return (
          <div className="ms-auto flex gap-1.5">
            <ActionBtn
              label="موافقة"
              variant="accept"
              onClick={() => setDecision("signOff")}
            />
            <ActionBtn
              label="رفض"
              variant="reject"
              onClick={() => setDecision("sendBack")}
            />
          </div>
        );
      }
      return null;
    }

    return null;
  };

  const DeleteBtn = () => {
    if (!isSuperAdmin && !isProjectManager) return null;
    if (task.approvalStatus === "DONE") return null; // keep history clean
    return (
      <button
        type="button"
        title="حذف المهمة"
        onClick={() => run(() => deleteTask(task.id))}
        className="text-ink/55 hover:text-red-500 transition-colors text-[14px] ms-1"
        aria-label={`حذف: ${task.title}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    );
  };

  // ── Badge ────────────────────────────────────────────────────────────────

  const badgeClass = APPROVAL_STATUS_TAG[task.approvalStatus];

  return (
    <div
      className={`flex w-full flex-col border-b border-ink/10 ${
        pending ? "opacity-60 pointer-events-none" : ""
      } ${mobile ? "py-3 gap-1.5" : "py-2 gap-1"}`}
    >
      {/* Main row */}
      <div
        className={`flex w-full items-center ${
          mobile ? "gap-3 text-[15px]" : "gap-2.5 text-[15px]"
        }`}
      >
        {/* Status dot */}
        <span
          aria-hidden
          className={`grid h-[17px] w-[17px] flex-none place-items-center rounded-md border text-[13px] ${
            task.approvalStatus === "DONE"
              ? "border-accent bg-accent/8 text-accent"
              : task.approvalStatus === "REJECTED"
                ? "border-red-300 bg-red-50 text-red-400"
                : "border-ink/28 bg-transparent"
          }`}
        >
          {task.approvalStatus === "DONE" ? (
            <Check className="h-3 w-3" />
          ) : task.approvalStatus === "REJECTED" ? (
            <X className="h-3 w-3" />
          ) : null}
        </span>

        {/* Title */}
        <span
          className={`flex-1 ${
            task.approvalStatus === "DONE"
              ? "line-through opacity-50"
              : task.approvalStatus === "REJECTED"
                ? "line-through opacity-40 text-ink/70"
                : ""
          }`}
        >
          {task.title}
        </span>

        {/* Approval status badge — desktop only */}
        {!mobile && (
          <span
            className={`rounded-full px-2 py-0.5 text-[12px] font-medium whitespace-nowrap ${badgeClass}`}
          >
            {task.approvalStatusLabel}
          </span>
        )}

        {/* Assignee name — desktop only */}
        {who && !mobile && task.approvalStatus !== "PENDING_APPROVAL" && (
          <span className="text-[13px] text-ink/70 whitespace-nowrap">{who}</span>
        )}

        {/* Completed date */}
        {task.completedDay && !mobile && (
          <span className="text-[13px] text-ink/60 tabular-nums">
            {task.completedDay}
          </span>
        )}

        <DeleteBtn />
      </div>

      {/* Action bar row */}
      {!mobile && (
        <div className="flex pe-1">
          <ActionBar />
        </div>
      )}

      {/* Mobile: badge below title */}
      {mobile && (
        <span
          className={`self-start rounded-full px-2 py-0.5 text-[12px] font-medium ${badgeClass}`}
        >
          {task.approvalStatusLabel}
        </span>
      )}

      <DecisionNotes
        approvalStatus={task.approvalStatus}
        completionNote={task.completionNote}
        reviewNote={task.reviewNote}
        completionReviewNote={task.completionReviewNote}
        size="compact"
      />

      {/* Steps */}
      <SubtaskList
        task={task}
        isProjectManager={isProjectManager}
        projectMembers={projectMembers}
        size={size}
      />

      {decision && (
        <DecisionDialog
          {...TASK_DECISIONS[decision]}
          onConfirm={(note) => TASK_DECISIONS[decision].run(task.id, note)}
          onClose={() => setDecision(null)}
        />
      )}
    </div>
  );
}

// ── Shared button sub-component ──────────────────────────────────────────────

function ActionBtn({
  label,
  variant,
  onClick,
}: {
  label: string;
  variant: "accept" | "reject" | "neutral";
  onClick: () => void;
}) {
  const cls = {
    accept:
      "border-accent bg-accent text-white hover:bg-accent-600",
    reject:
      "border-red-300 bg-red-50 text-red-700 hover:bg-red-100",
    neutral:
      "border-ink/15 bg-transparent text-ink/80 hover:bg-ink/5",
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-0.5 text-[13px] font-medium transition-colors ${cls}`}
    >
      {label}
    </button>
  );
}
