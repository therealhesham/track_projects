"use client";

import { STAGE_LABEL, STAGE_ORDER } from "@/lib/labels";
import type { ProjectView } from "@/lib/view";
import { SectionLabel } from "../ProjectDetail";
import { TASK_STATUS_CONFIG } from "../ProjectCalendar";
import { Clock, CheckCircle2, User, FolderKanban } from "lucide-react";

export default function BoardScreen({
  projects,
}: {
  projects: ProjectView[];
  onAdvanceTask?: (taskId: string) => void;
}) {
  const cards = projects.flatMap((project) =>
    project.tasks.map((task) => ({ project, task }))
  );

  return (
    <div className="shell pt-[34px] pb-20">
      <div className="mb-5 flex items-baseline gap-3.5">
        <SectionLabel tone="gold">لوحة المهام</SectionLabel>
        <p className="text-[14px] text-ink/55">
          استعراض وتتبع المهام عبر المراحل المختلفة
        </p>
      </div>

      <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-4 items-start">
        {STAGE_ORDER.map((stage) => {
          const column = cards.filter((c) => c.task.stage === stage);
          const isDoneColumn = stage === "DONE";

          return (
            <div key={stage} className="flex flex-col gap-3">
              <div
                className={`flex items-center justify-between border-b-2 pb-2.5 ${
                  isDoneColumn ? "border-gold" : "border-accent"
                }`}
              >
                <h2 className="text-[17px] font-semibold text-ink">
                  {STAGE_LABEL[stage]}
                </h2>
                <span className="rounded-full bg-ink/8 px-2 py-0.5 text-[12px] font-semibold tabular-nums text-ink/60">
                  {column.length}
                </span>
              </div>

              <div className="flex flex-col gap-3 pt-1">
                {column.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-ink/12 p-6 text-center text-[13px] text-ink/30">
                    لا مهام في هذه المرحلة
                  </div>
                ) : (
                  column.map(({ project, task }) => {
                    const statusCfg = TASK_STATUS_CONFIG[task.approvalStatus];
                    const startDate = task.startDate || task.startedDay;
                    const endDate = task.completedDay || task.dueDate || project.due;

                    return (
                      <div
                        key={task.id}
                        className={`flex w-full flex-col items-start gap-2.5 rounded-xl border border-ink/10 border-s-4 bg-surface p-4 text-start text-ink shadow-xs transition-colors ${
                          isDoneColumn ? "border-s-gold" : "border-s-accent"
                        }`}
                      >
                        {/* Project Name & Status Badge */}
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide text-gold-800">
                            <FolderKanban className="h-3 w-3" />
                            {project.name}
                          </span>

                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dotBg}`} />
                            {statusCfg.label}
                          </span>
                        </div>

                        {/* Title */}
                        <span className="text-[15px] leading-[1.5] font-semibold text-ink">
                          {task.title}
                        </span>

                        {/* Assignee & Dates info */}
                        <div className="mt-1 flex w-full flex-col gap-1 border-t border-ink/6 pt-2 text-[12px] text-ink/55">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-ink/35" />
                            <span>{(task.assignee ?? project.owner) ?? "غير مُسند"}</span>
                          </div>

                          {(startDate || endDate) && (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink/45 pt-0.5">
                              {startDate && (
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-ink/35" />
                                  <span>بداية: {startDate}</span>
                                </span>
                              )}

                              {startDate && endDate && <span>·</span>}

                              {endDate && (
                                <span className="inline-flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-ink/35" />
                                  <span>نهاية: {endDate}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
