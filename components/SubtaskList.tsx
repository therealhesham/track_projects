"use client";

import { useState, useTransition } from "react";
import { Check, X, Trash2, Plus, ChevronDown, ChevronLeft } from "lucide-react";
import type { MemberView, SubtaskView, TaskView } from "@/lib/view";
import { APPROVAL_STATUS_TAG } from "@/lib/labels";
import {
  addSubtask,
  approveSubtask,
  rejectSubtask,
  requestSubtaskCompletion,
  approveSubtaskCompletion,
  rejectSubtaskCompletion,
  deleteSubtask,
} from "@/app/actions";
import {
  canAddSubtask,
  canApproveSubtask,
  canDeleteSubtask,
  canRequestSubtaskCompletion,
  canReviewSubtaskCompletion,
} from "@/lib/permissions";
import { useRole } from "./RoleContext";

/**
 * The steps under one task, with the same approval lifecycle the task itself
 * carries — proposed, admitted, completion requested, signed off.
 *
 * Shared by both task surfaces (the project page's `TaskCard` and the
 * dashboard's `TaskRow`) so the two cannot drift apart on which button a given
 * role sees. What it decides here is only what to *show*: every action is gated
 * again in app/actions.ts, and the same functions from lib/permissions are
 * called on both sides so the two answers agree.
 */
export default function SubtaskList({
  task,
  isProjectManager,
  projectMembers = [],
  size = "desktop",
}: {
  task: TaskView;
  /** Whether the viewer manages this specific project (ProjectRole). */
  isProjectManager: boolean;
  /** Offered in the assignee picker when adding a step. */
  projectMembers?: MemberView[];
  size?: "desktop" | "mobile";
}) {
  const { currentUser } = useRole();
  const membership = isProjectManager ? "MANAGER" : null;
  const mobile = size === "mobile";

  // Open by default while anything still needs doing, so a task that is waiting
  // on its steps says so without a click.
  const [open, setOpen] = useState(task.openSubtasks > 0);
  const [adding, setAdding] = useState(false);

  const canAdd =
    canAddSubtask(currentUser, membership, task.assigneeId) &&
    task.approvalStatus !== "DONE" &&
    task.approvalStatus !== "REJECTED";

  // Nothing to show and nothing this viewer could add: render no chrome at all.
  if (task.subtasks.length === 0 && !canAdd) return null;

  const { subtaskDone: done, subtaskTotal: total } = task;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="mt-2.5 rounded-lg border border-ink/8 bg-ink/[0.015]">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-1.5 text-[13px] font-medium text-ink/75 transition-colors hover:text-ink"
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
          المهام الفرعية
          {total > 0 && (
            <span className="tabular-nums text-ink/65">
              {done}/{total}
            </span>
          )}
        </button>

        {/* Progress hairline — a step count is easier to read as a bar */}
        {total > 0 && (
          <span
            className="hidden h-[3px] w-16 overflow-hidden rounded-full bg-ink/10 sm:block"
            aria-hidden
          >
            <span
              className="block h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </span>
        )}

        {task.openSubtasks > 0 && task.approvalStatus === "ACTIVE" && (
          <span className="text-[12px] text-gold-800">
            يتبقى {task.openSubtasks} قبل إتمام المهمة
          </span>
        )}

        {canAdd && (
          <button
            type="button"
            onClick={() => {
              setAdding((v) => !v);
              setOpen(true);
            }}
            className="ms-auto inline-flex items-center gap-1 rounded-md border border-accent/25 px-2 py-0.5 text-[12px] font-medium text-accent transition-colors hover:bg-accent/8"
          >
            <Plus className="h-3 w-3" />
            خطوة
          </button>
        )}
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      {open && (
        <div className="border-t border-ink/8">
          {task.subtasks.map((s) => (
            <SubtaskRow
              key={s.id}
              subtask={s}
              parentAssigneeId={task.assigneeId}
              isProjectManager={isProjectManager}
              mobile={mobile}
            />
          ))}

          {task.subtasks.length === 0 && !adding && (
            <p className="px-3 py-3 text-center text-[13px] text-ink/60">
              لا مهام فرعية بعد.
            </p>
          )}

          {adding && (
            <AddSubtaskForm
              taskId={task.id}
              projectMembers={projectMembers}
              onClose={() => setAdding(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── One step ────────────────────────────────────────────────────────────────

function SubtaskRow({
  subtask,
  parentAssigneeId,
  isProjectManager,
  mobile,
}: {
  subtask: SubtaskView;
  parentAssigneeId: string | null;
  isProjectManager: boolean;
  mobile: boolean;
}) {
  const { currentUser } = useRole();
  const membership = isProjectManager ? "MANAGER" : null;

  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const r = await fn();
      setError(r.ok ? null : (r.error ?? null));
    });

  const isDone = subtask.approvalStatus === "DONE";
  const isRejected = subtask.approvalStatus === "REJECTED";
  const overdue =
    subtask.dueDate &&
    !isDone &&
    !isRejected &&
    subtask.dueDate < new Date().toISOString().slice(0, 10);

  return (
    <div
      className={`group/sub flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-ink/6 px-3 py-2 last:border-b-0 ${
        pending ? "pointer-events-none opacity-40" : ""
      }`}
    >
      {/* State icon */}
      <span
        aria-hidden
        className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${
          isDone
            ? "border-accent bg-accent text-white"
            : isRejected
              ? "border-red-200 bg-red-50 text-red-400"
              : "border-ink/20 bg-transparent"
        }`}
      >
        {isDone ? (
          <Check className="h-2.5 w-2.5" />
        ) : isRejected ? (
          <X className="h-2.5 w-2.5" />
        ) : null}
      </span>

      <span
        className={`text-[13px] leading-snug ${
          isDone
            ? "text-ink/60 line-through"
            : isRejected
              ? "text-ink/60 line-through"
              : "text-ink/90"
        }`}
      >
        {subtask.title}
      </span>

      <span
        className={`rounded-full border px-1.5 py-[1px] text-[11px] font-medium whitespace-nowrap ${
          APPROVAL_STATUS_TAG[subtask.approvalStatus]
        }`}
      >
        {subtask.approvalStatusLabel}
      </span>

      {subtask.assignee && !mobile && (
        <span className="text-[12px] text-ink/60">{subtask.assignee}</span>
      )}

      {subtask.dueDate && !isDone && (
        <span
          className={`text-[12px] tabular-nums ${
            overdue ? "text-red-500" : "text-ink/60"
          }`}
        >
          النهاية {subtask.dueDate}
        </span>
      )}

      {subtask.completedDay && (
        <span className="text-[12px] tabular-nums text-ink/60">
          {subtask.completedDay}
        </span>
      )}

      {subtask.completionNote &&
        subtask.approvalStatus === "PENDING_COMPLETION" && (
          <span className="text-[12px] text-ink/60 italic">
            &quot;{subtask.completionNote}&quot;
          </span>
        )}

      {/* Actions */}
      <div className="ms-auto flex shrink-0 items-center gap-1.5">
        {subtask.approvalStatus === "PENDING_APPROVAL" &&
          canApproveSubtask(membership) && (
            <>
              <MiniPill
                label="اعتماد"
                variant="accept"
                onClick={() => run(() => approveSubtask(subtask.id))}
              />
              <MiniPill
                label="رفض"
                variant="reject"
                onClick={() => run(() => rejectSubtask(subtask.id))}
              />
            </>
          )}

        {subtask.approvalStatus === "ACTIVE" &&
          canRequestSubtaskCompletion(
            currentUser,
            subtask.assigneeId,
            parentAssigneeId,
          ) &&
          (showNoteInput ? (
            <>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ملاحظة..."
                className="w-24 rounded-md border border-ink/20 bg-white px-2 py-0.5 text-[12px] outline-none focus:border-accent"
                autoFocus
              />
              <MiniPill
                label="تأكيد"
                variant="accept"
                onClick={() =>
                  run(async () => {
                    const r = await requestSubtaskCompletion(subtask.id, note);
                    if (r.ok) setShowNoteInput(false);
                    return r;
                  })
                }
              />
              <MiniPill
                label="إلغاء"
                variant="neutral"
                onClick={() => setShowNoteInput(false)}
              />
            </>
          ) : (
            <MiniPill
              label="تم"
              variant="accept"
              onClick={() => setShowNoteInput(true)}
            />
          ))}

        {subtask.approvalStatus === "PENDING_COMPLETION" &&
          canReviewSubtaskCompletion(currentUser, membership) && (
            <>
              <MiniPill
                label="موافقة"
                variant="accept"
                onClick={() => run(() => approveSubtaskCompletion(subtask.id))}
              />
              <MiniPill
                label="رفض"
                variant="reject"
                onClick={() => run(() => rejectSubtaskCompletion(subtask.id))}
              />
            </>
          )}

        {canDeleteSubtask(
          currentUser,
          membership,
          subtask.addedById,
          subtask.approvalStatus,
        ) && (
          <button
            type="button"
            title="حذف المهمة الفرعية"
            aria-label={`حذف: ${subtask.title}`}
            onClick={() => run(() => deleteSubtask(subtask.id))}
            className="rounded p-0.5 text-ink/15 transition-all hover:text-red-400 group-hover/sub:opacity-100 sm:opacity-0"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {error && (
        <p className="w-full text-[12px] text-red-500">{error}</p>
      )}
    </div>
  );
}

// ── Add form ────────────────────────────────────────────────────────────────

function AddSubtaskForm({
  taskId,
  projectMembers,
  onClose,
}: {
  taskId: string;
  projectMembers: MemberView[];
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!title.trim()) return;
    startTransition(async () => {
      const r = await addSubtask({
        taskId,
        title,
        assigneeId: assigneeId || null,
        dueDate: dueDate || null,
      });
      if (r.ok) {
        setTitle("");
        setAssigneeId("");
        setDueDate("");
        setError(null);
        onClose();
      } else {
        setError(r.error ?? null);
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-ink/6 bg-accent/[0.03] px-3 py-2.5">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onClose();
        }}
        placeholder="عنوان المهمة الفرعية"
        autoFocus
        className="min-w-[160px] flex-1 rounded-md border border-ink/15 bg-white px-2.5 py-1 text-[13px] outline-none focus:border-accent"
      />

      <select
        value={assigneeId}
        onChange={(e) => setAssigneeId(e.target.value)}
        className="rounded-md border border-ink/15 bg-white px-2 py-1 text-[13px] text-ink/85 outline-none focus:border-accent"
      >
        <option value="">المسؤول عن المهمة</option>
        {projectMembers.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.name}
          </option>
        ))}
      </select>

      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        title="تاريخ التسليم"
        className="rounded-md border border-ink/15 bg-white px-2 py-1 text-[13px] text-ink/85 outline-none focus:border-accent"
      />

      <MiniPill
        label={pending ? "..." : "إضافة"}
        variant="accept"
        onClick={submit}
      />
      <MiniPill label="إلغاء" variant="neutral" onClick={onClose} />

      {error && <p className="w-full text-[12px] text-red-500">{error}</p>}
    </div>
  );
}

// ── Shared button ───────────────────────────────────────────────────────────

function MiniPill({
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
      "border-accent/30 bg-accent/8 text-accent hover:bg-accent hover:text-white hover:border-accent",
    reject: "border-red-200 bg-red-50 text-red-600 hover:bg-red-100",
    neutral: "border-ink/12 bg-transparent text-ink/70 hover:bg-ink/5",
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2 py-0.5 text-[12px] font-medium transition-all ${cls}`}
    >
      {label}
    </button>
  );
}
