"use client";

import { useState, useTransition } from "react";
import { createUserSystem } from "@/app/actions";
import { UserPlus, X, Sparkles, Shield, Mail, User, Building2, Lock } from "lucide-react";

export default function CreateUserModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"SUPER_ADMIN" | "MANAGER" | "MEMBER">("MEMBER");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!name.trim() || !email.trim()) return;
    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await createUserSystem({
        name,
        email,
        role,
        department: department || undefined,
        password: password || undefined,
      });

      if (!res.ok) {
        setError(res.error);
        return;
      }

      setSuccessMsg(`تم إنشاء حساب ${name} بنجاح في النظام!`);
      setTimeout(() => {
        onClose();
      }, 1200);
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[440px] overflow-hidden rounded-2xl border border-ink/10 bg-paper shadow-lg" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink/8 px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-accent" />
            <h2 className="text-[17px] font-semibold text-ink">
              إضافة مستخدم جديد للنظام
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink/35 transition hover:bg-ink/6 hover:text-ink"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-6 py-5">
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-ink/50">
              الاسم الكامل <span className="text-red-400">*</span>
            </span>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: محمد علي"
                autoFocus
                className="w-full rounded-xl border border-ink/15 bg-paper px-3.5 py-2.5 text-[14px] text-ink outline-none transition focus:border-accent"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-ink/50">
              البريد الإلكتروني <span className="text-red-400">*</span>
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full rounded-xl border border-ink/15 bg-paper px-3.5 py-2.5 text-[14px] text-ink outline-none transition focus:border-accent"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-ink/50">
                دور المستخدم
              </span>
              <select
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as "SUPER_ADMIN" | "MANAGER" | "MEMBER")
                }
                className="w-full rounded-xl border border-ink/15 bg-paper px-3 py-2 text-[13px] text-ink outline-none transition focus:border-accent"
              >
                <option value="MEMBER">عضو (MEMBER)</option>
                <option value="MANAGER">مدير (MANAGER)</option>
                <option value="SUPER_ADMIN">مدير عام (SUPER_ADMIN)</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-ink/50">
                القسم (اختياري)
              </span>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="التطوير البرمجي"
                className="w-full rounded-xl border border-ink/15 bg-paper px-3 py-2 text-[13px] text-ink outline-none transition focus:border-accent"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-ink/50">
              كلمة المرور (اختياري - الافتراضي: 123456789)
            </span>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="123456789"
              className="w-full rounded-xl border border-ink/15 bg-paper px-3.5 py-2 text-[13px] text-ink outline-none transition focus:border-accent"
            />
          </label>

          {error && (
            <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-[12px] text-red-600">
              {error}
            </p>
          )}

          {successMsg && (
            <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-[12px] text-green-700 font-medium">
              {successMsg}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 border-t border-ink/8 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-ink/12 px-4 py-2 text-[14px] text-ink/55 transition hover:bg-ink/5"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending || !name.trim() || !email.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2 text-[14px] font-semibold text-white transition hover:bg-accent-600 disabled:opacity-40"
          >
            {/* <Sparkles className="h-4 w-4" /> */}
            {pending ? "جارٍ الإنشـاء…" : "إنشاء المستخدم"}
          </button>
        </div>
      </div>
    </div>
  );
}
