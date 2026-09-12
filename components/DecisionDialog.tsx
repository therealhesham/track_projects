"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";

export type DecisionTone = "accept" | "reject";

/**
 * The one modal behind every note written at a decision point: an assignee
 * reporting a task finished, and a manager admitting, turning away, signing off
 * or sending back. All five ask for the same thing — a paragraph of prose — so
 * they share a dialog rather than each growing an inline box too small to read
 * what was typed into it.
 *
 * `required` is what separates a rejection from an approval: a rejection has to
 * say why, or the person is sent back to work with nothing to act on. The
 * server enforces this too — this only saves a round trip.
 */
export default function DecisionDialog({
  title,
  description,
  label,
  placeholder,
  required = false,
  confirmLabel,
  tone = "accept",
  onConfirm,
  onClose,
}: {
  title: string;
  /** Optional line under the heading, for context the title cannot carry. */
  description?: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  confirmLabel: string;
  tone?: DecisionTone;
  onConfirm: (note: string) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    areaRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const blocked = pending || (required && !note.trim());

  const submit = () => {
    if (blocked) return;
    setError(null);
    startTransition(async () => {
      const result = await onConfirm(note.trim());
      if (!result.ok) {
        setError(result.error ?? "تعذّر إتمام العملية");
        return;
      }
      onClose();
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="decision-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/25 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-ink/10 bg-paper shadow-lg">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-ink/10 px-6 py-4">
          <div>
            <h2 id="decision-dialog-title" className="text-base font-semibold">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-[13px] leading-relaxed text-ink/65">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-ink/70 hover:bg-ink/5 hover:text-ink"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-6 py-5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="decision-note"
              className="text-[13px] tracking-wide text-ink/80"
            >
              {label}{" "}
              {required ? (
                <span className="text-red-500">*</span>
              ) : (
                <span className="text-ink/50">(اختياري)</span>
              )}
            </label>
            <textarea
              id="decision-note"
              ref={areaRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                // Enter breaks the line; the shortcut needs a modifier so a
                // multi-line reason can actually be written here.
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
              rows={4}
              placeholder={placeholder}
              className="w-full resize-y rounded-md border border-ink/20 bg-white px-3 py-2 text-[15px] leading-[1.7] outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
            />
          </div>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-ink/10 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-ink/15 px-4 py-2 text-[15px] text-ink/85 hover:bg-ink/5"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={blocked}
            className={`rounded-md px-5 py-2 text-[15px] font-semibold text-white disabled:opacity-40 ${
              tone === "reject"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-accent hover:bg-accent-600"
            }`}
          >
            {pending ? "جارٍ الحفظ…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
