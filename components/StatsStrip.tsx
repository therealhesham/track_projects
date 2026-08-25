"use client";

import { SCREENS, type ScreenKey } from "@/lib/labels";
import type { ProjectView } from "@/lib/view";
import Segmented from "./ui/Segmented";

/**
 * Screen switcher on one side, the headline figures on the other.
 * Identity and the new-project action live in NavBar; this strip is data only.
 */
export default function StatsStrip({
  projects,
  screen,
  onScreenChange,
}: {
  projects: ProjectView[];
  screen: ScreenKey;
  onScreenChange: (key: ScreenKey) => void;
}) {
  const totalTasks = projects.reduce((n, p) => n + p.total, 0);
  const doneTasks = projects.reduce((n, p) => n + p.doneCount, 0);

  const figures = [
    {
      value: String(projects.filter((p) => p.status === "ACTIVE").length),
      label: "مشاريع قائمة",
      tone: "text-accent",
    },
    {
      value: String(projects.filter((p) => p.status === "BLOCKED").length),
      label: "مشاريع متعطلة",
      tone: "text-gold",
    },
    {
      value: `${totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0}%`,
      label: "نسبة الإنجاز الكلية",
      tone: "text-accent",
    },
  ];

  return (
    <div className="shell pt-6 pb-2">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/10 pb-4">
        <Segmented
          name="screen"
          options={SCREENS}
          value={screen}
          onChange={onScreenChange}
        />

        <div className="flex gap-8">
          {figures.map((f) => (
            <div key={f.label} className="text-start">
              <div
                className={`text-[24px] leading-none font-bold tabular-nums ${f.tone}`}
              >
                {f.value}
              </div>
              <div className="mt-1 text-[13px] font-bold tracking-[0.02em] text-ink/65">
                {f.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
