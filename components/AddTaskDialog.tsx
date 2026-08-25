"use client";

import { useRef, useEffect, useState, useTransition } from "react";
import { Plus, X, AlertCircle } from "lucide-react";
import type { ProjectView } from "@/lib/view";
import { addTask } from "@/app/actions";

export default function AddTaskDialog({
  project,
  onClose,
}: {
  project: ProjectView;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await addTask({
        projectId: project.id,
        title,
        assigneeId: assigneeId || undefined,
        dueDate: dueDate || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-task-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/25 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-ink/10 bg-paper shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink/10 px-6 py-4">
          <h2 id="add-task-title" className="text-base font-semibold">
            إضافة مهمة جديدة
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-ink/50 hover:bg-ink/5 hover:text-ink"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="task-title"
              className="text-[12px] tracking-wide text-ink/60"
            >
              عنوان المهمة <span className="text-red-500">*</span>
            </label>
            <input
              id="task-title"
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !pending) submit();
              }}
              placeholder="اكتب عنوان المهمة هنا…"
              className="w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-[15px] outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="task-assignee"
              className="text-[12px] tracking-wide text-ink/60"
            >
              تكليف عضو (اختياري)
            </label>
            <select
              id="task-assignee"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-[15px] outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
            >
              <option value="">— بدون تكليف —</option>
              {project.tasks
                .filter(
                  (t, i, arr) =>
                    t.assigneeId &&
                    arr.findIndex((x) => x.assigneeId === t.assigneeId) === i,
                )
                .map((t) => (
                  <option key={t.assigneeId!} value={t.assigneeId!}>
                    {t.assignee}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="task-due-date"
              className="text-[12px] tracking-wide text-ink/60"
            >
              الموعد النهائي للمهمة (اختياري)
            </label>
            <input
              id="task-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-[14px] outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
            />
          </div>

          {/* Info banner */}
          <div className="rounded-md bg-gold-100 border border-gold-600/20 px-3 py-2.5 text-[12px] text-gold-800 leading-relaxed">
            المهمة ستُضاف في حالة <strong>«في انتظار الاعتماد»</strong> ريثما
            يوافق عليها السوبر ادمن.
          </div>

          {error && (
            <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-[12px] text-red-700">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-ink/10 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-ink/15 px-4 py-2 text-[15px] text-ink/70 hover:bg-ink/5"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !title.trim()}
            className="rounded-md bg-accent px-5 py-2 text-[15px] font-semibold text-white disabled:opacity-40 hover:bg-accent-600"
          >
            {pending ? "جارٍ الإضافة…" : "إضافة المهمة"}
          </button>
        </div>
      </div>
    </div>
  );
}
