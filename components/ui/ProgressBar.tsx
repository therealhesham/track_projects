/** A 3px rule that fills with accent to `pct`. Purely decorative — the
 *  percentage is always printed as text beside it. */
export default function ProgressBar({
  pct,
  className = "",
}: {
  pct: number;
  className?: string;
}) {
  return (
    <div className={`h-[3px] bg-line ${className}`}>
      <div
        className="h-full bg-accent"
        style={{ width: `${pct}%` }}
        aria-hidden
      />
    </div>
  );
}
