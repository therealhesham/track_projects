import {
  approveTask,
  rejectTask,
  requestCompletion,
  approveCompletion,
  rejectCompletion,
  approveSubtask,
  rejectSubtask,
  requestSubtaskCompletion,
  approveSubtaskCompletion,
  rejectSubtaskCompletion,
} from "@/app/actions";
import {
  approveDailyTask,
  rejectDailyTask,
  requestDailyCompletion,
  approveDailyCompletion,
  rejectDailyCompletion,
} from "@/app/daily-actions";
import type { DecisionTone } from "./DecisionDialog";

/**
 * The five points where a task's state is written up, as data: the wording its
 * dialog shows and the action behind it.
 *
 * Two surfaces show the same task — the project page's card and the dashboard's
 * row — so the copy lives here rather than in either, and they cannot drift
 * into describing the same decision differently.
 */
export type Decision =
  | "complete"
  | "admit"
  | "turnAway"
  | "signOff"
  | "sendBack";

export type DecisionSpec = {
  title: string;
  description: string;
  label: string;
  placeholder: string;
  /** A rejection has to say why; an approval may pass in silence. */
  required?: boolean;
  confirmLabel: string;
  tone: DecisionTone;
  run: (id: string, note?: string) => Promise<{ ok: boolean; error?: string }>;
};

export const TASK_DECISIONS: Record<Decision, DecisionSpec> = {
  complete: {
    title: "تسجيل إتمام المهمة",
    description: "اكتب ما أنجزته ليطّلع عليه المدير قبل الاعتماد.",
    label: "ملاحظة الإتمام",
    placeholder: "ما الذي تم إنجازه؟",
    confirmLabel: "إرسال للاعتماد",
    tone: "accept",
    run: requestCompletion,
  },
  admit: {
    title: "اعتماد المهمة",
    description: "المهمة ستنتقل إلى «نشطة» ويبدأ العمل عليها.",
    label: "ملاحظة الاعتماد",
    placeholder: "أي توجيه لصاحب المهمة…",
    confirmLabel: "اعتماد",
    tone: "accept",
    run: approveTask,
  },
  turnAway: {
    title: "رفض المهمة",
    description: "وضّح سبب الرفض ليعرف من اقترحها ما الذي لم يكن مناسباً.",
    label: "سبب الرفض",
    placeholder: "لماذا تُرفض هذه المهمة؟",
    required: true,
    confirmLabel: "رفض المهمة",
    tone: "reject",
    run: rejectTask,
  },
  signOff: {
    title: "الموافقة على إتمام المهمة",
    description: "المهمة ستُحتسب مكتملة ضمن نسبة إنجاز المشروع.",
    label: "ملاحظة الموافقة",
    placeholder: "أي ملاحظة على العمل المُنجز…",
    confirmLabel: "موافقة",
    tone: "accept",
    run: approveCompletion,
  },
  sendBack: {
    title: "رفض إتمام المهمة",
    description: "المهمة سترجع إلى «نشطة» ليستكمل صاحبها العمل عليها.",
    label: "سبب الرفض",
    placeholder: "ما الذي ينقص أو يحتاج تعديلاً؟",
    required: true,
    confirmLabel: "إعادة للعمل",
    tone: "reject",
    run: rejectCompletion,
  },
};

/** The same five, worded for a single step of a task. */
export const SUBTASK_DECISIONS: Record<Decision, DecisionSpec> = {
  complete: {
    title: "تسجيل إتمام الخطوة",
    description: "اكتب ما أنجزته في هذه الخطوة قبل عرضها على المدير.",
    label: "ملاحظة الإتمام",
    placeholder: "ما الذي تم إنجازه؟",
    confirmLabel: "إرسال للاعتماد",
    tone: "accept",
    run: requestSubtaskCompletion,
  },
  admit: {
    title: "اعتماد الخطوة",
    description: "الخطوة ستنتقل إلى «نشطة» ويبدأ العمل عليها.",
    label: "ملاحظة الاعتماد",
    placeholder: "أي توجيه لمن يقوم بالخطوة…",
    confirmLabel: "اعتماد",
    tone: "accept",
    run: approveSubtask,
  },
  turnAway: {
    title: "رفض الخطوة",
    description: "وضّح سبب الرفض ليعرف من اقترحها ما الذي لم يكن مناسباً.",
    label: "سبب الرفض",
    placeholder: "لماذا تُرفض هذه الخطوة؟",
    required: true,
    confirmLabel: "رفض الخطوة",
    tone: "reject",
    run: rejectSubtask,
  },
  signOff: {
    title: "الموافقة على إتمام الخطوة",
    description: "الخطوة ستُحتسب منتهية، وتقترب المهمة من الاكتمال.",
    label: "ملاحظة الموافقة",
    placeholder: "أي ملاحظة على العمل المُنجز…",
    confirmLabel: "موافقة",
    tone: "accept",
    run: approveSubtaskCompletion,
  },
  sendBack: {
    title: "رفض إتمام الخطوة",
    description: "الخطوة سترجع إلى «نشطة» ليستكمل صاحبها العمل عليها.",
    label: "سبب الرفض",
    placeholder: "ما الذي ينقص أو يحتاج تعديلاً؟",
    required: true,
    confirmLabel: "إعادة للعمل",
    tone: "reject",
    run: rejectSubtaskCompletion,
  },
};

/** The same five again, for a personal daily task. The super admin rules here. */
export const DAILY_DECISIONS: Record<Decision, DecisionSpec> = {
  complete: {
    title: "تسجيل إتمام المهمة اليومية",
    description: "اكتب ما أنجزته ليطّلع عليه السوبر ادمن قبل الاعتماد.",
    label: "ملاحظة الإتمام",
    placeholder: "ما الذي تم إنجازه؟",
    confirmLabel: "إرسال للاعتماد",
    tone: "accept",
    run: requestDailyCompletion,
  },
  admit: {
    title: "اعتماد المهمة اليومية",
    description: "المهمة ستنتقل إلى «نشطة» ويبدأ العمل عليها.",
    label: "ملاحظة الاعتماد",
    placeholder: "أي توجيه لصاحب المهمة…",
    confirmLabel: "اعتماد",
    tone: "accept",
    run: approveDailyTask,
  },
  turnAway: {
    title: "رفض المهمة اليومية",
    description: "وضّح سبب الرفض ليعرف من اقترحها ما الذي لم يكن مناسباً.",
    label: "سبب الرفض",
    placeholder: "لماذا تُرفض هذه المهمة؟",
    required: true,
    confirmLabel: "رفض المهمة",
    tone: "reject",
    run: rejectDailyTask,
  },
  signOff: {
    title: "الموافقة على إتمام المهمة اليومية",
    description: "المهمة ستُحتسب مكتملة في قائمة صاحبها.",
    label: "ملاحظة الموافقة",
    placeholder: "أي ملاحظة على العمل المُنجز…",
    confirmLabel: "موافقة",
    tone: "accept",
    run: approveDailyCompletion,
  },
  sendBack: {
    title: "إرجاع المهمة اليومية",
    description: "المهمة سترجع إلى «نشطة» ليستكمل صاحبها العمل عليها.",
    label: "سبب الإرجاع",
    placeholder: "ما الذي ينقص أو يحتاج تعديلاً؟",
    required: true,
    confirmLabel: "إرجاع للعمل",
    tone: "reject",
    run: rejectDailyCompletion,
  },
};
