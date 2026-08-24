/**
 * The project-management mark: the two-tone ring carried over from the Rawaes
 * logo, with three task bars of differing progress inside it.
 *
 * Inline rather than an <img> so it stays crisp at any size and takes its
 * colours from the theme tokens — retint the brand in globals.css and the mark
 * follows.
 */
export default function LogoMark({
  className = "",
  /** Accessible name. Omit on decorative copies so they are skipped. */
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path
        d="M60 8 A52 52 0 0 0 60 112"
        fill="none"
        stroke="var(--color-gold)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M60 8 A52 52 0 0 1 60 112"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <rect x="36" y="44" width="48" height="8" rx="4" fill="var(--color-accent)" />
      <rect x="36" y="58" width="32" height="8" rx="4" fill="var(--color-gold)" />
      <rect
        x="36"
        y="72"
        width="40"
        height="8"
        rx="4"
        fill="var(--color-accent)"
        opacity="0.4"
      />
    </svg>
  );
}
