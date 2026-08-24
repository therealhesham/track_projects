"use client";

import Link from "next/link";
import { STATUS_FILTERS, type FilterKey } from "@/lib/labels";
import type { ProjectView } from "@/lib/view";
import ProjectDetail, { SectionLabel } from "../ProjectDetail";
import ProgressBar from "../ui/ProgressBar";
import Segmented from "../ui/Segmented";
import StatusTag from "../ui/StatusTag";

const TH =
  "px-2.5 py-2.5 text-start text-[12px] font-normal tracking-[0.08em] text-ink/60 border-b border-ink/16";
const TD = "px-2.5 py-2.5 border-b border-ink/8";

export default function ProjectsScreen({
  projects,
  filter,
  onFilterChange,
  selected,
  onSelect,
}: {
  projects: ProjectView[];
  filter: FilterKey;
  onFilterChange: (f: FilterKey) => void;
  selected: ProjectView | null;
  onSelect: (id: string) => void;
}) {
  const rows =
    filter === "ALL" ? projects : projects.filter((p) => p.status === filter);

  return (
    <div className="shell grid grid-cols-[minmax(0,1.9fr)_380px] items-start gap-13 pt-[34px]">
      <div>
        <div className="mb-3 flex items-center gap-4">
          <SectionLabel tone="gold">المشاريع</SectionLabel>
          <Segmented
            name="pfilter"
            options={STATUS_FILTERS}
            value={filter}
            onChange={onFilterChange}
            className="ms-auto"
          />
        </div>

        <table className="w-full border-collapse text-[15px]">
          <thead>
            <tr>
              <th className={TH}>المشروع</th>
              <th className={TH}>القسم</th>
              <th className={TH}>المسؤول</th>
              <th className={TH}>التسليم</th>
              <th className={TH}>الحالة</th>
              <th className={`${TH} w-40`}>الإنجاز</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const isSelected = p.id === selected?.id;
              return (
                <tr
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(p.id);
                    }
                  }}
                  tabIndex={0}
                  aria-selected={isSelected}
                  className={`cursor-pointer hover:bg-ink/4 ${
                    isSelected ? "bg-accent/7" : ""
                  }`}
                >
                  <td className={TD}>
                    <Link
                      href={`/projects/${p.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-base font-semibold hover:text-accent transition-colors block"
                    >
                      {p.name}
                    </Link>
                    {p.kicker && (
                      <div className="text-[13px] text-ink/55">{p.kicker}</div>
                    )}
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>{p.dept ?? "—"}</td>
                  <td className={`${TD} whitespace-nowrap`}>
                    {p.owner ?? "غير مُسند"}
                  </td>
                  <td className={`${TD} whitespace-nowrap tabular-nums`}>
                    {p.due}
                  </td>
                  <td className={TD}>
                    <StatusTag status={p.status} projectId={p.id} />
                  </td>
                  <td className={TD}>
                    <div className="flex items-center gap-2.5">
                      <ProgressBar pct={p.pct} className="flex-1" />
                      <span className="min-w-[38px] text-start text-[14px] tabular-nums">
                        {p.pct}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2.5 py-10 text-center text-ink/50">
                  لا مشاريع بهذه الحالة.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <ProjectDetail project={selected} />
      )}
    </div>
  );
}
