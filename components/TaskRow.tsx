"use client";

import { useState, useTransition } from "react";
import { Check, X, Trash2 } from "lucide-react";
import type { TaskView } from "@/lib/view";
import { APPROVAL_STATUS_TAG } from "@/lib/labels";
import {
  approveTask,
  rejectTask,
  requestCompletion,
  approveCompletion,
  rejectCompletion,
  deleteTask,
} from "@/app/actions";
import { useRole } from "./RoleContext";

/**
 * One checkable task line with full approval-lifecycle actions.
 *
 * Action visibility by role:
 *   SUPER_ADMIN: approve/reject pending tasks, delete any task
 *   MANAGER:     approve/reject completion requests, see all tasks
 *   MEMBER:      request completion on their own active tasks
 */
export default function TaskRow({
  task,
  who,
  size = "desktop",
}: {
  task: TaskView;
  /** Shown at the far end on desktop. */
  who?: string | null;
  size?: "desktop" | "mobile";
}) {
  const { currentUser } = useRole();
  const mobile = size === "mobile";

  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState("");
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
      if (!isSuperAdmin) return null;
      return (
        <div className="ms-auto flex items-center gap-1.5">
          <ActionBtn
            label="اعتماد"
            variant="accept"
            onClick={() => run(() => approveTask(task.id))}
          />
          <ActionBtn
            label="رفض"
            variant="reject"
            onClick={() => run(() => rejectTask(task.id))}
          />
        </div>
      );
    }

    if (task.approvalStatus === "ACTIVE") {
      // Member can request completion on their task
      if (isMember && isMyTask) {
        if (showNoteInput) {
          return (
            <div className="ms-auto flex items-center gap-1.5">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ملاحظة (اختياري)"
                className="w-36 rounded border border-ink/20 bg-white px-2 py-0.5 text-[12px] outline-none focus:border-accent"
                autoFocus
              />
              <ActionBtn
                label="تأكيد"
                variant="accept"
                onClick={() =>
                  run(async () => {
                    const r = await requestCompletion(task.id, note);
                    if (r.ok) setShowNoteInput(false);
                    return r;
                  })
                }
              />
              <ActionBtn
                label="إلغاء"
                variant="neutral"
                onClick={() => setShowNoteInput(false)}
              />
            </div>
          );
        }
        return (
          <div className="ms-auto">
            <ActionBtn
              label="تسجيل إتمام"
              variant="accept"
              onClick={() => setShowNoteInput(true)}
            />
          </div>
        );
      }
      return null;
    }

    if (task.approvalStatus === "PENDING_COMPLETION") {
      if (isManager || isSuperAdmin) {
        return (
          <div className="ms-auto flex flex-col items-end gap-1">
            {task.completionNote && (
              <span className="text-[12px] text-ink/50 italic">
                ملاحظة: {task.completionNote}
              </span>
            )}
            <div className="flex gap-1.5">
              <ActionBtn
                label="موافقة"
                variant="accept"
                onClick={() => run(() => approveCompletion(task.id))}
              />
              <ActionBtn
                label="رفض"
                variant="reject"
                onClick={() => run(() => rejectCompletion(task.id))}
              />
            </div>
          </div>
        );
      }
      return null;
    }

    return null;
  };

  const DeleteBtn = () => {
    if (!isSuperAdmin) return null;
    if (task.approvalStatus === "DONE") return null; // keep history clean
    return (
      <button
        type="button"
        title="حذف المهمة"
        onClick={() => run(() => deleteTask(task.id))}
        className="text-ink/25 hover:text-red-500 transition-colors text-[14px] ms-1"
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
          className={`grid h-[17px] w-[17px] flex-none place-items-center rounded-md border text-[12px] ${
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
                ? "line-through opacity-40 text-ink/50"
                : ""
          }`}
        >
          {task.title}
        </span>

        {/* Approval status badge — desktop only */}
        {!mobile && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${badgeClass}`}
          >
            {task.approvalStatusLabel}
          </span>
        )}

        {/* Assignee name — desktop only */}
        {who && !mobile && task.approvalStatus !== "PENDING_APPROVAL" && (
          <span className="text-[12px] text-ink/45 whitespace-nowrap">{who}</span>
        )}

        {/* Completed date */}
        {task.completedDay && !mobile && (
          <span className="text-[12px] text-ink/35 tabular-nums">
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
          className={`self-start rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeClass}`}
        >
          {task.approvalStatusLabel}
        </span>
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
      "border-ink/15 bg-transparent text-ink/60 hover:bg-ink/5",
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-0.5 text-[12px] font-medium transition-colors ${cls}`}
    >
      {label}
    </button>
  );
}
