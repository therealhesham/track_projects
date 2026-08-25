"use client";

import { useState } from "react";
import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { ROLE_LABEL, type Viewer } from "@/lib/permissions";
import Button from "./ui/Button";
import LogoMark from "./ui/LogoMark";
import CreateUserModal from "./CreateUserModal";
import { Plus, UserPlus, LogOut, Shield } from "lucide-react";

export default function NavBar({
  viewer,
  canCreate,
}: {
  viewer: Viewer & { name: string; email: string };
  canCreate: boolean;
}) {
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const isSuperAdmin = viewer.role === "SUPER_ADMIN";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/90 backdrop-blur-sm">
        <div className="shell flex items-center gap-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-3 text-ink hover:text-ink"
            aria-label="الصفحة الرئيسية"
          >
            <LogoMark className="block h-9 w-9 flex-none" />
            <span className="flex flex-col leading-tight">
              <span className="text-[16px] font-bold text-ink">إدارة المشاريع</span>
              <span className="text-[11px] font-bold text-ink/55">الفريق التقني</span>
            </span>
          </Link>

          <div className="ms-auto flex items-center gap-3">
            <div className="flex flex-col items-end leading-tight">
              <span className="text-[14px] font-medium">{viewer.name}</span>
              <span className="text-[11px] text-ink/50">
                {ROLE_LABEL[viewer.role]}
              </span>
            </div>

            <span aria-hidden className="h-7 w-px bg-ink/12" />

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setCreateUserOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-ink/15 bg-surface px-3 py-1.5 text-[13px] font-medium text-ink transition hover:bg-paper hover:text-accent shadow-sm"
              >
                <UserPlus className="h-3.5 w-3.5 text-accent" />
                مستخدم جديد
              </button>
            )}

            {canCreate && (
              <Link href="/projects/new">
                <Button variant="primary" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[14px]">
                  <Plus className="h-4 w-4" />
                  مشروع جديد
                </Button>
              </Link>
            )}

            <form action={signOutAction}>
              <Button
                type="submit"
                variant="secondary"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[14px]"
              >
                <LogOut className="h-3.5 w-3.5" />
                خروج
              </Button>
            </form>
          </div>
        </div>
        <div className="h-px bg-gold/60" />
      </header>

      {createUserOpen && (
        <CreateUserModal
          onClose={() => setCreateUserOpen(false)}
        />
      )}
    </>
  );
}
