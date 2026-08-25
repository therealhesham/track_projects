"use client";

import { useState } from "react";
import {
  WEEKDAYS,
  buildMonthGrid,
  formatShortDate,
  formatDayTitle,
  ymd,
} from "@/lib/calendar";
import type { ProjectView, TaskView } from "@/lib/view";
import type { TaskApprovalStatus } from "@prisma/client";
import {
  ChevronRight,
  ChevronLeft,
  Calendar,
  Rocket,
  Flag,
  CheckCircle2,
  Clock,
  CalendarDays,
  User,
  AlertCircle,
  XCircle,
} from "lucide-react";

export const TASK_STATUS_CONFIG: Record<
  TaskApprovalStatus,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    barBg: string;
    dotBg: string;
  }
> = {
  PENDING_APPROVAL: {
    label: "في انتظار الاعتماد",
    bg: "bg-sky-500/12 hover:bg-sky-500/20",
    text: "text-sky-800 dark:text-sky-300",
    border: "border-sky-500/30",
    barBg: "bg-sky-500",
    dotBg: "bg-sky-500",
  },
  ACTIVE: {
    label: "قيد التنفيذ",
    bg: "bg-amber-500/12 hover:bg-amber-500/20",
    text: "text-amber-800 dark:text-amber-300",
    border: "border-amber-500/30",
    barBg: "bg-amber-500",
    dotBg: "bg-amber-500",
  },
  PENDING_COMPLETION: {
    label: "في انتظار المراجعة",
    bg: "bg-purple-500/12 hover:bg-purple-500/20",
    text: "text-purple-800 dark:text-purple-300",
    border: "border-purple-500/30",
    barBg: "bg-purple-500",
    dotBg: "bg-purple-500",
  },
  DONE: {
    label: "مكتملة",
    bg: "bg-emerald-500/12 hover:bg-emerald-500/20",
    text: "text-emerald-800 dark:text-emerald-300",
    border: "border-emerald-500/30",
    barBg: "bg-emerald-500",
    dotBg: "bg-emerald-500",
  },
  REJECTED: {
    label: "مرفوضة",
    bg: "bg-rose-500/12 hover:bg-rose-500/20",
    text: "text-rose-800 dark:text-rose-300",
    border: "border-rose-500/30",
    barBg: "bg-rose-500",
    dotBg: "bg-rose-500",
  },
};

export type TaskSpan = {
  task: TaskView;
  startDay: string;
  endDay: string;
  isMultiDay: boolean;
};

export function getTaskSpan(task: TaskView): TaskSpan | null {
  const start = task.startDate || task.startedDay || task.dueDate || task.completedDay;
  if (!start) return null;

  const end = task.completedDay || task.dueDate || start;
  const startDay = start <= end ? start : end;
  const endDay = start <= end ? end : start;

  return {
    task,
    startDay,
    endDay,
    isMultiDay: startDay !== endDay,
  };
}

export default function ProjectCalendar({
  project,
}: {
  project: ProjectView;
}) {
  const todayYmd = ymd(new Date());
  const [currentYear, setCurrentYear] = useState(() => {
    if (project.startDate) return Number(project.startDate.split("-")[0]);
    return new Date().getFullYear();
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (project.startDate) return Number(project.startDate.split("-")[1]) - 1;
    return new Date().getMonth();
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(todayYmd);

  const grid = buildMonthGrid(currentYear, currentMonth);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const resetToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDay(todayYmd);
  };

  // Collect all task spans
  const spans: TaskSpan[] = project.tasks
    .map(getTaskSpan)
    .filter((s): s is TaskSpan => s !== null);

  // Active tasks on selected day
  const selectedDaySpans = selectedDay
    ? spans.filter((s) => s.startDay <= selectedDay && selectedDay <= s.endDay)
    : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Date Range Summary Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-ink/10 bg-surface px-6 py-4">
        <div className="flex flex-wrap items-center gap-6 text-[14px]">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-accent" />
            <span className="text-ink/50">بداية المشروع:</span>
            <span className="font-semibold text-ink">
              {formatShortDate(project.startDate)}
            </span>
          </div>

          <div className="hidden text-ink/20 sm:block">|</div>

          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-gold-600" />
            <span className="text-ink/50">تاريخ التسليم:</span>
            <span className="font-semibold text-ink">{project.due}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={resetToToday}
          className="inline-flex items-center gap-1.5 rounded-lg border border-ink/12 bg-paper px-3 py-1.5 text-[12px] font-medium text-ink/70 transition hover:bg-ink/5"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          اليوم
        </button>
      </div>

      {/* Status Color Legend */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-ink/8 bg-paper px-5 py-2.5 text-[12px]">
        <span className="font-medium text-ink/50 me-1">حالات المهام:</span>
        {(Object.keys(TASK_STATUS_CONFIG) as TaskApprovalStatus[]).map((st) => {
          const cfg = TASK_STATUS_CONFIG[st];
          return (
            <span key={st} className="inline-flex items-center gap-1.5 text-ink/70">
              <span className={`h-2.5 w-2.5 rounded-full ${cfg.dotBg}`} />
              <span>{cfg.label}</span>
            </span>
          );
        })}
      </div>

      {/* Calendar Controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-accent" />
          <h3 className="text-[18px] font-semibold text-ink">{grid.label}</h3>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded-lg border border-ink/12 p-2 text-ink/60 transition hover:bg-ink/5 hover:text-ink"
            aria-label="الشهر السابق"
          >
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-lg border border-ink/12 p-2 text-ink/60 transition hover:bg-ink/5 hover:text-ink"
            aria-label="الشهر التالي"
          >
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          </button>
        </div>
      </div>

      {/* Main Grid + Side details layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        {/* Calendar Grid */}
        <div className="overflow-hidden rounded-xl border border-ink/10 bg-paper shadow-sm">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-ink/8 bg-surface text-center">
            {WEEKDAYS.map((wd) => (
              <div
                key={wd}
                className="py-3 text-[12px] font-medium uppercase text-ink/50"
              >
                {wd}
              </div>
            ))}
          </div>

          {/* 42 Grid Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-ink/8 rtl:divide-x-reverse">
            {grid.cells.map((dayYmd, idx) => {
              if (!dayYmd) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[95px] bg-ink/[0.015]"
                  />
                );
              }

              const isToday = dayYmd === todayYmd;
              const isSelected = dayYmd === selectedDay;
              const isProjectStart = dayYmd === project.startDate;
              const dayNum = Number(dayYmd.split("-")[2]);

              // Find active task spans for this day
              const daySpans = spans.filter(
                (s) => s.startDay <= dayYmd && dayYmd <= s.endDay
              );

              return (
                <button
                  key={dayYmd}
                  type="button"
                  onClick={() => setSelectedDay(dayYmd)}
                  className={`group relative flex min-h-[95px] flex-col p-2 text-start transition-colors ${
                    isSelected
                      ? "z-10 bg-accent/5 ring-1 ring-accent/30"
                      : "hover:bg-ink/[0.02]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-medium tabular-nums ${
                        isToday
                          ? "bg-accent text-white"
                          : isSelected
                          ? "bg-ink/10 font-semibold text-ink"
                          : "text-ink/70"
                      }`}
                    >
                      {dayNum}
                    </span>

                    {isProjectStart && (
                      <span
                        title="بداية المشروع"
                        className="inline-flex items-center gap-1 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent"
                      >
                        <Rocket className="h-3 w-3" />
                        بداية
                      </span>
                    )}
                  </div>

                  {/* Task Span Bars */}
                  <div className="mt-2 flex flex-col gap-1 overflow-hidden w-full">
                    {daySpans.slice(0, 3).map((span) => {
                      const cfg = TASK_STATUS_CONFIG[span.task.approvalStatus];
                      const isStart = dayYmd === span.startDay;
                      const isEnd = dayYmd === span.endDay;
                      const isSingle = isStart && isEnd;

                      return (
                        <div
                          key={span.task.id}
                          className={`relative flex items-center gap-1 py-0.5 text-[10px] font-medium transition-all ${cfg.bg} ${cfg.text} ${cfg.border} ${
                            isSingle
                              ? "rounded-md border px-1.5"
                              : isStart
                              ? "-me-2 pe-2 ps-1.5 border-y border-r rounded-r-md"
                              : isEnd
                              ? "-ms-2 ps-2 pe-1.5 border-y border-l rounded-l-md"
                              : "-mx-2 px-2 border-y rounded-none"
                          }`}
                          title={`${span.task.title} (${cfg.label}) — من ${span.startDay} إلى ${span.endDay}`}
                        >
                          {/* Indicator line/dot */}
                          <span
                            className={`h-1.5 w-1.5 flex-none rounded-full ${cfg.dotBg}`}
                          />
                          <span className="truncate">
                            {isStart
                              ? `${span.task.title}`
                              : isEnd
                              ? `${span.task.title}`
                              : `••• ${span.task.title}`}
                          </span>
                        </div>
                      );
                    })}
                    {daySpans.length > 3 && (
                      <span className="text-[10px] font-medium text-ink/40">
                        +{daySpans.length - 3} المزيد
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details Panel */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-ink/10 bg-paper p-5 shadow-sm">
            <div className="flex items-center gap-1.5 text-ink/40">
              <Calendar className="h-4 w-4" />
              <h4 className="text-[12px] font-medium uppercase tracking-wide">
                تفاصيل اليوم والمهمات
              </h4>
            </div>
            <p className="mt-1 text-[16px] font-semibold text-ink">
              {selectedDay ? formatDayTitle(selectedDay) : "اختر يوماً"}
            </p>

            <div className="mt-4 flex flex-col divide-y divide-ink/6">
              {selectedDaySpans.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-ink/35">
                  لا توجد مهام نشطة في هذا اليوم.
                </p>
              ) : (
                selectedDaySpans.map((span) => {
                  const cfg = TASK_STATUS_CONFIG[span.task.approvalStatus];
                  return (
                    <div key={span.task.id} className="flex flex-col gap-1.5 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotBg}`} />
                          {cfg.label}
                        </span>

                        {span.isMultiDay && (
                          <span className="text-[10px] font-medium text-ink/40 bg-ink/5 px-2 py-0.5 rounded-full">
                            ممتدة
                          </span>
                        )}
                      </div>

                      <p className="text-[14px] font-semibold leading-snug text-ink">
                        {span.task.title}
                      </p>

                      <div className="flex flex-col gap-1 text-[12px] text-ink/55 pt-1">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-ink/35" />
                          <span>تاريخ البداية: <strong>{span.startDay}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-ink/35" />
                          <span>تاريخ النهاية / الموعد: <strong>{span.endDay}</strong></span>
                        </div>
                        {span.task.assignee && (
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-ink/35" />
                            <span>المسؤول: {span.task.assignee}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
