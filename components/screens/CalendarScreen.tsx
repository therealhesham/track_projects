"use client";

import { useState } from "react";
import {
  formatDayTitle,
  WEEKDAYS,
  buildMonthGrid,
  type MonthGrid,
} from "@/lib/calendar";
import type { DailyTaskView, MovementView, ProjectView } from "@/lib/view";
import type { TaskApprovalStatus } from "@prisma/client";
import { useRole } from "../RoleContext";
import { TASK_STATUS_CONFIG, getTaskSpan } from "../ProjectCalendar";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Shield,
  User,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  FolderKanban,
  Sun,
  X,
} from "lucide-react";

/**
 * A bar on the month grid, from either source: a project task, which spans the
 * days between its start and its deadline, or a daily task, which sits on the
 * one day it was written for. The grid only ever needs these fields, so the two
 * shapes are flattened here rather than threaded through every cell.
 */
export type CalendarSpan = {
  /** Unique across both sources — used as the React key. */
  id: string;
  title: string;
  approvalStatus: TaskApprovalStatus;
  startDay: string;
  endDay: string;
  /** Null for a daily task: there is no project behind it. */
  projectName: string | null;
  owner: string | null;
};

function projectSpans(projects: ProjectView[]): CalendarSpan[] {
  const out: CalendarSpan[] = [];
  for (const p of projects) {
    for (const t of p.tasks) {
      const span = getTaskSpan(t);
      if (!span) continue;
      out.push({
        id: `project-${p.id}-${t.id}`,
        title: t.title,
        approvalStatus: t.approvalStatus,
        startDay: span.startDay,
        endDay: span.endDay,
        projectName: p.name,
        owner: t.assignee ?? p.owner,
      });
    }
  }
  return out;
}

function dailySpans(dailyTasks: DailyTaskView[]): CalendarSpan[] {
  return dailyTasks.map((t) => ({
    id: `daily-${t.id}`,
    title: t.title,
    approvalStatus: t.approvalStatus,
    // A daily task is planned for one day and stays on it, even if it is signed
    // off later — the day is the point of the thing.
    startDay: t.day,
    endDay: t.day,
    projectName: null,
    owner: t.owner,
  }));
}

/** The label that tells the two sources apart at a glance. */
function SourceChip({ span }: { span: CalendarSpan }) {
  return span.projectName ? (
    <span className="inline-flex items-center gap-1 text-[11px] text-ink/50 font-medium">
      <FolderKanban className="h-3 w-3" />
      {span.projectName}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-accent">
      <Sun className="h-3 w-3" />
      مهمة يومية
    </span>
  );
}

/** One task as it appears in the side panel and in the day modal — the two
 *  places that show a span in full rather than as a bar in a grid cell. */
function SpanRow({ span }: { span: CalendarSpan }) {
  const cfg = TASK_STATUS_CONFIG[span.approvalStatus];
  const isDaily = span.projectName === null;

  return (
    <div className="flex flex-col gap-1.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotBg}`} />
          {cfg.label}
        </span>

        <SourceChip span={span} />
      </div>

      <p className="text-[14px] font-semibold leading-snug text-ink">
        {span.title}
      </p>

      <div className="flex flex-col gap-1 text-[12px] text-ink/55 pt-1">
        {isDaily ? (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-ink/35" />
            <span>اليوم: <strong>{span.startDay}</strong></span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-ink/35" />
              <span>تاريخ البداية: <strong>{span.startDay}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-ink/35" />
              <span>تاريخ النهاية / الموعد: <strong>{span.endDay}</strong></span>
            </div>
          </>
        )}
        {span.owner && (
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-ink/35" />
            <span>المسؤول: {span.owner}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CalendarScreen({
  projects = [],
  dailyTasks = [],
  grid: initialGrid,
  today,
  selectedDay,
  onSelectDay,
}: {
  projects?: ProjectView[];
  dailyTasks?: DailyTaskView[];
  grid: MonthGrid;
  today: string;
  movements?: MovementView[];
  selectedDay: string;
  onSelectDay: (day: string) => void;
}) {
  const { currentUser } = useRole();
  const isSuperAdmin = currentUser.role === "SUPER_ADMIN";
  const isManager = currentUser.role === "MANAGER";

  const [currentYear, setCurrentYear] = useState(initialGrid.year);
  const [currentMonth, setCurrentMonth] = useState(initialGrid.month);

  /** Day whose full task list is open in the modal, or null. A cell only has
   *  room for three bars; this is how the rest are reachable. */
  const [modalDay, setModalDay] = useState<string | null>(null);

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
    onSelectDay(today);
  };

  // Every bar on the grid: project tasks and daily tasks side by side.
  const allSpans: CalendarSpan[] = [
    ...projectSpans(projects),
    ...dailySpans(dailyTasks),
  ];

  // Active tasks on selected day
  const selectedDaySpans = allSpans.filter(
    (s) => s.startDay <= selectedDay && selectedDay <= s.endDay
  );

  const modalDaySpans = modalDay
    ? allSpans.filter((s) => s.startDay <= modalDay && modalDay <= s.endDay)
    : [];

  return (
    <div className="shell flex flex-col gap-6 pt-6 pb-20">
      {/* Header controls & role info */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-accent" />
          <h2 className="text-[22px] font-semibold text-ink">{grid.label}</h2>
          {isSuperAdmin ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-0.5 text-[12px] font-medium text-accent">
              <Shield className="h-3.5 w-3.5" />
              عرض كافة المشاريع (مدير عام)
            </span>
          ) : isManager ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold-100 px-2.5 py-0.5 text-[12px] font-medium text-gold-800">
              <Shield className="h-3.5 w-3.5" />
              مشاريعي ومهام فريقي
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-ink/10 bg-ink/6 px-2.5 py-0.5 text-[12px] font-medium text-ink/60">
              <User className="h-3.5 w-3.5" />
              مهامي الخاصة فقط
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetToToday}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink/12 bg-paper px-3 py-1.5 text-[12px] font-medium text-ink/70 transition hover:bg-ink/5 me-2"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            اليوم
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-lg border border-ink/12 p-2 text-ink/60 transition hover:bg-ink/5 hover:text-ink"
              aria-label="الشهر السابق"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-lg border border-ink/12 p-2 text-ink/60 transition hover:bg-ink/5 hover:text-ink"
              aria-label="الشهر التالي"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
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

      {/* Main Grid + Side details layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
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
                    className="min-h-[100px] bg-ink/[0.015]"
                  />
                );
              }

              const isToday = dayYmd === today;
              const isSelected = dayYmd === selectedDay;
              const dayNum = Number(dayYmd.split("-")[2]);

              // Find active task spans for this day across all projects
              const daySpans = allSpans.filter(
                (s) => s.startDay <= dayYmd && dayYmd <= s.endDay
              );

              return (
                <button
                  key={dayYmd}
                  type="button"
                  onClick={() => onSelectDay(dayYmd)}
                  aria-pressed={isSelected}
                  className={`group relative flex min-h-[100px] flex-col p-2 text-start transition-colors ${
                    isSelected
                      ? "z-10 bg-accent/5 ring-1 ring-accent/30"
                      : "hover:bg-ink/[0.02]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-medium tabular-nums ${
                        isToday
                          ? "bg-accent text-white font-bold"
                          : isSelected
                          ? "bg-ink/10 font-semibold text-ink"
                          : "text-ink/70"
                      }`}
                    >
                      {dayNum}
                    </span>
                  </div>

                  {/* Task Span Bars */}
                  <div className="mt-2 flex flex-col gap-1 overflow-hidden w-full">
                    {daySpans.slice(0, 3).map((span) => {
                      const cfg = TASK_STATUS_CONFIG[span.approvalStatus];
                      const isStart = dayYmd === span.startDay;
                      const isEnd = dayYmd === span.endDay;
                      const isSingle = isStart && isEnd;

                      return (
                        <div
                          key={span.id}
                          className={`relative flex items-center gap-1 py-0.5 text-[10px] font-medium transition-all ${cfg.bg} ${cfg.text} ${cfg.border} ${
                            isSingle
                              ? "rounded-md border px-1.5"
                              : isStart
                              ? "-me-2 pe-2 ps-1.5 border-y border-r rounded-r-md"
                              : isEnd
                              ? "-ms-2 ps-2 pe-1.5 border-y border-l rounded-l-md"
                              : "-mx-2 px-2 border-y rounded-none"
                          }`}
                          title={
                            span.projectName
                              ? `[${span.projectName}] ${span.title} (${cfg.label}) — من ${span.startDay} إلى ${span.endDay}`
                              : `[مهمة يومية] ${span.title} (${cfg.label}) — ${span.startDay}`
                          }
                        >
                          <span
                            className={`h-1.5 w-1.5 flex-none rounded-full ${cfg.dotBg}`}
                          />
                          <span className="truncate">
                            {isStart || isEnd
                              ? span.title
                              : `••• ${span.title}`}
                          </span>
                        </div>
                      );
                    })}
                    {daySpans.length > 3 && (
                      // A span, not a button: the whole cell is already a
                      // button and nesting one inside another is invalid.
                      // Keyboard users reach the same list by selecting the
                      // day — the side panel shows every task without a cap.
                      <span
                        role="link"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDay(dayYmd);
                          setModalDay(dayYmd);
                        }}
                        className="cursor-pointer text-[10px] font-medium text-ink/40 underline-offset-2 transition hover:text-accent hover:underline"
                      >
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
                تفاصيل اليوم والمهام النشطة
              </h4>
            </div>
            <h3 className="mt-1 text-[16px] font-semibold text-ink">
              {selectedDay ? formatDayTitle(selectedDay) : "اختر يوماً"}
            </h3>

            <div className="mt-4 flex flex-col divide-y divide-ink/6">
              {selectedDaySpans.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-ink/35">
                  لا توجد مهام نشطة في هذا اليوم.
                </p>
              ) : (
                selectedDaySpans.map((span) => (
                  <SpanRow key={span.id} span={span} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full task list for one day — opened from "+N المزيد" in a cell */}
      {modalDay && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalDay(null);
          }}
        >
          <div className="flex max-h-[80vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-ink/10 bg-paper shadow-lg">
            <div className="flex items-center justify-between border-b border-ink/8 px-6 py-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-accent" />
                <div className="flex flex-col">
                  <h3 className="text-[16px] font-semibold text-ink">
                    {formatDayTitle(modalDay)}
                  </h3>
                  <span className="text-[12px] text-ink/45">
                    {modalDaySpans.length} مهمة نشطة في هذا اليوم
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalDay(null)}
                aria-label="إغلاق"
                className="rounded-lg p-1.5 text-ink/35 transition hover:bg-ink/5 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col divide-y divide-ink/6 overflow-y-auto px-6 py-2">
              {modalDaySpans.map((span) => (
                <SpanRow key={span.id} span={span} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
