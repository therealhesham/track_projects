"use client";

import { useState } from "react";
import { metaLine, type ProjectView } from "@/lib/view";
import ProgressBar from "./ui/ProgressBar";
import TaskRow from "./TaskRow";
import AddTaskDialog from "./AddTaskDialog";
import { useRole } from "./RoleContext";

import { Plus } from "lucide-react";

/** Small all-caps-ish rubric used above each block. */
export function SectionLabel({
  children,
  tone = "quiet",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "gold" | "quiet";
  className?: string;
}) {
  return (
    <div
      className={`text-[12px] font-bold tracking-[0.08em] ${
        tone === "gold" ? "text-gold-800" : "text-ink/65"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export default function ProjectDetail({
  project,
  variant = "panel",
}: {
  project: ProjectView;
  /** `panel` is the desktop sidebar; `mobile` is the trimmed phone view. */
  variant?: "panel" | "mobile";
}) {
  const { currentUser } = useRole();
  const panel = variant === "panel";
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  const isProjectManager = project.members.some(
    (m) => m.userId === currentUser.id && m.projectRole === "MANAGER",
  );

  const canAddTask =
    currentUser.role === "SUPER_ADMIN" ||
    currentUser.role === "MANAGER" ||
    currentUser.role === "MEMBER";

  // Filter tasks shown based on role:
  // SUPER_ADMIN and the project's own manager see everything, including
  // PENDING_APPROVAL and REJECTED — the manager needs to see what they're
  // approving. Everyone else: hide PENDING_APPROVAL tasks they didn't add.
  const visibleTasks =
    currentUser.role === "SUPER_ADMIN" || isProjectManager
      ? project.tasks
      : project.tasks.filter(
          (t) =>
            t.approvalStatus !== "PENDING_APPROVAL" ||
            t.assigneeId === currentUser.id,
        );

  const pendingCount = project.tasks.filter(
    (t) => t.approvalStatus === "PENDING_APPROVAL",
  ).length;

  return (
    <div className={panel ? "pt-1" : "pt-3.5"}>
      {panel && (
        <>
          <SectionLabel tone="gold">المشروع المحدد</SectionLabel>
          <h2 className="mt-2.5 mb-1.5 text-[27px] font-bold text-ink leading-[1.25]">
            {project.name}
          </h2>
        </>
      )}

      <p className="text-[14px] text-ink/60">{metaLine(project)}</p>

      {panel && project.note && (
        <p className="mt-3 max-w-[36ch] text-[15px] leading-[1.7] text-pretty">
          {project.note}
        </p>
      )}

      <div
        className={`flex items-baseline gap-3.5 ${panel ? "mt-[26px]" : "mt-[18px]"}`}
      >
        <div
          className={`leading-[0.95] font-semibold tabular-nums ${
            panel ? "text-[56px]" : "text-[50px]"
          }`}
        >
          {project.pct}%
        </div>
        <div className="text-[13px] text-ink/55">
          أُنجزت {project.doneCount} من {project.total} مهام
        </div>
      </div>
      <ProgressBar pct={project.pct} className={panel ? "mt-3.5" : "mt-3"} />

      {/* Tasks header */}
      {panel && (
        <div className="mt-[30px] mb-1.5 flex items-center gap-2">
          <SectionLabel>المهام</SectionLabel>

          {/* Pending badge for whoever can act on it */}
          {pendingCount > 0 && (currentUser.role === "SUPER_ADMIN" || isProjectManager) && (
            <span className="rounded-full bg-gold-100 border border-gold-600/30 px-2 py-0.5 text-[11px] font-medium text-gold-800">
              {pendingCount} في انتظار الاعتماد
            </span>
          )}

          {/* Add task button */}
          {canAddTask && (
            <button
              type="button"
              onClick={() => setAddTaskOpen(true)}
              className="ms-auto flex items-center gap-1 rounded-md border border-accent/30 bg-accent/5 px-2.5 py-1 text-[12px] font-medium text-accent hover:bg-accent/10 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> مهمة جديدة
            </button>
          )}
        </div>
      )}

      <div className={`flex flex-col ${panel ? "" : "mt-[22px]"}`}>
        {visibleTasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            who={task.assignee ?? project.owner}
            size={panel ? "desktop" : "mobile"}
            isProjectManager={isProjectManager}
          />
        ))}
        {visibleTasks.length === 0 && (
          <p className="py-4 text-center text-[14px] text-ink/40">
            لا مهام لهذا المشروع بعد.
          </p>
        )}
      </div>

      {panel && project.activity.length > 0 && (
        <>
          <SectionLabel className="mt-[30px] mb-2.5">آخر التحديثات</SectionLabel>
          <div className="flex flex-col gap-2.5">
            {project.activity.map((a, i) => (
              <div key={i} className="flex gap-3 text-[14px]">
                <span className="min-w-[58px] text-ink/45">{a.when}</span>
                <span className="leading-[1.6]">
                  {a.what}
                  {a.who && (
                    <span className="mt-0.5 block text-[12px] text-ink/40">
                      بواسطة {a.who}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add task dialog */}
      {addTaskOpen && (
        <AddTaskDialog project={project} onClose={() => setAddTaskOpen(false)} />
      )}
    </div>
  );
}
