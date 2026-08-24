"use client";

import { MOBILE_TABS, type FilterKey, type MobileTab } from "@/lib/labels";
import type { ProjectView } from "@/lib/view";
import ProjectDetail from "../ProjectDetail";
import Button from "../ui/Button";
import LogoMark from "../ui/LogoMark";
import ProgressBar from "../ui/ProgressBar";
import StatusTag from "../ui/StatusTag";

const NOT_BUILT: Record<Exclude<MobileTab, "المشاريع">, string> = {
  المهام: "لوحة المهام على الجوّال — غير مبنية في هذا النموذج.",
  التقارير: "التقارير — غير مبنية في هذا النموذج.",
};

/** The phone-frame preview: the same data, shown at handset width. */
export default function MobileScreen({
  projects,
  filter,
  tab,
  onTabChange,
  selectedId,
  onSelect,
}: {
  projects: ProjectView[];
  filter: FilterKey;
  tab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const rows =
    filter === "ALL" ? projects : projects.filter((p) => p.status === filter);
  const selected = projects.find((p) => p.id === selectedId) ?? null;

  const onProjects = tab === "المشاريع";
  const showList = onProjects && !selected;
  const showDetail = onProjects && !!selected;

  return (
    <div className="flex justify-center px-11 pt-[34px]">
      <div className="relative flex h-[790px] w-[392px] flex-col overflow-hidden rounded-[6px] border border-ink/16 bg-paper shadow-md">
        <div className="flex items-center gap-3 border-b-2 border-accent px-5 pt-5 pb-3">
          {showDetail && (
            <Button
              variant="ghost"
              onClick={() => onSelect(null)}
              className="px-0 py-0 text-[15px]"
            >
              → رجوع
            </Button>
          )}
          <h2 className="text-[21px] font-semibold">
            {selected ? selected.name : tab}
          </h2>
          <LogoMark className="ms-auto block h-[34px] w-[34px]" />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-1.5 pb-5">
          {showList &&
            rows.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p.id)}
                className="flex min-h-[46px] w-full cursor-pointer flex-col gap-[7px] border-b border-ink/12 px-0.5 py-[15px] text-start text-ink hover:bg-ink/4"
              >
                <span className="flex items-baseline gap-2.5">
                  <span className="text-[17px] font-semibold">{p.name}</span>
                  <span className="ms-auto text-[15px] tabular-nums">{p.pct}%</span>
                </span>
                <span className="flex items-center gap-2 text-[13px] text-ink/55">
                  <span>{p.dept ?? "—"}</span>
                  <span>·</span>
                  <span>{p.due}</span>
                  <StatusTag status={p.status} projectId={p.id} className="ms-auto" />
                </span>
                <ProgressBar pct={p.pct} className="w-full" />
              </button>
            ))}

          {showList && rows.length === 0 && (
            <p className="py-15 text-[15px] text-ink/50">لا مشاريع بهذه الحالة.</p>
          )}

          {showDetail && selected && (
            <ProjectDetail
              project={selected}
              variant="mobile"
            />
          )}

          {!onProjects && (
            <p className="py-15 text-[15px] text-ink/50">
              {NOT_BUILT[tab as Exclude<MobileTab, "المشاريع">]}
            </p>
          )}
        </div>

        <div className="flex border-t border-ink/16">
          {MOBILE_TABS.map((t) => {
            const active = t === tab;
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  onTabChange(t);
                  onSelect(null);
                }}
                className={`-mt-px min-h-[46px] flex-1 cursor-pointer border-t-2 pt-3.5 pb-[18px] text-[14px] ${
                  active
                    ? "border-t-accent text-accent"
                    : "border-t-transparent text-ink/55"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
