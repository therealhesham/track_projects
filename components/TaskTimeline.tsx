"use client";

import { useMemo, useRef, useState } from "react";
import { AR_MONTHS, formatLongDate, ymd } from "@/lib/calendar";
import type { ProjectView, TaskView } from "@/lib/view";
import {
  StatusLegend,
  TASK_STATUS_CONFIG,
  getTaskSpan,
  type TaskSpan,
} from "./ProjectCalendar";
import { CalendarDays, CalendarOff, GanttChartSquare } from "lucide-react";

/* ── date arithmetic ────────────────────────────────────────────────────────
   All of it on `YYYY-MM-DD` strings through UTC midnight. Local-time date math
   drifts by an hour across a DST boundary, which is enough to push a bar onto
   the wrong day — the same trap `ymd` in lib/calendar warns about. */

const DAY_MS = 86_400_000;

function toUtcMidnight(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMidnight(to) - toUtcMidnight(from)) / DAY_MS);
}

function addDays(day: string, count: number): string {
  const t = new Date(toUtcMidnight(day) + count * DAY_MS);
  const m = `${t.getUTCMonth() + 1}`.padStart(2, "0");
  const d = `${t.getUTCDate()}`.padStart(2, "0");
  return `${t.getUTCFullYear()}-${m}-${d}`;
}

/* ── scale ──────────────────────────────────────────────────────────────────
   Two densities, not a free zoom: a slider invites fiddling, and these are the
   only two readings anyone needs — one day at a time, or the shape of a quarter.
   Day numbers are dropped in the compact scale because they cannot fit. */

const SCALES = {
  day: { width: 34, showDayNumbers: true, label: "يومي" },
  compact: { width: 11, showDayNumbers: false, label: "مضغوط" },
} as const;

type ScaleKey = keyof typeof SCALES;

const ROW_HEIGHT = 44;
/** Pads the range so a bar at either edge is not flush against the frame. */
const EDGE_PAD_DAYS = 2;

type Band = { label: string; days: number; offset: number };

export default function TaskTimeline({ project }: { project: ProjectView }) {
  const today = ymd(new Date());
  const todayMarker = useRef<HTMLDivElement>(null);

  const scheduled: TaskSpan[] = useMemo(
    () =>
      project.tasks
        .map(getTaskSpan)
        .filter((s): s is TaskSpan => s !== null)
        .sort((a, b) =>
          a.startDay === b.startDay
            ? a.endDay.localeCompare(b.endDay)
            : a.startDay.localeCompare(b.startDay),
        ),
    [project.tasks],
  );

  const unscheduled: TaskView[] = useMemo(
    () => project.tasks.filter((t) => getTaskSpan(t) === null),
    [project.tasks],
  );

  const range = useMemo(() => {
    if (scheduled.length === 0) return null;

    let first = scheduled[0].startDay;
    let last = scheduled[0].endDay;
    for (const s of scheduled) {
      if (s.startDay < first) first = s.startDay;
      if (s.endDay > last) last = s.endDay;
    }
    // The project's own start belongs on the axis even when no task begins
    // there — it is the line everything else is late or early against.
    if (project.startDate && project.startDate < first) first = project.startDate;

    const start = addDays(first, -EDGE_PAD_DAYS);
    const end = addDays(last, EDGE_PAD_DAYS);
    return { start, end, totalDays: daysBetween(start, end) + 1 };
  }, [scheduled, project.startDate]);

  const [scale, setScale] = useState<ScaleKey>(() =>
    range && range.totalDays > 70 ? "compact" : "day",
  );

  const dayWidth = SCALES[scale].width;
  const chartWidth = range ? range.totalDays * dayWidth : 0;

  /** Month headings, and the offsets their boundaries fall on. */
  const bands: Band[] = useMemo(() => {
    if (!range) return [];
    const out: Band[] = [];
    for (let i = 0; i < range.totalDays; i++) {
      const [y, m] = addDays(range.start, i).split("-").map(Number);
      const label = `${AR_MONTHS[m - 1]} ${y}`;
      const last = out[out.length - 1];
      if (last && last.label === label) last.days++;
      else out.push({ label, days: 1, offset: i });
    }
    return out;
  }, [range]);

  const todayOffset =
    range && today >= range.start && today <= range.end
      ? daysBetween(range.start, today)
      : null;

  const scrollToToday = () => {
    todayMarker.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  };

  if (scheduled.length === 0) {
    return (
      <div className="flex flex-col gap-6 pt-6">
        <TimelineHeading count={0} />
        <div className="rounded-xl border border-dashed border-ink/15 px-6 py-16 text-center">
          <CalendarOff className="mx-auto h-7 w-7 text-ink/25" />
          <p className="mt-3 text-[14px] text-ink/70">
            لا مهمة لها تاريخ بداية أو تسليم بعد.
          </p>
          <p className="mt-1 text-[13px] text-ink/55">
            حدّد تواريخ المهام من تبويب المهام لتظهر على التايم لاين.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <TimelineHeading count={scheduled.length} />

        <div className="flex items-center gap-2">
          {todayOffset !== null && (
            <button
              type="button"
              onClick={scrollToToday}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink/12 bg-paper px-3 py-1.5 text-[13px] font-medium text-ink/85 transition hover:bg-ink/5"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              اذهب إلى اليوم
            </button>
          )}

          <div className="flex items-center rounded-lg border border-ink/12 p-0.5">
            {(Object.keys(SCALES) as ScaleKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setScale(key)}
                aria-pressed={scale === key}
                className={`rounded-md px-3 py-1 text-[13px] font-medium transition ${
                  scale === key
                    ? "bg-accent text-white"
                    : "text-ink/70 hover:text-ink"
                }`}
              >
                {SCALES[key].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <StatusLegend />

      <div className="overflow-hidden rounded-xl border border-ink/10 bg-paper">
        <div className="flex">
          {/* Task names. Outside the scroller, so a title stays put while its
              bar is chased across the months. */}
          <div className="w-[200px] shrink-0 border-e border-ink/10 sm:w-[240px]">
            <div
              className="border-b border-ink/10 bg-surface px-4 text-[13px] font-medium text-ink/70"
              style={{ lineHeight: "56px", height: 56 }}
            >
              المهمة
            </div>
            {scheduled.map((span) => {
              const cfg = TASK_STATUS_CONFIG[span.task.approvalStatus];
              return (
                <div
                  key={span.task.id}
                  className="flex items-center gap-2 border-b border-ink/6 px-4 last:border-b-0"
                  style={{ height: ROW_HEIGHT }}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${cfg.dotBg}`}
                    aria-hidden
                  />
                  <span
                    className="truncate text-[14px] font-medium text-ink"
                    title={span.task.title}
                  >
                    {span.task.title}
                  </span>
                </div>
              );
            })}
          </div>

          {/* The chart itself */}
          <div className="flex-1 overflow-x-auto">
            <div className="relative" style={{ width: chartWidth }}>
              {/* Month bands */}
              <div className="relative h-7 border-b border-ink/8 bg-surface">
                {bands.map((band) => (
                  <div
                    key={band.label}
                    className="absolute top-0 flex h-7 items-center justify-center overflow-hidden border-s border-ink/10 text-[13px] font-bold text-ink/80"
                    style={{
                      insetInlineStart: band.offset * dayWidth,
                      width: band.days * dayWidth,
                    }}
                  >
                    {band.label}
                  </div>
                ))}
              </div>

              {/* Day ruler */}
              <div className="relative h-7 border-b border-ink/10 bg-surface">
                {SCALES[scale].showDayNumbers &&
                  Array.from({ length: range!.totalDays }, (_, i) => {
                    const day = addDays(range!.start, i);
                    return (
                      <div
                        key={day}
                        className={`absolute top-0 flex h-7 items-center justify-center text-[12px] tabular-nums ${
                          day === today
                            ? "font-bold text-gold-800"
                            : "text-ink/55"
                        }`}
                        style={{ insetInlineStart: i * dayWidth, width: dayWidth }}
                      >
                        {Number(day.split("-")[2])}
                      </div>
                    );
                  })}
              </div>

              {/* Rows */}
              <div
                className="relative"
                style={{
                  // One repeating hairline per day instead of a div per cell —
                  // a quarter at day scale is ~90 columns × every task.
                  backgroundImage: `repeating-linear-gradient(to left, var(--color-line) 0 1px, transparent 1px ${dayWidth}px)`,
                }}
              >
                {/* Month boundaries, drawn over the day hairlines */}
                {bands.slice(1).map((band) => (
                  <div
                    key={`edge-${band.label}`}
                    className="absolute inset-y-0 w-px bg-ink/15"
                    style={{ insetInlineStart: band.offset * dayWidth }}
                    aria-hidden
                  />
                ))}

                {/* Today. The one loud thing on the page. */}
                {todayOffset !== null && (
                  <div
                    ref={todayMarker}
                    className="absolute inset-y-0 z-10 w-[2px] bg-gold"
                    style={{ insetInlineStart: todayOffset * dayWidth }}
                    aria-hidden
                  />
                )}

                {scheduled.map((span) => (
                  <TimelineRow
                    key={span.task.id}
                    span={span}
                    rangeStart={range!.start}
                    dayWidth={dayWidth}
                    today={today}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {unscheduled.length > 0 && (
        <section>
          <h3 className="text-[14px] font-medium text-ink/75">
            مهام بلا تواريخ ({unscheduled.length})
          </h3>
          <p className="mt-1 text-[13px] text-ink/55">
            حدّد لها بداية أو موعد تسليم لتأخذ مكانها على التايم لاين.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {unscheduled.map((task) => {
              const cfg = TASK_STATUS_CONFIG[task.approvalStatus];
              return (
                <li
                  key={task.id}
                  className="inline-flex items-center gap-2 rounded-lg border border-dashed border-ink/15 px-3 py-1.5 text-[13px] text-ink/85"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${cfg.dotBg}`}
                    aria-hidden
                  />
                  {task.title}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function TimelineHeading({ count }: { count: number }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <GanttChartSquare className="h-5 w-5 text-accent" />
        <h3 className="text-[18px] font-bold text-ink">تايم لاين المهام</h3>
      </div>
      <p className="mt-1 text-[13px] text-ink/70">
        {count > 0
          ? `${count} مهمة مجدولة، من الأقدم بداية إلى الأحدث`
          : "كل مهمة لها تواريخ تظهر هنا كشريط على محور الزمن"}
      </p>
    </div>
  );
}

/** One task as a bar. The filled part is how much of its steps are done, so a
 *  half-filled bar reads as a half-done task without a number beside it. */
function TimelineRow({
  span,
  rangeStart,
  dayWidth,
  today,
}: {
  span: TaskSpan;
  rangeStart: string;
  dayWidth: number;
  today: string;
}) {
  const { task } = span;
  const cfg = TASK_STATUS_CONFIG[task.approvalStatus];

  const offset = daysBetween(rangeStart, span.startDay);
  const lengthDays = daysBetween(span.startDay, span.endDay) + 1;
  // A single day would otherwise render as a sliver at the compact scale.
  const width = Math.max(lengthDays * dayWidth - 2, 6);

  const progress =
    task.subtaskTotal > 0
      ? task.subtaskDone / task.subtaskTotal
      : task.approvalStatus === "DONE"
        ? 1
        : 0;

  const overdue = task.approvalStatus !== "DONE" && span.endDay < today;

  const readout = [
    task.title,
    `${formatLongDate(span.startDay)} ← ${formatLongDate(span.endDay)}`,
    cfg.label,
    task.assignee ? `المسؤول: ${task.assignee}` : null,
    task.subtaskTotal > 0
      ? `الخطوات: ${task.subtaskDone} من ${task.subtaskTotal}`
      : null,
    overdue ? "متأخرة عن موعدها" : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div
      className="relative border-b border-ink/6 last:border-b-0"
      style={{ height: ROW_HEIGHT }}
    >
      <div
        title={readout}
        className={`absolute top-1/2 flex -translate-y-1/2 items-center overflow-hidden rounded-sm border ${cfg.bg} ${cfg.border}`}
        style={{ insetInlineStart: offset * dayWidth + 1, width, height: 22 }}
      >
        <div
          className={`absolute inset-y-0 ${cfg.barBg} opacity-70`}
          style={{ insetInlineStart: 0, width: `${progress * 100}%` }}
          aria-hidden
        />
        {overdue && (
          <div
            className="absolute inset-y-0 w-[3px] bg-rose-600"
            style={{ insetInlineEnd: 0 }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
