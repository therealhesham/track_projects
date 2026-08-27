"use client";

import { useState, useTransition } from "react";
import {
  approveDailyCompletion,
  approveDailyTask,
  deleteDailyTask,
  rejectDailyCompletion,
  rejectDailyTask,
  requestDailyCompletion,
} from "@/app/daily-actions";
import { formatDayTitle } from "@/lib/calendar";
import type { DailyTaskView } from "@/lib/view";
import { useRole } from "../RoleContext";
import { TASK_STATUS_CONFIG } from "../ProjectCalendar";
import AddDailyTaskDialog, {
  type AssignableUser,
} from "../AddDailyTaskDialog";
import {
  CalendarDays,
  Check,
  Plus,
  Shield,
  Trash2,
  Undo2,
  User,
  X,
} from "lucide-react";

/** Which slice of the list is on screen. Daily tasks accumulate forever, so the
 *  default is the narrow one — today — and the wider views are a click away. */
const RANGES = [
  { key: "today", label: "اليوم" },
  { key: "upcoming", label: "القادمة" },
  { key: "all", label: "الكل" },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

export default function DailyTasksScreen({
  dailyTasks,
  assignableUsers,
  today,
}: {
  dailyTasks: DailyTaskView[];
  assignableUsers: AssignableUser[];
  today: string;
}) {
  const { currentUser } = useRole();
  const isSuperAdmin = currentUser.role === "SUPER_ADMIN";

  const [range, setRange] = useState<RangeKey>("today");
  const [addOpen, setAddOpen] = useState(false);

  const mine = dailyTasks.filter((t) => t.ownerId === currentUser.id);

  /**
   * What is sitting on the super admin's desk. Their own tasks are included —
   * they hold the gate for those too — so this is keyed on state, not owner.
   */
  const reviewQueue = isSuperAdmin
    ? dailyTasks.filter(
        (t) =>
          t.approvalStatus === "PENDING_APPROVAL" ||
          t.approvalStatus === "PENDING_COMPLETION",
      )
    : [];

  const visible = mine.filter((t) => {
    if (range === "today") return t.day === today;
    if (range === "upcoming") return t.day >= today;
    return true;
  });

  // Newest day first, so today sits at the top of "القادمة" and "الكل".
  const byDay = new Map<string, DailyTaskView[]>();
  for (const task of visible) {
    const bucket = byDay.get(task.day);
    if (bucket) bucket.push(task);
    else byDay.set(task.day, [task]);
  }
  const days = Array.from(byDay.keys()).sort((a, b) =>
    range === "upcoming" ? a.localeCompare(b) : b.localeCompare(a),
  );

  const openCount = mine.filter(
    (t) => t.approvalStatus === "ACTIVE" || t.approvalStatus === "PENDING_APPROVAL",
  ).length;

  return (
    <div className="shell flex flex-col gap-6 pt-6 pb-20">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-accent" />
          <h2 className="text-[22px] font-semibold text-ink">مهامي اليومية</h2>
          <span className="inline-flex items-center gap-1 rounded-full border border-ink/10 bg-ink/6 px-2.5 py-0.5 text-[12px] font-medium text-ink/60">
            <User className="h-3.5 w-3.5" />
            {openCount} مهمة مفتوحة
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex overflow-hidden rounded-md border border-ink/16">
            {RANGES.map((r, i) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                aria-pressed={range === r.key}
                className={`px-3 py-[7px] text-[14px] ${
                  i > 0 ? "border-s border-ink/16" : ""
                } ${
                  range === r.key
                    ? "bg-accent text-paper"
                    : "text-ink/70 hover:bg-ink/7"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-1.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-accent-600"
          >
            <Plus className="h-4 w-4" />
            مهمة يومية
          </button>
        </div>
      </div>

      {/* The super admin's desk — everything waiting on a decision. */}
      {reviewQueue.length > 0 && (
        <section className="rounded-xl border border-gold-600/25 bg-gold-100/40 p-5">
          <div className="flex items-center gap-2 pb-1">
            <Shield className="h-4 w-4 text-gold-800" />
            <h3 className="text-[14px] font-semibold text-gold-800">
              بانتظار اعتمادك ({reviewQueue.length})
            </h3>
          </div>
          <div className="flex flex-col divide-y divide-ink/8">
            {reviewQueue.map((task) => (
              <TaskRow key={task.id} task={task} showOwner />
            ))}
          </div>
        </section>
      )}

      {/* My tasks, grouped by the day they belong to. */}
      {days.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink/15 py-16 text-center">
          <p className="text-[15px] text-ink/50">
            {range === "today"
              ? "لا توجد مهام يومية لهذا اليوم."
              : "لا توجد مهام يومية بعد."}
          </p>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="mt-3 text-[14px] font-medium text-accent hover:underline"
          >
            أضف أول مهمة
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {days.map((day) => (
            <section
              key={day}
              className="overflow-hidden rounded-xl border border-ink/10 bg-paper shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-ink/8 bg-surface px-5 py-3">
                <h3 className="text-[14px] font-semibold text-ink">
                  {formatDayTitle(day)}
                </h3>
                {day === today && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">
                    اليوم
                  </span>
                )}
              </div>
              <div className="flex flex-col divide-y divide-ink/8 px-5">
                {byDay.get(day)!.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {addOpen && (
        <AddDailyTaskDialog
          defaultDay={today}
          assignableUsers={assignableUsers}
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * One task and whatever the viewer is allowed to do with it. The buttons mirror
 * lib/permissions exactly — hiding one grants nothing, since every action
 * re-checks on the server, but showing a button that will be refused is worse
 * than showing none.
 */
function TaskRow({
  task,
  showOwner = false,
}: {
  task: DailyTaskView;
  showOwner?: boolean;
}) {
  const { currentUser } = useRole();
  const isSuperAdmin = currentUser.role === "SUPER_ADMIN";
  const isOwner = task.ownerId === currentUser.id;

  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const cfg = TASK_STATUS_CONFIG[task.approvalStatus];

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error ?? "تعذّر تنفيذ الإجراء");
      else setNoteOpen(false);
    });
  };

  const canWithdraw =
    isSuperAdmin ||
    (isOwner &&
      (task.approvalStatus === "PENDING_APPROVAL" ||
        task.approvalStatus === "REJECTED"));

  return (
    <div className="flex flex-col gap-2 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p
            className={`text-[15px] font-semibold leading-snug ${
              task.done ? "text-ink/45 line-through" : "text-ink"
            }`}
          >
            {task.title}
          </p>
          {task.note && (
            <p className="text-[13px] leading-relaxed text-ink/55">{task.note}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[12px] text-ink/45">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cfg.bg} ${cfg.text} ${cfg.border}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotBg}`} />
              {cfg.label}
            </span>
            {showOwner && (
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" />
                {task.owner}
              </span>
            )}
            {showOwner && <span>· {task.dayLabel}</span>}
          </div>
          {task.completionNote && (
            <p className="mt-1 rounded-md bg-ink/4 px-2.5 py-1.5 text-[12px] text-ink/60">
              ملاحظة الإتمام: {task.completionNote}
            </p>
          )}
        </div>

        <div className="flex flex-none flex-wrap items-center gap-2">
          {task.approvalStatus === "ACTIVE" && (isOwner || isSuperAdmin) && (
            <ActionButton
              tone="accent"
              disabled={pending}
              onClick={() => setNoteOpen((v) => !v)}
            >
              <Check className="h-3.5 w-3.5" />
              تسجيل الإتمام
            </ActionButton>
          )}

          {task.approvalStatus === "PENDING_APPROVAL" && isSuperAdmin && (
            <>
              <ActionButton
                tone="accent"
                disabled={pending}
                onClick={() => run(() => approveDailyTask(task.id))}
              >
                <Check className="h-3.5 w-3.5" />
                اعتماد
              </ActionButton>
              <ActionButton
                tone="danger"
                disabled={pending}
                onClick={() => run(() => rejectDailyTask(task.id))}
              >
                <X className="h-3.5 w-3.5" />
                رفض
              </ActionButton>
            </>
          )}

          {task.approvalStatus === "PENDING_COMPLETION" && isSuperAdmin && (
            <>
              <ActionButton
                tone="accent"
                disabled={pending}
                onClick={() => run(() => approveDailyCompletion(task.id))}
              >
                <Check className="h-3.5 w-3.5" />
                موافقة
              </ActionButton>
              <ActionButton
                tone="danger"
                disabled={pending}
                onClick={() => run(() => rejectDailyCompletion(task.id))}
              >
                <Undo2 className="h-3.5 w-3.5" />
                إرجاع
              </ActionButton>
            </>
          )}

          {canWithdraw && (
            <ActionButton
              tone="quiet"
              disabled={pending}
              onClick={() => run(() => deleteDailyTask(task.id))}
              aria-label="حذف المهمة"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </ActionButton>
          )}
        </div>
      </div>

      {noteOpen && (
        <div className="flex flex-col gap-2 rounded-md border border-ink/10 bg-surface p-3">
          <label
            htmlFor={`daily-note-${task.id}`}
            className="text-[12px] text-ink/60"
          >
            ملاحظة عند تسجيل الإتمام (اختياري)
          </label>
          <textarea
            id={`daily-note-${task.id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-md border border-ink/20 bg-white px-3 py-2 text-[14px] outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
          <div className="flex justify-end gap-2">
            <ActionButton
              tone="quiet"
              disabled={pending}
              onClick={() => setNoteOpen(false)}
            >
              إلغاء
            </ActionButton>
            <ActionButton
              tone="accent"
              disabled={pending}
              onClick={() => run(() => requestDailyCompletion(task.id, note))}
            >
              {pending ? "جارٍ الإرسال…" : "إرسال للاعتماد"}
            </ActionButton>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function ActionButton({
  tone,
  children,
  ...props
}: {
  tone: "accent" | "danger" | "quiet";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const tones = {
    accent: "border-accent/25 bg-accent/10 text-accent hover:bg-accent/20",
    danger: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
    quiet: "border-ink/12 bg-paper text-ink/55 hover:bg-ink/5 hover:text-ink",
  } as const;

  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition disabled:opacity-40 ${tones[tone]}`}
      {...props}
    >
      {children}
    </button>
  );
}
