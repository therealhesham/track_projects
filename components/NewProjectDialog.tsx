"use client";

import { useEffect, useRef } from "react";
import Button from "./ui/Button";

export type Draft = { name: string; dept: string; due: string };

const INPUT =
  "w-full min-h-9 rounded-md border border-ink/16 bg-surface px-2.5 py-1.5 text-[15px] text-ink caret-accent placeholder:text-ink/65 hover:border-ink/45 focus-visible:border-accent focus-visible:outline-offset-0";

const FIELDS: {
  key: keyof Draft;
  label: string;
  placeholder: string;
  type?: string;
}[] = [
  {
    key: "name",
    label: "اسم المشروع",
    placeholder: "مثال: ترحيل السيرفرات",
  },
  { key: "dept", label: "القسم", placeholder: "مثال: التقنية" },
  { key: "due", label: "تاريخ التسليم", placeholder: "", type: "date" },
];

export default function NewProjectDialog({
  draft,
  error,
  busy,
  onChange,
  onCancel,
  onCreate,
}: {
  draft: Draft;
  error: string | null;
  busy: boolean;
  onChange: (draft: Draft) => void;
  onCancel: () => void;
  onCreate: () => void;
}) {
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#2d2b2b]/50 p-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-title"
        className="flex w-[min(440px,100%)] flex-col gap-4 rounded-lg bg-surface p-5 shadow-lg"
      >
        <h2 id="new-project-title" className="text-xl font-semibold">
          مشروع جديد
        </h2>

        {FIELDS.map((field, i) => (
          <div key={field.key}>
            <label
              htmlFor={`np-${field.key}`}
              className="mb-[5px] block text-[13px] text-ink/70"
            >
              {field.label}
            </label>
            <input
              id={`np-${field.key}`}
              ref={i === 0 ? firstField : undefined}
              type={field.type ?? "text"}
              className={INPUT}
              value={draft[field.key]}
              placeholder={field.placeholder}
              onChange={(e) =>
                onChange({ ...draft, [field.key]: e.target.value })
              }
            />
          </div>
        ))}

        {error && <p className="text-[14px] text-gold-800">{error}</p>}

        <div className="mt-2.5 flex justify-end gap-2.5">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            إلغاء
          </Button>
          <Button variant="primary" onClick={onCreate} disabled={busy}>
            {busy ? "جارٍ الإضافة…" : "إضافة"}
          </Button>
        </div>
      </div>
    </div>
  );
}
