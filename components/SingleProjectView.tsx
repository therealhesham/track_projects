"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signOutAction } from "@/app/actions";
import {
  approveTask,
  rejectTask,
  requestCompletion,
  approveCompletion,
  rejectCompletion,
  deleteTask,
  addTask,
  updateProjectDates,
  updateProjectDetails,
} from "@/app/actions";
import { APPROVAL_STATUS_TAG, STATUS_LABEL } from "@/lib/labels";
import type { Viewer } from "@/lib/permissions";
import type { ProjectView, TaskView } from "@/lib/view";
import { RoleProvider, useRole, type CurrentUser } from "./RoleContext";
import ProjectCalendar from "./ProjectCalendar";
import TeamPanel, { type UserOption } from "./TeamPanel";
import GithubCommitsTab from "./GithubCommitsTab";
import {
  ChevronRight,
  LogOut,
  Calendar,
  ListTodo,
  Users,
  Plus,
  Check,
  X,
  Clock,
  Building2,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  FolderKanban,
  Trash2,
  Edit3,
  GitCommit,
} from "lucide-react";

// ─── status palette ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { text: string; dot: string; pill: string }> = {
  PLANNING: { text: "text-accent",   dot: "bg-accent",   pill: "bg-accent/8 text-accent border-accent/20"   },
  ACTIVE:   { text: "text-accent",   dot: "bg-accent",   pill: "bg-accent/8 text-accent border-accent/20"   },
  BLOCKED:  { text: "text-gold-800", dot: "bg-gold",     pill: "bg-gold-100 text-gold-800 border-gold-600/20"},
  DONE:     { text: "text-mute-800", dot: "bg-mute-800", pill: "bg-mute-100 text-mute-800 border-ink/10"    },
};

// ─── Top-level export ─────────────────────────────────────────────────────────

export default function SingleProjectView({
  viewer,
  project,
  allUsers = [],
}: {
  viewer: Viewer & { name: string; email: string };
  project: ProjectView;
  allUsers?: UserOption[];
}) {
  const currentUser: CurrentUser = {
    id: viewer.id,
    name: viewer.name,
    role: viewer.role,
  };
  return (
    <RoleProvider viewer={currentUser}>
      <ProjectPage viewer={viewer} project={project} allUsers={allUsers} />
    </RoleProvider>
  );
}

// ─── Inner page ───────────────────────────────────────────────────────────────

function ProjectPage({
  viewer,
  project,
  allUsers = [],
}: {
  viewer: Viewer & { name: string; email: string };
  project: ProjectView;
  allUsers?: UserOption[];
}) {
  const { currentUser } = useRole();
  const isSuperAdmin = currentUser.role === "SUPER_ADMIN";

  const [activeTab, setActiveTab] = useState<"tasks" | "calendar" | "team" | "github">("tasks");
  const [addOpen, setAddOpen] = useState(false);

  // Date Editing state
  const [editDatesOpen, setEditDatesOpen] = useState(false);
  const [startDateInput, setStartDateInput] = useState(project.startDate || "");
  const [dueDateInput, setDueDateInput] = useState("");
  const [datesPending, startDatesTransition] = useTransition();

  // Project Details Editing state
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);
  const [nameInput, setNameInput] = useState(project.name);
  const [kickerInput, setKickerInput] = useState(project.kicker || "");
  const [deptInput, setDeptInput] = useState(project.dept || "");
  const [statusInput, setStatusInput] = useState(project.status);
  const [ownerIdInput, setOwnerIdInput] = useState(project.ownerId || "");
  const [githubUrlInput, setGithubUrlInput] = useState(project.githubUrl || "");
  const [noteInput, setNoteInput] = useState(project.note || "");
  const [detailsPending, startDetailsTransition] = useTransition();

  const colors = STATUS_COLORS[project.status] ?? STATUS_COLORS.ACTIVE;

  const canAddTask = true;

  const visibleTasks =
    currentUser.role === "SUPER_ADMIN"
      ? project.tasks
      : project.tasks.filter(
          (t) =>
            t.approvalStatus !== "PENDING_APPROVAL" ||
            t.assigneeId === currentUser.id,
        );

  const pendingCount = project.tasks.filter(
    (t) => t.approvalStatus === "PENDING_APPROVAL",
  ).length;

  const totalCount = visibleTasks.filter(
    (t) => t.approvalStatus !== "REJECTED",
  ).length;

  const meta = [
    project.dept,
    project.owner && `المسؤول: ${project.owner}`,
    project.startDate && `البداية: ${project.startDate}`,
    project.due && `التسليم: ${project.due}`,
  ].filter(Boolean).join("  ·  ");

  const handleSaveDates = () => {
    startDatesTransition(async () => {
      await updateProjectDates({
        projectId: project.id,
        startDate: startDateInput || null,
        dueDate: dueDateInput || null,
      });
      setEditDatesOpen(false);
    });
  };

  const handleSaveDetails = () => {
    startDetailsTransition(async () => {
      await updateProjectDetails({
        projectId: project.id,
        name: nameInput,
        kicker: kickerInput || null,
        department: deptInput || null,
        status: statusInput,
        ownerId: ownerIdInput || null,
        githubUrl: githubUrlInput || null,
        note: noteInput || null,
      });
      setEditDetailsOpen(false);
    });
  };

  return (
    <div className="min-h-screen bg-paper text-ink" dir="rtl">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-ink/8 bg-paper/95 backdrop-blur-md">
        <div className="shell flex h-14 items-center gap-3">

          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] text-ink/50 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            المشاريع
          </Link>

          <span className="select-none text-ink/20">/</span>

          <span className="max-w-xs truncate text-[13px] font-medium text-ink">
            {project.name}
          </span>

          {/* Right side */}
          <div className="ms-auto flex items-center gap-3">
            <span className="hidden text-[13px] text-ink/40 sm:block">{viewer.name}</span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink/12 px-3 py-1 text-[13px] text-ink/55 transition hover:border-ink/25 hover:text-ink"
              >
                <LogOut className="h-3.5 w-3.5" />
                خروج
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="shell pt-10 pb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {/* Status pill */}
            <span
              className={`mb-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium tracking-wide ${colors.pill}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} aria-hidden />
              {STATUS_LABEL[project.status]}
              {project.kicker && (
                <span className="ms-1 opacity-60">· {project.kicker}</span>
              )}
            </span>

            {/* Title */}
            <h1 className="text-[32px] font-bold leading-[1.12] tracking-tight text-ink">
              {project.name}
            </h1>

            {/* Meta */}
            {meta && (
              <p className="mt-2 text-[14px] leading-relaxed text-ink/45">
                {meta}
              </p>
            )}
          </div>

          {/* Super Admin Quick Actions */}
          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditDetailsOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-ink/15 bg-surface px-3.5 py-2 text-[13px] font-medium text-ink/70 shadow-sm transition hover:bg-paper hover:text-ink"
              >
                <Edit3 className="h-4 w-4 text-accent" />
                تعديل بيانات المشروع
              </button>

              <button
                type="button"
                onClick={() => setEditDatesOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-ink/15 bg-surface px-3.5 py-2 text-[13px] font-medium text-ink/70 shadow-sm transition hover:bg-paper hover:text-ink"
              >
                <CalendarDays className="h-4 w-4 text-accent" />
                تعديل التواريخ
              </button>
            </div>
          )}
        </div>

        {/* Note */}
        {project.note && (
          <p className="mt-4 max-w-[56ch] text-[14px] text-pretty leading-[1.8] text-ink/60 border-s-2 border-ink/10 ps-4">
            {project.note}
          </p>
        )}

        {/* ── Stats strip ─────────────────────────────────────────────── */}
        <div className="mt-8 flex flex-wrap items-end gap-x-10 gap-y-4 border-t border-ink/8 pt-6">
          <Stat value={`${project.pct}%`}       label="الإنجاز"              accent />
          <Stat value={String(project.doneCount)} label="مكتملة"             />
          <Stat value={String(project.total - project.doneCount)} label="متبقية" />
          {pendingCount > 0 && currentUser.role === "SUPER_ADMIN" && (
            <Stat value={String(pendingCount)} label="انتظار الاعتماد" warn />
          )}

          {/* ── Progress ring ────────────────────────────────────────── */}
          <div className="ms-auto hidden sm:block">
            <ProgressRing pct={project.pct} />
          </div>
        </div>

        {/* Linear progress bar */}
        <div className="mt-6 h-[2px] w-full rounded-full bg-ink/8">
          <div
            className="h-full rounded-full bg-accent transition-all duration-700"
            style={{ width: `${project.pct}%` }}
          />
        </div>

        {/* ── Tabs Header ──────────────────────────────────────────────── */}
        <div className="mt-8 flex items-center gap-2 border-b border-ink/10">
          <TabButton
            active={activeTab === "tasks"}
            onClick={() => setActiveTab("tasks")}
            icon={<ListTodo className="h-4 w-4" />}
            label="المهام"
            count={totalCount}
          />
          <TabButton
            active={activeTab === "calendar"}
            onClick={() => setActiveTab("calendar")}
            icon={<Calendar className="h-4 w-4" />}
            label="التقويم والجدول الزمني"
          />
          <TabButton
            active={activeTab === "team"}
            onClick={() => setActiveTab("team")}
            icon={<Users className="h-4 w-4" />}
            label="فريق العمل"
            count={project.members.length}
          />
          <TabButton
            active={activeTab === "github"}
            onClick={() => setActiveTab("github")}
            icon={<GitCommit className="h-4 w-4" />}
            label="تحديثات GitHub"
          />
        </div>
      </div>

      {/* ── Body Content by Tab ──────────────────────────────────────────── */}
      <div className="shell pb-20">
        {activeTab === "tasks" && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">

            {/* Tasks panel */}
            <section>
              <div className="mb-4 flex items-center gap-2.5">
                <h2 className="text-[12px] font-medium tracking-[0.08em] text-ink/40 uppercase">
                  قائمة المهام
                </h2>
                <span className="rounded-full bg-ink/6 px-2 py-0.5 text-[11px] tabular-nums text-ink/45">
                  {totalCount}
                </span>
                {canAddTask && (
                  <button
                    type="button"
                    onClick={() => setAddOpen(true)}
                    className="ms-auto inline-flex items-center gap-1.5 rounded-lg border border-accent/25 bg-accent/6 px-3.5 py-1.5 text-[13px] font-medium text-accent transition-all hover:bg-accent hover:text-white hover:border-accent hover:shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    مهمة جديدة
                  </button>
                )}
              </div>

              {visibleTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-ink/12 py-20 text-center text-[14px] text-ink/30">
                  لا مهام لهذا المشروع بعد.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-ink/10 shadow-sm">
                  {visibleTasks.map((task, i) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      who={task.assignee ?? project.owner}
                      isLast={i === visibleTasks.length - 1}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Sidebar */}
            <aside className="flex flex-col gap-5 lg:mt-8">
              {/* Details card */}
              <SideCard title="تفاصيل المشروع">
                <dl className="divide-y divide-ink/6">
                  {project.dept  && <Row label="القسم"       value={project.dept} />}
                  {project.owner && <Row label="المسؤول"     value={project.owner} />}
                  <Row label="البداية"      value={project.startDate ? project.startDate : "غير محدد"} />
                  <Row label="التسليم"     value={project.due} />
                  <Row label="المهام"      value={`${project.doneCount} / ${project.total}`} />
                  <Row label="الحالة"      value={STATUS_LABEL[project.status]} accent={colors.text} />
                </dl>
              </SideCard>

              {/* Activity card */}
              {project.activity.length > 0 && (
                <SideCard title="آخر التحديثات">
                  <div className="flex flex-col divide-y divide-ink/6">
                    {project.activity.map((a, i) => (
                      <div key={i} className="flex gap-3 py-3 text-[13px]">
                        <span className="w-12 shrink-0 pt-[2px] text-[11px] tabular-nums text-ink/30">{a.when}</span>
                        <span className="leading-[1.65] text-ink/65">{a.what}</span>
                      </div>
                    ))}
                  </div>
                </SideCard>
              )}
            </aside>
          </div>
        )}

        {activeTab === "calendar" && (
          <ProjectCalendar project={project} />
        )}

        {activeTab === "team" && (
          <TeamPanel project={project} allUsers={allUsers} />
        )}

        {activeTab === "github" && (
          <div className="pt-6">
            <GithubCommitsTab
              projectId={project.id}
              githubUrl={project.githubUrl}
              canEdit={isSuperAdmin || viewer.role === "MANAGER"}
            />
          </div>
        )}
      </div>

      {/* Add task dialog */}
      {addOpen && (
        <AddTaskModal project={project} onClose={() => setAddOpen(false)} />
      )}

      {/* Edit Dates Dialog for Super Admin */}
      {editDatesOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditDatesOpen(false);
          }}
        >
          <div className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-ink/10 bg-paper shadow-lg">
            <div className="flex items-center justify-between border-b border-ink/8 px-6 pt-6 pb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-accent" />
                <h3 className="text-[17px] font-semibold text-ink">
                  تعديل تواريخ المشروع
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditDatesOpen(false)}
                className="rounded-lg p-1.5 text-ink/35 hover:bg-ink/5 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4 px-6 py-5">
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-ink/50">
                  تاريخ بداية المشروع
                </span>
                <input
                  type="date"
                  value={startDateInput}
                  onChange={(e) => setStartDateInput(e.target.value)}
                  className="w-full rounded-xl border border-ink/15 bg-paper px-3.5 py-2.5 text-[14px] text-ink outline-none transition focus:border-accent"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-ink/50">
                  تاريخ نهاية (تسليم) المشروع
                </span>
                <input
                  type="date"
                  value={dueDateInput}
                  onChange={(e) => setDueDateInput(e.target.value)}
                  className="w-full rounded-xl border border-ink/15 bg-paper px-3.5 py-2.5 text-[14px] text-ink outline-none transition focus:border-accent"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2.5 border-t border-ink/8 px-6 py-4">
              <button
                type="button"
                onClick={() => setEditDatesOpen(false)}
                className="rounded-xl border border-ink/12 px-4 py-2 text-[14px] text-ink/60 transition hover:bg-ink/5"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveDates}
                disabled={datesPending}
                className="rounded-xl bg-accent px-5 py-2 text-[14px] font-semibold text-white transition disabled:opacity-40 hover:bg-accent-600"
              >
                {datesPending ? "جارٍ الحفظ…" : "حفظ التغييرات"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Details Dialog */}
      {editDetailsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditDetailsOpen(false);
          }}
        >
          <div className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-ink/10 bg-paper shadow-lg">
            <div className="flex items-center justify-between border-b border-ink/8 px-6 pt-6 pb-4">
              <div className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-accent" />
                <h3 className="text-[17px] font-semibold text-ink">
                  تعديل بيانات المشروع
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditDetailsOpen(false)}
                className="rounded-lg p-1.5 text-ink/35 hover:bg-ink/5 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3.5 px-6 py-5">
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-ink/50">
                  اسم المشروع <span className="text-red-400">*</span>
                </span>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full rounded-xl border border-ink/15 bg-paper px-3.5 py-2.5 text-[14px] text-ink outline-none transition focus:border-accent"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] font-medium text-ink/50">
                    القسم
                  </span>
                  <input
                    type="text"
                    value={deptInput}
                    onChange={(e) => setDeptInput(e.target.value)}
                    className="w-full rounded-xl border border-ink/15 bg-paper px-3.5 py-2 text-[13px] text-ink outline-none transition focus:border-accent"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[12px] font-medium text-ink/50">
                    حالة المشروع
                  </span>
                  <select
                    value={statusInput}
                    onChange={(e) =>
                      setStatusInput(
                        e.target.value as "PLANNING" | "ACTIVE" | "BLOCKED" | "DONE"
                      )
                    }
                    className="w-full rounded-xl border border-ink/15 bg-paper px-3 py-2 text-[13px] text-ink outline-none transition focus:border-accent"
                  >
                    <option value="PLANNING">تخطيط (PLANNING)</option>
                    <option value="ACTIVE">قائم (ACTIVE)</option>
                    <option value="BLOCKED">متعطل (BLOCKED)</option>
                    <option value="DONE">مكتمل (DONE)</option>
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-ink/50">
                  رابط مستودع GitHub (مثال: https://github.com/owner/repo)
                </span>
                <input
                  type="text"
                  value={githubUrlInput}
                  onChange={(e) => setGithubUrlInput(e.target.value)}
                  placeholder="https://github.com/owner/repository"
                  className="w-full rounded-xl border border-ink/15 bg-paper px-3.5 py-2 text-[13px] text-ink outline-none transition focus:border-accent"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-ink/50">
                  المسؤول عن المشروع
                </span>
                <select
                  value={ownerIdInput}
                  onChange={(e) => setOwnerIdInput(e.target.value)}
                  className="w-full rounded-xl border border-ink/15 bg-paper px-3.5 py-2 text-[13px] text-ink outline-none transition focus:border-accent"
                >
                  <option value="">— بدون مسؤول محدد —</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-ink/50">
                  وصف أو ملاحظات المشروع
                </span>
                <textarea
                  rows={3}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  className="w-full rounded-xl border border-ink/15 bg-paper px-3.5 py-2 text-[13px] text-ink outline-none transition focus:border-accent resize-none"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2.5 border-t border-ink/8 px-6 py-4">
              <button
                type="button"
                onClick={() => setEditDetailsOpen(false)}
                className="rounded-xl border border-ink/12 px-4 py-2 text-[14px] text-ink/60 transition hover:bg-ink/5"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveDetails}
                disabled={detailsPending || !nameInput.trim()}
                className="rounded-xl bg-accent px-5 py-2 text-[14px] font-semibold text-white transition disabled:opacity-40 hover:bg-accent-600"
              >
                {detailsPending ? "جارٍ الحفظ…" : "حفظ التغييرات"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TabButton ────────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center gap-2 px-4 py-3 text-[14px] font-medium transition-colors ${
        active
          ? "text-accent"
          : "text-ink/50 hover:text-ink"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {typeof count === "number" && (
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] tabular-nums ${
            active ? "bg-accent/10 text-accent" : "bg-ink/6 text-ink/50"
          }`}
        >
          {count}
        </span>
      )}

      {/* Active Indicator Line */}
      {active && (
        <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-accent" />
      )}
    </button>
  );
}

// ─── SideCard ─────────────────────────────────────────────────────────────────

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink/10 bg-paper shadow-sm">
      <div className="border-b border-ink/8 px-5 py-3">
        <span className="text-[11px] font-medium tracking-[0.08em] uppercase text-ink/40">
          {title}
        </span>
      </div>
      <div className="px-5">{children}</div>
    </div>
  );
}

// ─── Row (sidebar detail) ─────────────────────────────────────────────────────

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-3 text-[13px]">
      <dt className="shrink-0 text-ink/40">{label}</dt>
      <dd className={`text-end font-medium ${accent ?? "text-ink/80"}`}>{value}</dd>
    </div>
  );
}

// ─── Stat ─────────────────────────────────────────────────────────────────────

function Stat({ value, label, accent, warn }: {
  value: string;
  label: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div>
      <div className={`text-[36px] font-semibold leading-none tabular-nums ${
        warn ? "text-gold-800" : accent ? "text-accent" : "text-ink/80"
      }`}>
        {value}
      </div>
      <div className="mt-1.5 text-[12px] text-ink/40">{label}</div>
    </div>
  );
}

// ─── ProgressRing ─────────────────────────────────────────────────────────────

function ProgressRing({ pct }: { pct: number }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90">
      <circle cx="38" cy="38" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-ink/8" />
      <circle
        cx="38" cy="38" r={r} fill="none"
        stroke="currentColor" strokeWidth="4"
        strokeLinecap="round"
        className="text-accent transition-all duration-700"
        strokeDasharray={circ}
        strokeDashoffset={offset}
      />
      <text
        x="38" y="44"
        textAnchor="middle"
        className="fill-ink text-[12px] font-semibold"
        style={{ fontSize: 13, transform: "rotate(90deg)", transformOrigin: "38px 38px" }}
      >
        {pct}%
      </text>
    </svg>
  );
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────

function TaskCard({ task, who, isLast }: {
  task: TaskView;
  who?: string | null;
  isLast: boolean;
}) {
  const { currentUser } = useRole();
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const isSuperAdmin = currentUser.role === "SUPER_ADMIN";
  const isManager    = currentUser.role === "MANAGER";
  const isMember     = currentUser.role === "MEMBER";
  const isMyTask     = task.assigneeId === currentUser.id;

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => { await fn(); });

  const isDone              = task.approvalStatus === "DONE";
  const isRejected          = task.approvalStatus === "REJECTED";
  const isPending           = task.approvalStatus === "PENDING_APPROVAL";
  const isPendingCompletion = task.approvalStatus === "PENDING_COMPLETION";
  const badgeClass          = APPROVAL_STATUS_TAG[task.approvalStatus];

  return (
    <div
      className={`group relative flex items-start gap-4 px-5 py-4 transition-colors hover:bg-ink/[0.02] ${
        !isLast ? "border-b border-ink/8" : ""
      } ${pending ? "pointer-events-none opacity-40" : ""}`}
    >
      {/* State icon */}
      <span
        aria-hidden
        className={`mt-[3px] grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[11px] font-medium transition-colors ${
          isDone
            ? "border-accent bg-accent text-white"
            : isRejected
            ? "border-red-200 bg-red-50 text-red-400"
            : "border-ink/20 bg-transparent text-transparent"
        }`}
      >
        {isDone ? <Check className="h-3.5 w-3.5" /> : isRejected ? <X className="h-3.5 w-3.5" /> : null}
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <span
            className={`text-[15px] leading-snug ${
              isDone     ? "line-through text-ink/35" :
              isRejected ? "line-through text-ink/30" :
              "text-ink"
            }`}
          >
            {task.title}
          </span>
          <span className={`rounded-full border px-2 py-[2px] text-[11px] font-medium whitespace-nowrap ${badgeClass}`}>
            {task.approvalStatusLabel}
          </span>
        </div>

        {/* Sub-meta */}
        <div className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-ink/35">
          {who && <span>{who}</span>}
          {task.completedDay && <span className="tabular-nums">{task.completedDay}</span>}
          {task.completionNote && isPendingCompletion && (
            <span className="italic">"{task.completionNote}"</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="ms-auto flex shrink-0 items-center gap-1.5">
        {isPending && isSuperAdmin && (
          <>
            <Pill label="اعتماد" variant="accept" onClick={() => run(() => approveTask(task.id))} />
            <Pill label="رفض"    variant="reject" onClick={() => run(() => rejectTask(task.id))} />
          </>
        )}

        {task.approvalStatus === "ACTIVE" && isMember && isMyTask && (
          showNoteInput ? (
            <>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ملاحظة..."
                className="w-28 rounded-lg border border-ink/20 bg-white px-2 py-0.5 text-[12px] outline-none focus:border-accent"
                autoFocus
              />
              <Pill label="تأكيد" variant="accept" onClick={() => run(async () => {
                const r = await requestCompletion(task.id, note);
                if (r.ok) setShowNoteInput(false);
                return r;
              })} />
              <Pill label="إلغاء" variant="neutral" onClick={() => setShowNoteInput(false)} />
            </>
          ) : (
            <Pill label="تسجيل إتمام" variant="accept" onClick={() => setShowNoteInput(true)} />
          )
        )}

        {isPendingCompletion && (isManager || isSuperAdmin) && (
          <>
            <Pill label="موافقة" variant="accept" onClick={() => run(() => approveCompletion(task.id))} />
            <Pill label="رفض"    variant="reject" onClick={() => run(() => rejectCompletion(task.id))} />
          </>
        )}

        {isSuperAdmin && !isDone && (
          <button
            type="button"
            title="حذف المهمة"
            onClick={() => run(() => deleteTask(task.id))}
            aria-label={`حذف: ${task.title}`}
            className="ms-1 rounded p-1 text-[12px] text-ink/15 opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Pill button ──────────────────────────────────────────────────────────────

function Pill({ label, variant, onClick }: {
  label: string;
  variant: "accept" | "reject" | "neutral";
  onClick: () => void;
}) {
  const cls = {
    accept:  "border-accent/30 bg-accent/8 text-accent hover:bg-accent hover:text-white hover:border-accent",
    reject:  "border-red-200 bg-red-50 text-red-600 hover:bg-red-100",
    neutral: "border-ink/12 bg-transparent text-ink/50 hover:bg-ink/5",
  }[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-0.5 text-[12px] font-medium transition-all ${cls}`}
    >
      {label}
    </button>
  );
}

// ─── AddTaskModal ─────────────────────────────────────────────────────────────

function AddTaskModal({ project, onClose }: { project: ProjectView; onClose: () => void }) {
  const [title, setTitle]       = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await addTask({
        projectId: project.id,
        title,
        assigneeId: assigneeId || undefined,
      });
      if (!result.ok) { setError(result.error); return; }
      onClose();
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-ink/10 bg-paper shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-accent" />
            <h2 className="text-[17px] font-semibold text-ink">إضافة مهمة جديدة</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[13px] text-ink/35 transition hover:bg-ink/6 hover:text-ink"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-6 pb-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] text-ink/50">
              عنوان المهمة <span className="text-red-400">*</span>
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !pending) submit(); }}
              placeholder="اكتب عنوان المهمة…"
              autoFocus
              className="w-full rounded-xl border border-ink/15 bg-paper px-4 py-2.5 text-[15px] text-ink outline-none transition placeholder:text-ink/25 focus:border-accent focus:ring-2 focus:ring-accent/12"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] text-ink/50">تكليف عضو (اختياري)</span>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full rounded-xl border border-ink/15 bg-paper px-4 py-2.5 text-[15px] text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/12"
            >
              <option value="">— بدون تكليف —</option>
              {project.members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>

          <p className="rounded-xl border border-gold-600/15 bg-gold-100 px-4 py-3 text-[12px] leading-relaxed text-gold-800">
            ستُضاف المهمة في حالة «انتظار الاعتماد» ريثما يوافق عليها المسؤول.
          </p>

          {error && (
            <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-[12px] text-red-600">
              {error}
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
            onClick={submit}
            disabled={pending || !title.trim()}
            className="rounded-xl bg-accent px-5 py-2 text-[14px] font-semibold text-white transition hover:bg-accent-600 hover:shadow-sm disabled:opacity-40"
          >
            {pending ? "جارٍ الإضافة…" : "إضافة المهمة"}
          </button>
        </div>
      </div>
    </div>
  );
}
