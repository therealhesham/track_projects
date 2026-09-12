import type { TaskApprovalStatus } from "@prisma/client";

/**
 * The written record behind where an item ended up: what its holder said when
 * they reported it finished, and what the manager said when they ruled on it.
 *
 * Shared by all three task kinds and every surface that shows one, because the
 * point is that the reason survives the decision — a task that reads as done,
 * or as turned away, has to carry why on its face, not only in the feed.
 *
 * Which of the two manager notes is a *reason for refusal* depends on the state
 * the item landed in, not on the column it came from: `reviewNote` is a
 * rejection only for a REJECTED item, and `completionReviewNote` is one only
 * for an item that was sent back to ACTIVE.
 */
export default function DecisionNotes({
  approvalStatus,
  completionNote,
  reviewNote,
  completionReviewNote,
  size = "normal",
}: {
  approvalStatus: TaskApprovalStatus;
  completionNote: string | null;
  reviewNote: string | null;
  completionReviewNote: string | null;
  /** `compact` for the step rows, which sit inside a task card already. */
  size?: "normal" | "compact";
}) {
  const rejected = approvalStatus === "REJECTED";
  const sentBack = approvalStatus === "ACTIVE";

  const notes = [
    completionNote && {
      key: "completion",
      label: "ملاحظة من صاحب المهمة",
      text: completionNote,
      bad: false,
    },
    reviewNote && {
      key: "review",
      label: rejected ? "سبب الرفض" : "ملاحظة الاعتماد",
      text: reviewNote,
      bad: rejected,
    },
    completionReviewNote && {
      key: "completionReview",
      label: sentBack ? "سبب إعادة المهمة" : "ملاحظة الموافقة على الإتمام",
      text: completionReviewNote,
      bad: sentBack,
    },
  ].filter(Boolean) as {
    key: string;
    label: string;
    text: string;
    bad: boolean;
  }[];

  if (notes.length === 0) return null;

  const pad = size === "compact" ? "px-2.5 py-1.5" : "px-3 py-2";
  const labelSize = size === "compact" ? "text-[11px]" : "text-[12px]";
  const textSize = size === "compact" ? "text-[12px]" : "text-[13px]";

  return (
    <div className={`mt-2 flex flex-col gap-1.5 ${size === "compact" ? "" : "max-w-prose"}`}>
      {notes.map((n) => (
        <div
          key={n.key}
          className={`rounded-md border ${pad} ${
            n.bad
              ? "border-red-200 bg-red-50"
              : "border-ink/10 bg-ink/[0.02]"
          }`}
        >
          <div
            className={`${labelSize} font-semibold ${
              n.bad ? "text-red-700" : "text-ink/60"
            }`}
          >
            {n.label}
          </div>
          <p
            className={`mt-0.5 ${textSize} leading-[1.7] whitespace-pre-wrap ${
              n.bad ? "text-red-900" : "text-ink/85"
            }`}
          >
            {n.text}
          </p>
        </div>
      ))}
    </div>
  );
}
