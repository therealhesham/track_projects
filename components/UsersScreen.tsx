"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import {
  USER_ROLE_FILTERS,
  USER_ROLE_RULE,
  USER_ROLE_TAG,
  type UserRoleFilterKey,
} from "@/lib/labels";
import type { UserCardView } from "@/lib/view";
import { SectionLabel } from "./ProjectDetail";
import ProgressBar from "./ui/ProgressBar";
import Segmented from "./ui/Segmented";
import StatusTag from "./ui/StatusTag";

/**
 * The super admin's roster: every account, and under each one the projects it
 * reaches — owned, managed, joined, or merely carrying a task. The data is
 * assembled on the server (lib/view#toUserCardView); this file only decides
 * what to show and holds the two filters.
 */
export default function UsersScreen({ users }: { users: UserCardView[] }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<UserRoleFilterKey>("ALL");

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((u) => {
      if (role !== "ALL" && u.role !== role) return false;
      if (!needle) return true;
      // Searching a person by the project they are on is the point of the page,
      // so the project names are part of the haystack.
      return [u.name, u.email, u.department ?? "", ...u.projects.map((p) => p.name)]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [users, query, role]);

  const activeCount = users.filter((u) => u.isActive).length;
  const unassigned = users.filter((u) => u.projects.length === 0).length;

  return (
    <div className="shell pt-[34px] pb-16">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-ink/10 pb-4">
        <div>
          <SectionLabel tone="gold">إدارة الحسابات</SectionLabel>
          <h1 className="mt-2.5 text-[27px] leading-[1.25] font-bold text-ink">
            المستخدمون ومشاريعهم
          </h1>
          <p className="mt-1.5 text-[14px] text-ink/80">
            {users.length} حساب · {activeCount} نشط
            {unassigned > 0 && ` · ${unassigned} بلا مشاريع`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-ink/60" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث باسم أو بريد أو مشروع…"
              aria-label="بحث في المستخدمين"
              className="w-[280px] rounded-md border border-ink/16 bg-paper py-[7px] pe-8 ps-9 text-[14px] text-ink outline-none transition placeholder:text-ink/60 focus:border-accent"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="مسح البحث"
                className="absolute inset-y-0 end-2 my-auto h-5 w-5 cursor-pointer rounded-sm text-ink/60 transition hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Explicit type argument: with `options` typed by annotation rather
              than `as const`, inference falls back to plain `string`. */}
          <Segmented<UserRoleFilterKey>
            name="urole"
            options={USER_ROLE_FILTERS}
            value={role}
            onChange={setRole}
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="pt-16 text-center text-[15px] text-ink/75">
          لا مستخدمين مطابقين لهذا البحث.
        </p>
      ) : (
        <div className="mt-7 grid grid-cols-1 items-start gap-5 sm:grid-cols-[repeat(auto-fill,minmax(380px,1fr))]">
          {shown.map((u) => (
            <UserCard key={u.id} user={u} />
          ))}
        </div>
      )}
    </div>
  );
}

function UserCard({ user }: { user: UserCardView }) {
  return (
    <article
      className={`flex flex-col overflow-hidden rounded-lg border border-ink/12 bg-paper shadow-sm transition hover:shadow-md ${
        user.isActive ? "" : "opacity-60"
      }`}
    >
      {/* The one flash of colour on the card, and it says which kind of
          account this is without spending a word on it. */}
      <div aria-hidden className={`h-[3px] ${USER_ROLE_RULE[user.role]}`} />

      <header className="flex items-start gap-3.5 px-5 pt-4">
        <span
          aria-hidden
          className="grid h-11 w-11 flex-none place-items-center rounded-md bg-accent-100 text-[15px] font-bold text-accent-800"
        >
          {user.initials}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[17px] leading-tight font-bold text-ink">
              {user.name}
            </h2>
            <span
              className={`inline-flex items-center rounded-sm px-2 py-[2px] text-[11.5px] tracking-[0.02em] ${USER_ROLE_TAG[user.role]}`}
            >
              {user.roleLabel}
            </span>
            {!user.isActive && (
              <span className="inline-flex items-center rounded-sm border border-ink/12 px-2 py-[2px] text-[11.5px] text-ink/75">
                معطّل
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[13px] text-ink/75" title={user.email}>
            {user.email}
          </p>
          <p className="text-[13px] text-ink/70">
            {user.department ?? "بلا قسم"} · انضم {user.joined}
          </p>
        </div>
      </header>

      <div className="mt-4 flex items-center gap-7 border-y border-ink/8 bg-surface/70 px-5 py-2.5">
        <Figure value={user.projects.length} label="مشروع" tone="text-accent" />
        <Figure value={user.taskTotal} label="مهمة" tone="text-ink" />
        <Figure value={`${user.pct}%`} label="إنجاز" tone="text-gold-600" />
        <ProgressBar pct={user.pct} className="ms-auto w-20" />
      </div>

      <div className="flex flex-1 flex-col px-5 pt-3.5 pb-4">
        <SectionLabel>المشاريع</SectionLabel>

        {user.projects.length === 0 ? (
          <p className="pt-3 pb-1 text-[13.5px] text-ink/70">
            لم يُسند إلى أي مشروع بعد.
          </p>
        ) : (
          <ul className="mt-2.5 flex flex-col gap-2">
            {user.projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="block rounded-md border border-ink/10 px-3 py-2 transition hover:border-accent/40 hover:bg-accent/5"
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[14.5px] font-bold text-ink">
                      {p.name}
                    </span>
                    {/* No projectId here on purpose: the whole row is already a
                        link, and StatusTag would nest one inside it. */}
                    <StatusTag status={p.status} className="ms-auto flex-none" />
                  </div>

                  <div className="mt-1 flex items-center gap-2.5 text-[13px] text-ink/75">
                    <span className="text-accent-600">{p.relationLabel}</span>
                    <span aria-hidden className="h-3 w-px bg-ink/12" />
                    <span className="tabular-nums">
                      {p.taskTotal === 0
                        ? "بلا مهام"
                        : `${p.taskDone}/${p.taskTotal} مهمة`}
                    </span>
                    {p.taskTotal > 0 && (
                      <ProgressBar pct={p.pct} className="ms-auto w-14" />
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

function Figure({
  value,
  label,
  tone,
}: {
  value: string | number;
  label: string;
  tone: string;
}) {
  return (
    <div>
      <div className={`text-[18px] leading-none font-bold tabular-nums ${tone}`}>
        {value}
      </div>
      <div className="mt-1 text-[11.5px] font-bold tracking-[0.02em] text-ink/80">
        {label}
      </div>
    </div>
  );
}
