import type { ProjectStatus, TaskApprovalStatus, TaskStage } from "@prisma/client";

/**
 * The database stores stable English identifiers; every Arabic string the user
 * sees is produced here. Keep translation in this one module so the schema and
 * the copy can move independently.
 */

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  PLANNING: "تخطيط",
  ACTIVE: "قائم",
  BLOCKED: "متعطل",
  DONE: "مكتمل",
};

export const STAGE_LABEL: Record<TaskStage, string> = {
  NEW: "جديد",
  IN_PROGRESS: "قيد التنفيذ",
  REVIEW: "مراجعة",
  DONE: "مكتمل",
};

/** Board column order. A card advances along this list and wraps to the start. */
export const STAGE_ORDER = [
  "NEW",
  "IN_PROGRESS",
  "REVIEW",
  "DONE",
] as const satisfies readonly TaskStage[];

export function nextStage(stage: TaskStage): TaskStage {
  const i = STAGE_ORDER.indexOf(stage);
  return STAGE_ORDER[(i + 1) % STAGE_ORDER.length];
}

/** Tailwind classes for the status chip, keyed by the stored enum. */
export const STATUS_TAG: Record<ProjectStatus, string> = {
  ACTIVE: "bg-accent-100 text-accent-800",
  BLOCKED: "bg-gold-100 text-gold-800",
  DONE: "bg-mute-100 text-mute-800",
  PLANNING: "border border-accent text-accent",
};

/** Filter strip above the projects table. */
export const STATUS_FILTERS = [
  { key: "ALL", label: "الكل" },
  { key: "ACTIVE", label: "قائم" },
  { key: "BLOCKED", label: "متعطل" },
  { key: "PLANNING", label: "تخطيط" },
  { key: "DONE", label: "مكتمل" },
] as const;

export type FilterKey = (typeof STATUS_FILTERS)[number]["key"];

export const SCREENS = [
  { key: "projects", label: "المشاريع" },
  { key: "board", label: "لوحة المهام" },
  { key: "calendar", label: "التقويم" },
] as const;

export type ScreenKey = (typeof SCREENS)[number]["key"];

export const MOBILE_TABS = ["المشاريع", "المهام", "التقارير"] as const;
export type MobileTab = (typeof MOBILE_TABS)[number];

// ── Task approval lifecycle labels ──────────────────────────────────────────

export const APPROVAL_STATUS_LABEL: Record<TaskApprovalStatus, string> = {
  PENDING_APPROVAL: "في انتظار الاعتماد",
  ACTIVE: "نشطة",
  PENDING_COMPLETION: "في انتظار موافقة المدير",
  DONE: "مكتملة",
  REJECTED: "مرفوضة",
};

/** Tailwind classes for the task approval badge. */
export const APPROVAL_STATUS_TAG: Record<TaskApprovalStatus, string> = {
  PENDING_APPROVAL: "bg-gold-100 text-gold-800 border border-gold-600/30",
  ACTIVE: "bg-accent-100 text-accent-800 border border-accent-200",
  PENDING_COMPLETION: "bg-blue-50 text-blue-700 border border-blue-200",
  DONE: "bg-mute-100 text-mute-800 border border-ink/10",
  REJECTED: "bg-red-50 text-red-700 border border-red-200",
};
