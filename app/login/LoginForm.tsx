"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Button from "@/components/ui/Button";
import LogoMark from "@/components/ui/LogoMark";
import { login, type LoginState } from "./actions";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

const INPUT =
  "w-full min-h-10 rounded-lg border border-ink/20 bg-surface px-3 py-2 text-[15px] font-medium text-ink caret-accent placeholder:text-ink/40 hover:border-ink/45 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 transition-all";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="primary"
      className="mt-2 w-full min-h-11 text-[16px] font-bold shadow-sm"
      disabled={pending}
    >
      {pending ? "جارٍ الدخول…" : "تسجيل الدخول"}
    </Button>
  );
}

export default function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {
    error: null,
  });
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="grid min-h-screen place-items-center bg-surface/50 px-4 py-8">
      <div className="w-[min(420px,100%)]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <LogoMark title="إدارة المشاريع" className="h-16 w-16" />
          <h1 className="text-[28px] leading-tight font-bold text-ink">
            إدارة المشاريع والمهام
          </h1>
          <p className="text-[14px] font-bold text-ink/60">لوحة تشغيل الفريق التقني</p>
        </div>

        <div className="rounded-2xl border border-ink/12 bg-paper p-6 sm:p-8 shadow-md">
          <div className="mb-6 border-b border-ink/10 pb-4 text-center sm:text-start">
            <h2 className="text-[20px] font-bold text-ink">تسجيل الدخول</h2>
            <p className="mt-1 text-[13px] font-medium text-ink/55">أدخل بيانات الحساب للمتابعة</p>
          </div>

          <form action={formAction} className="flex flex-col gap-5">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 flex items-center gap-1.5 text-[14px] font-bold text-ink/85"
              >
                <Mail className="h-4 w-4 text-accent" />
                البريد الإلكتروني
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@company.com"
                dir="ltr"
                className={`${INPUT} text-start`}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 flex items-center gap-1.5 text-[14px] font-bold text-ink/85"
              >
                <Lock className="h-4 w-4 text-accent" />
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  dir="ltr"
                  className={`${INPUT} text-start pr-10 ${
                    !showPassword ? "tracking-[0.22em] text-[18px] font-bold" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-ink/40 hover:text-ink transition"
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {state.error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-[14px] font-bold text-red-700">
                {state.error}
              </div>
            )}

            <SubmitButton />
          </form>
        </div>
      </div>
    </main>
  );
}
