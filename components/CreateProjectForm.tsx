"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createProject } from "@/app/actions";
import LogoMark from "./ui/LogoMark";

export type UserOption = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
};

type TaskDraft = {
  id: string;
  title: string;
  assigneeId: string;
};

type MemberDraft = {
  userId: string;
  role: "MANAGER" | "MEMBER";
};

export default function CreateProjectForm({
  users,
  creatorId,
}: {
  users: UserOption[];
  creatorId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Basic project fields
  const [name, setName] = useState("");
  const [kicker, setKicker] = useState("تطوير جديد");
  const [dept, setDept] = useState("التقنية");
  const [due, setDue] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [note, setNote] = useState("");
  const [ownerId, setOwnerId] = useState(creatorId || (users[0]?.id ?? ""));

  // Team members selection (defaults to all users as members)
  const [members, setMembers] = useState<MemberDraft[]>(
    users.map((u) => ({
      userId: u.id,
      role: u.id === (creatorId || users[0]?.id) ? "MANAGER" : "MEMBER",
    }))
  );

  // Initial tasks
  const [tasks, setTasks] = useState<TaskDraft[]>([
    { id: "t-1", title: "تحديد نطاق ومتطلبات المشروع", assigneeId: creatorId || "" },
    { id: "t-2", title: "توزيع مهام المرحلة الأولى", assigneeId: "" },
  ]);

  const [error, setError] = useState<string | null>(null);

  // Member helpers
  const toggleMember = (userId: string) => {
    setMembers((prev) => {
      const exists = prev.some((m) => m.userId === userId);
      if (exists) {
        return prev.filter((m) => m.userId !== userId);
      }
      return [...prev, { userId, role: "MEMBER" }];
    });
  };

  const changeMemberRole = (userId: string, role: "MANAGER" | "MEMBER") => {
    setMembers((prev) =>
      prev.map((m) => (m.userId === userId ? { ...m, role } : m))
    );
  };

  // Task helpers
  const addTaskRow = () => {
    setTasks((prev) => [
      ...prev,
      { id: `t-${Date.now()}-${Math.random()}`, title: "", assigneeId: "" },
    ]);
  };

  const removeTaskRow = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const updateTask = (id: string, field: "title" | "assigneeId", val: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: val } : t))
    );
  };

  // Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("اسم المشروع مطلوب");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await createProject({
        name,
        kicker,
        dept,
        due,
        githubUrl: githubUrl || undefined,
        note,
        ownerId: ownerId || undefined,
        members: members.map((m) => ({ userId: m.userId, role: m.role })),
        tasks: tasks
          .filter((t) => t.title.trim().length > 0)
          .map((t) => ({ title: t.title, assigneeId: t.assigneeId || undefined })),
        creatorId,
      });

      if (!res.ok) {
        setError(res.error);
        return;
      }

      router.push("/");
      router.refresh();
    });
  };

  // Users that are currently selected as team members
  const selectedUserIds = new Set(members.map((m) => m.userId));

  return (
    <div className="min-h-screen bg-paper pb-24 pt-8 text-ink">
      {/* Top Header Bar */}
      <div className="mx-auto max-w-[960px] px-6">
        <div className="flex items-center justify-between border-b-2 border-accent pb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-md border border-ink/15 bg-white px-3 py-1.5 text-[13px] font-medium text-ink/70 hover:bg-ink/5 transition-colors"
            >
              <span>→</span> الرجوع للمشاريع
            </Link>
            <div>
              <h1 className="text-2xl font-semibold leading-tight">
                إنشاء مشروع جديد
              </h1>
              <p className="text-[13px] text-ink/55">
                إعداد بيانات المشروع، اختيار أعضاء الفريق، وتوزيع المهام المبدئية
              </p>
            </div>
          </div>
          <LogoMark title="روائس" className="h-12 w-12" />
        </div>
      </div>

      {/* Main Form Body */}
      <form onSubmit={handleSubmit} className="mx-auto max-w-[960px] px-6 pt-8">
        {error && (
          <div className="mb-6 rounded-md border border-red-300 bg-red-50 p-4 text-[15px] text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-10">
          {/* ──── Section 1: Basic Project Info ──── */}
          <section className="rounded-lg border border-ink/12 bg-surface p-6 shadow-sm">
            <div className="mb-5 border-b border-ink/10 pb-3">
              <span className="text-[12px] font-semibold tracking-wider text-gold-800 uppercase">
                الخطوة الأولى
              </span>
              <h2 className="text-lg font-semibold">تفاصيل المشروع الأساسية</h2>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Project Name */}
              <div className="md:col-span-2">
                <label
                  htmlFor="p-name"
                  className="mb-1.5 block text-[13px] font-medium text-ink/75"
                >
                  اسم المشروع <span className="text-red-500">*</span>
                </label>
                <input
                  id="p-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: تطوير منصة التتبع وتكامل الخدمات"
                  className="w-full rounded-md border border-ink/20 bg-white px-3.5 py-2 text-[15px] outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* Kicker / Category */}
              <div>
                <label
                  htmlFor="p-kicker"
                  className="mb-1.5 block text-[13px] font-medium text-ink/75"
                >
                  التصنيف / العبارة العلوية
                </label>
                <input
                  id="p-kicker"
                  type="text"
                  value={kicker}
                  onChange={(e) => setKicker(e.target.value)}
                  placeholder="مثال: تطوير داخلي / الربع الثالث"
                  className="w-full rounded-md border border-ink/20 bg-white px-3.5 py-2 text-[15px] outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* Department */}
              <div>
                <label
                  htmlFor="p-dept"
                  className="mb-1.5 block text-[13px] font-medium text-ink/75"
                >
                  القسم التابع له
                </label>
                <input
                  id="p-dept"
                  type="text"
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  placeholder="مثال: التقنية / البنية التحتية"
                  className="w-full rounded-md border border-ink/20 bg-white px-3.5 py-2 text-[15px] outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* Project Owner */}
              <div>
                <label
                  htmlFor="p-owner"
                  className="mb-1.5 block text-[13px] font-medium text-ink/75"
                >
                  المسؤول الرئيسي عن المشروع
                </label>
                <select
                  id="p-owner"
                  value={ownerId}
                  onChange={(e) => {
                    const newOwnerId = e.target.value;
                    setOwnerId(newOwnerId);
                    // Ensure owner is added to members as MANAGER
                    if (newOwnerId && !selectedUserIds.has(newOwnerId)) {
                      setMembers((prev) => [
                        ...prev,
                        { userId: newOwnerId, role: "MANAGER" },
                      ]);
                    } else if (newOwnerId) {
                      changeMemberRole(newOwnerId, "MANAGER");
                    }
                  }}
                  className="w-full rounded-md border border-ink/20 bg-white px-3.5 py-2 text-[15px] outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  <option value="">— بدون تحديد —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label
                  htmlFor="p-due"
                  className="mb-1.5 block text-[13px] font-medium text-ink/75"
                >
                  تاريخ التسليم المستهدف
                </label>
                <input
                  id="p-due"
                  type="date"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  className="w-full rounded-md border border-ink/20 bg-white px-3.5 py-2 text-[15px] outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* GitHub Repo URL */}
              <div className="md:col-span-2">
                <label
                  htmlFor="p-github"
                  className="mb-1.5 block text-[13px] font-medium text-ink/75"
                >
                  رابط مستودع GitHub (اختياري)
                </label>
                <input
                  id="p-github"
                  type="text"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/owner/repository"
                  className="w-full rounded-md border border-ink/20 bg-white px-3.5 py-2 text-[15px] outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* Project Description / Scope */}
              <div className="md:col-span-2">
                <label
                  htmlFor="p-note"
                  className="mb-1.5 block text-[13px] font-medium text-ink/75"
                >
                  وصف ونطاق عمل المشروع
                </label>
                <textarea
                  id="p-note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="اكتب نبذة مختصرة عن نطاق العمل والأهداف المطلوبة…"
                  className="w-full rounded-md border border-ink/20 bg-white px-3.5 py-2 text-[15px] outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
          </section>

          {/* ──── Section 2: Project Members ──── */}
          <section className="rounded-lg border border-ink/12 bg-surface p-6 shadow-sm">
            <div className="mb-4 border-b border-ink/10 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[12px] font-semibold tracking-wider text-gold-800 uppercase">
                  الخطوة الثانية
                </span>
                <h2 className="text-lg font-semibold">فريق عمل المشروع</h2>
              </div>
              <span className="rounded-full bg-accent/10 px-3 py-1 text-[13px] font-medium text-accent">
                تم اختيار {members.length} من أصل {users.length} عضو
              </span>
            </div>

            <p className="mb-4 text-[13px] text-ink/60">
              حدّد الأعضاء المشاركين في هذا المشروع وحدد دور كل منهم (مدير أو عضو):
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((u) => {
                const isSelected = selectedUserIds.has(u.id);
                const currentMember = members.find((m) => m.userId === u.id);
                const isOwner = u.id === ownerId;

                return (
                  <div
                    key={u.id}
                    className={`flex flex-col justify-between rounded-md border p-3.5 transition-all ${
                      isSelected
                        ? "border-accent/40 bg-accent/5 shadow-xs"
                        : "border-ink/12 bg-white opacity-70 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id={`m-cb-${u.id}`}
                        checked={isSelected}
                        disabled={isOwner} // Owner must remain member
                        onChange={() => toggleMember(u.id)}
                        className="mt-0.5 h-4 w-4 rounded border-ink/30 text-accent focus:ring-accent"
                      />
                      <label
                        htmlFor={`m-cb-${u.id}`}
                        className="cursor-pointer select-none flex-1"
                      >
                        <div className="text-[15px] font-semibold text-ink">
                          {u.name}
                          {isOwner && (
                            <span className="ms-1.5 rounded bg-gold-100 px-1.5 py-0.5 text-[11px] font-medium text-gold-800">
                              المسؤول الرئيسي
                            </span>
                          )}
                        </div>
                        <div className="text-[13px] text-ink/50">{u.email}</div>
                      </label>
                    </div>

                    {isSelected && (
                      <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-2 text-[12px]">
                        <span className="text-ink/55">الدور في المشروع:</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => changeMemberRole(u.id, "MANAGER")}
                            className={`rounded px-2 py-0.5 text-[12px] font-medium ${
                              currentMember?.role === "MANAGER"
                                ? "bg-accent text-white"
                                : "bg-ink/5 text-ink/60 hover:bg-ink/10"
                            }`}
                          >
                            مدير
                          </button>
                          <button
                            type="button"
                            onClick={() => changeMemberRole(u.id, "MEMBER")}
                            className={`rounded px-2 py-0.5 text-[12px] font-medium ${
                              currentMember?.role === "MEMBER"
                                ? "bg-accent text-white"
                                : "bg-ink/5 text-ink/60 hover:bg-ink/10"
                            }`}
                          >
                            عضو
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ──── Section 3: Dynamic Initial Tasks ──── */}
          <section className="rounded-lg border border-ink/12 bg-surface p-6 shadow-sm">
            <div className="mb-4 border-b border-ink/10 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[12px] font-semibold tracking-wider text-gold-800 uppercase">
                  الخطوة الثالثة
                </span>
                <h2 className="text-lg font-semibold">مهام المشروع الأولية وإسنادها</h2>
              </div>
              <button
                type="button"
                onClick={addTaskRow}
                className="flex items-center gap-1.5 rounded-md border border-accent bg-accent/10 px-3 py-1.5 text-[13px] font-semibold text-accent hover:bg-accent/20 transition-colors"
              >
                <span>+</span> إضافة مهمة أخرى
              </button>
            </div>

            <p className="mb-4 text-[13px] text-ink/60">
              أضف المهام المطلوبة للبدء في هذا المشروع وخصّص كل مهمة للعضو المناسب:
            </p>

            <div className="flex flex-col gap-3">
              {tasks.map((t, idx) => (
                <div
                  key={t.id}
                  className="flex flex-col gap-2 rounded-md border border-ink/12 bg-white p-3 sm:flex-row sm:items-center"
                >
                  <span className="text-[13px] font-semibold text-ink/40 sm:w-6">
                    #{idx + 1}
                  </span>

                  {/* Task Title */}
                  <input
                    type="text"
                    value={t.title}
                    onChange={(e) => updateTask(t.id, "title", e.target.value)}
                    placeholder="عنوان المهمة…"
                    className="flex-1 rounded-md border border-ink/20 bg-surface px-3 py-1.5 text-[15px] outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />

                  {/* Assignee Selection */}
                  <select
                    value={t.assigneeId}
                    onChange={(e) => updateTask(t.id, "assigneeId", e.target.value)}
                    className="rounded-md border border-ink/20 bg-surface px-3 py-1.5 text-[15px] outline-none focus:border-accent focus:ring-1 focus:ring-accent sm:w-56"
                  >
                    <option value="">— بدون تكليف —</option>
                    {users
                      .filter((u) => selectedUserIds.has(u.id))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                  </select>

                  {/* Remove Task Button */}
                  <button
                    type="button"
                    onClick={() => removeTaskRow(t.id)}
                    title="حذف المهمة"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-ink/30 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {tasks.length === 0 && (
                <div className="rounded-md border border-dashed border-ink/20 py-8 text-center text-[13px] text-ink/50">
                  لم تُضف أي مهام بعد. اضغط على «إضافة مهمة أخرى» للبدء.
                </div>
              )}
            </div>
          </section>

          {/* ──── Bottom Actions Bar ──── */}
          <div className="flex items-center justify-end gap-3 border-t border-ink/15 pt-6">
            <Link
              href="/"
              className="rounded-md border border-ink/20 px-5 py-2.5 text-[15px] font-medium text-ink/70 hover:bg-ink/5 transition-colors"
            >
              إلغاء
            </Link>
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="rounded-md bg-accent px-7 py-2.5 text-[15px] font-semibold text-white shadow-md disabled:opacity-40 hover:bg-accent-600 transition-all"
            >
              {pending ? "جارٍ إنشاء المشروع…" : "إنشاء المشروع والمهام"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
