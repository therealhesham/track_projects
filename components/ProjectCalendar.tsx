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
} from "lucide-react";

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

  // Map events by YYYY-MM-DD
  const eventsByDay: Record<
    string,
    { type: "start" | "due" | "task_start" | "task_done"; title: string; task?: TaskView }[]
  > = {};

  const addEvent = (
    day: string | null,
    evt: { type: "start" | "due" | "task_start" | "task_done"; title: string; task?: TaskView }
  ) => {
    if (!day) return;
    if (!eventsByDay[day]) eventsByDay[day] = [];
    eventsByDay[day].push(evt);
  };

  if (project.startDate) {
    addEvent(project.startDate, { type: "start", title: "بداية المشروع" });
  }

  for (const t of project.tasks) {
    if (t.startedDay) {
      addEvent(t.startedDay, { type: "task_start", title: `بدأت: ${t.title}`, task: t });
    }
    if (t.completedDay) {
      addEvent(t.completedDay, { type: "task_done", title: `مكتملة: ${t.title}`, task: t });
    }
  }

  const selectedEvents = selectedDay ? eventsByDay[selectedDay] || [] : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Date Range Summary Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-ink/10 bg-surface px-6 py-4">
        <div className="flex flex-wrap items-center gap-6 text-[14px]">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-accent" />
            <span className="text-ink/50">تاريخ البداية:</span>
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
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
                    className="min-h-[85px] bg-ink/[0.015]"
                  />
                );
              }

              const isToday = dayYmd === todayYmd;
              const isSelected = dayYmd === selectedDay;
              const isProjectStart = dayYmd === project.startDate;
              const events = eventsByDay[dayYmd] || [];
              const dayNum = Number(dayYmd.split("-")[2]);

              return (
                <button
                  key={dayYmd}
                  type="button"
                  onClick={() => setSelectedDay(dayYmd)}
                  className={`group relative flex min-h-[85px] flex-col p-2 text-start transition-colors ${
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

                  {/* Event indicators / labels */}
                  <div className="mt-2 flex flex-col gap-1 overflow-hidden">
                    {events.slice(0, 2).map((ev, i) => (
                      <div
                        key={i}
                        className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          ev.type === "start"
                            ? "bg-accent/15 text-accent"
                            : ev.type === "due"
                            ? "bg-gold-100 text-gold-800"
                            : ev.type === "task_done"
                            ? "bg-green-100 text-green-800"
                            : "bg-ink/8 text-ink/70"
                        }`}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {events.length > 2 && (
                      <span className="text-[10px] text-ink/40">
                        +{events.length - 2} المزيد
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
                أحداث اليوم
              </h4>
            </div>
            <p className="mt-1 text-[16px] font-semibold text-ink">
              {selectedDay ? formatDayTitle(selectedDay) : "اختر يوماً"}
            </p>

            <div className="mt-4 flex flex-col divide-y divide-ink/6">
              {selectedEvents.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-ink/35">
                  لا توجد أحداث أو مهام في هذا اليوم.
                </p>
              ) : (
                selectedEvents.map((ev, i) => (
                  <div key={i} className="flex flex-col gap-1 py-3">
                    <span
                      className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        ev.type === "start"
                          ? "bg-accent/10 text-accent"
                          : ev.type === "due"
                          ? "bg-gold-100 text-gold-800"
                          : ev.type === "task_done"
                          ? "bg-green-100 text-green-800"
                          : "bg-ink/6 text-ink/60"
                      }`}
                    >
                      {ev.type === "start" ? (
                        <>
                          <Rocket className="h-3 w-3" /> بداية المشروع
                        </>
                      ) : ev.type === "due" ? (
                        <>
                          <Flag className="h-3 w-3" /> موعد التسليم
                        </>
                      ) : ev.type === "task_done" ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> مهمة مكتملة
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3" /> مهمة بدأت
                        </>
                      )}
                    </span>
                    <p className="text-[14px] font-medium leading-snug text-ink">
                      {ev.title}
                    </p>
                    {ev.task?.assignee && (
                      <span className="inline-flex items-center gap-1 text-[12px] text-ink/45">
                        <User className="h-3 w-3" />
                        المسؤول: {ev.task.assignee}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
