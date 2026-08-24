"use client";

import {
  formatDayTitle,
  WEEKDAYS,
  type MonthGrid,
} from "@/lib/calendar";
import type { MovementView } from "@/lib/view";
import { SectionLabel } from "../ProjectDetail";
import { useRole } from "../RoleContext";
import { Calendar, Clock, CheckCircle2, Shield, User } from "lucide-react";

function MovementList({
  entries,
  accent,
}: {
  entries: MovementView[];
  accent: "accent" | "gold";
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {entries.map((m) => (
        <div
          key={`${m.taskId}-${m.kind}`}
          className={`flex flex-col gap-0.5 border-b border-s-2 border-ink/10 py-2.5 ps-3 transition hover:bg-ink/[0.02] ${
            accent === "accent" ? "border-s-accent" : "border-s-gold"
          }`}
        >
          <span className="text-[15px] font-medium text-ink">{m.taskTitle}</span>
          <span className="text-[13px] text-ink/55">
            {m.projectName}
            {m.owner ? ` · ${m.owner}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function CalendarScreen({
  grid,
  today,
  movements,
  selectedDay,
  onSelectDay,
}: {
  grid: MonthGrid;
  today: string;
  movements: MovementView[];
  selectedDay: string;
  onSelectDay: (day: string) => void;
}) {
  const { currentUser } = useRole();
  const isSuperAdmin = currentUser.role === "SUPER_ADMIN";

  const started = movements.filter(
    (m) => m.kind === "start" && m.day === selectedDay,
  );
  const ended = movements.filter(
    (m) => m.kind === "end" && m.day === selectedDay,
  );

  return (
    <div className="shell grid grid-cols-[minmax(0,1fr)_360px] items-start gap-[46px] pt-[34px]">
      <div>
        <div className="mb-[18px] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-accent" />
            <h2 className="text-[22px] font-semibold text-ink">{grid.label}</h2>
            {isSuperAdmin ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-0.5 text-[12px] font-medium text-accent">
                <Shield className="h-3.5 w-3.5" />
                عرض كافة المشاريع (سوبر أدمن)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-ink/10 bg-ink/6 px-2.5 py-0.5 text-[12px] font-medium text-ink/60">
                <User className="h-3.5 w-3.5" />
                مهامي الخاصة فقط
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-[13px] text-ink/55">
            <span className="flex items-center gap-1.5">
              <span className="block h-[9px] w-[9px] rounded-full bg-accent" />
              بدأت
            </span>
            <span className="flex items-center gap-1.5">
              <span className="block h-[9px] w-[9px] rounded-full bg-gold" />
              انتهت
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="border-b-2 border-accent px-2.5 pb-[9px] text-[12px] font-medium uppercase tracking-[0.04em] text-ink/55"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {grid.cells.map((day, i) => {
            if (!day) {
              return (
                <div
                  key={`blank-${i}`}
                  className="min-h-[104px] border-t border-t-ink/14 opacity-35 bg-ink/[0.015]"
                />
              );
            }
            const dayNumber = Number(day.slice(8));
            const startCount = movements.filter(
              (m) => m.kind === "start" && m.day === day,
            ).length;
            const endCount = movements.filter(
              (m) => m.kind === "end" && m.day === day,
            ).length;
            const isSelected = day === selectedDay;
            const isToday = day === today;

            return (
              <button
                key={day}
                type="button"
                onClick={() => onSelectDay(day)}
                aria-pressed={isSelected}
                className={`flex min-h-[104px] cursor-pointer flex-col items-stretch gap-[5px] px-2.5 pt-2.5 pb-3 text-start transition-colors ${
                  isToday
                    ? "border-t-2 border-t-gold font-bold"
                    : "border-t border-t-ink/14"
                } ${isSelected ? "bg-accent/7 ring-1 ring-accent/30 z-10" : "hover:bg-ink/[0.02]"}`}
              >
                <span
                  className={`text-[17px] font-semibold tabular-nums ${
                    isToday ? "text-gold-800 font-bold" : "text-ink"
                  }`}
                >
                  {dayNumber}
                </span>
                {startCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[12px] font-medium text-accent">
                    <Clock className="h-3 w-3" /> بدأت {startCount}
                  </span>
                )}
                {endCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[12px] font-medium text-gold-800">
                    <CheckCircle2 className="h-3 w-3" /> انتهت {endCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-1">
        <SectionLabel tone="gold">حركة اليوم</SectionLabel>
        <h2 className="mt-2.5 mb-[18px] text-2xl leading-[1.3] font-semibold text-ink">
          {formatDayTitle(selectedDay)}
        </h2>

        <div className="mb-1.5 text-[12px] font-medium uppercase tracking-[0.08em] text-ink/55">
          مهام بدأت
        </div>
        <MovementList entries={started} accent="accent" />

        <div className="mt-[26px] mb-1.5 text-[12px] font-medium uppercase tracking-[0.08em] text-ink/55">
          مهام انتهت
        </div>
        <MovementList entries={ended} accent="gold" />

        {started.length === 0 && ended.length === 0 && (
          <p className="pt-3.5 text-[14px] text-ink/40">لا حركة مهام في هذا اليوم.</p>
        )}
      </div>
    </div>
  );
}
