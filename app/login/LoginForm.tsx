"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Button from "@/components/ui/Button";
import LogoMark from "@/components/ui/LogoMark";
import { login, type LoginState } from "./actions";

const INPUT =
  "w-full min-h-9 rounded-md border border-ink/16 bg-surface px-2.5 py-1.5 text-[15px] text-ink caret-accent placeholder:text-ink/65 hover:border-ink/45 focus-visible:border-accent focus-visible:outline-offset-0";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" className="mt-1 w-full" disabled={pending}>
      {pending ? "جارٍ الدخول…" : "دخول"}
    </Button>
  );
}

export default function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {
    error: null,
  });

  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="w-[min(400px,100%)]">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <LogoMark title="إدارة المشاريع" className="h-16 w-16" />
          <h1 className="text-[24px] leading-[1.2] font-semibold">
            إدارة المشاريع والمهام
          </h1>
          <p className="text-[14px] text-ink/55">لوحة تشغيل الفريق التقني</p>
        </div>

        <div className="border-t-[3px] border-accent pt-6">
          <form action={formAction} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="mb-[5px] block text-[13px] text-ink/70">
                البريد الإلكتروني
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                dir="ltr"
                className={`${INPUT} text-start`}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-[5px] block text-[13px] text-ink/70"
              >
                كلمة المرور
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                dir="ltr"
                className={`${INPUT} text-start`}
              />
            </div>

            {state.error && (
              <p role="alert" className="text-[14px] text-gold-800">
                {state.error}
              </p>
            )}

            <SubmitButton />
          </form>
        </div>
      </div>
    </main>
  );
}
