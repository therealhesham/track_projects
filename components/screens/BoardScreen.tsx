"use client";

import { STAGE_LABEL, STAGE_ORDER } from "@/lib/labels";
import type { ProjectView } from "@/lib/view";
import { SectionLabel } from "../ProjectDetail";

export default function BoardScreen({
  projects,
  onAdvanceTask,
}: {
  projects: ProjectView[];
  onAdvanceTask: (taskId: string) => void;
}) {
  const cards = projects.flatMap((project) =>
    project.tasks.map((task) => ({ project, task })),
  );

  return (
    <div className="shell pt-[34px]">
      <div className="mb-5 flex items-baseline gap-3.5">
        <SectionLabel tone="gold">لوحة المهام</SectionLabel>
        <p className="text-[14px] text-ink/55">
          اضغط على المهمة لنقلها إلى المرحلة التالية
        </p>
      </div>

      <div className="grid grid-cols-4 items-start gap-[26px]">
        {STAGE_ORDER.map((stage) => {
          const column = cards.filter((c) => c.task.stage === stage);
          const isDoneColumn = stage === "DONE";
          return (
            <div key={stage}>
              <div
                className={`flex items-baseline gap-2 border-b-2 pb-2.5 ${
                  isDoneColumn ? "border-gold" : "border-accent"
                }`}
              >
                <h2 className="text-[17px] font-semibold">
                  {STAGE_LABEL[stage]}
                </h2>
                <span className="text-[14px] tabular-nums text-ink/45">
                  {column.length}
                </span>
              </div>

              <div className="flex flex-col gap-3 pt-3.5">
                {column.map(({ project, task }) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onAdvanceTask(task.id)}
                    className={`flex w-full cursor-pointer flex-col items-start gap-2.5 rounded-md border-s-2 bg-surface p-4 text-start text-ink hover:shadow-sm ${
                      isDoneColumn ? "border-gold" : "border-accent"
                    }`}
                  >
                    <span className="text-[11px] tracking-[0.1em] text-gold-800">
                      {project.name}
                    </span>
                    <span className="text-[15px] leading-[1.5] font-semibold">
                      {task.title}
                    </span>
                    <span className="mt-0.5 text-[12px] text-ink/50">
                      {(task.assignee ?? project.owner) ?? "غير مُسند"} ·{" "}
                      {project.due}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
