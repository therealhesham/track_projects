import type { ProjectStatus } from "@prisma/client";
import Link from "next/link";
import { STATUS_LABEL, STATUS_TAG } from "@/lib/labels";

/** The design system's `.tag` chip, tinted by project status. */
export default function StatusTag({
  status,
  projectId,
  className = "",
}: {
  status: ProjectStatus;
  projectId?: string;
  className?: string;
}) {
  const chip = (
    <span
      className={`inline-flex items-center rounded-sm px-2.5 py-[3px] text-[12px] tracking-[0.02em] ${STATUS_TAG[status]} ${className}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );

  if (projectId) {
    return (
      <Link
        href={`/projects/${projectId}`}
        onClick={(e) => e.stopPropagation()}
        title={`فتح صفحة المشروع (${STATUS_LABEL[status]})`}
        className="hover:opacity-80 transition-opacity"
      >
        {chip}
      </Link>
    );
  }

  return chip;
}
