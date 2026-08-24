"use client";

type SegmentedProps<T extends string> = {
  /** Radio group name — must be unique per control on the page. */
  name: string;
  options: readonly T[] | readonly { key: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/**
 * The design system's `.seg` control: a hairline-bordered strip of options,
 * the active one filled with the accent. Radios under the hood, so arrow keys
 * and screen readers work without extra wiring.
 */
export default function Segmented<T extends string>({
  name,
  options,
  value,
  onChange,
  className = "",
}: SegmentedProps<T>) {
  const items = options.map((o) =>
    typeof o === "string" ? { key: o as T, label: o as string } : o,
  );

  return (
    <div
      className={`inline-flex overflow-hidden rounded-md border border-ink/16 ${className}`}
    >
      {items.map((item, i) => {
        const active = item.key === value;
        return (
          <label
            key={item.key}
            className={`inline-flex cursor-pointer items-center gap-1.5 px-3 py-[7px] text-[14px] ${
              i > 0 ? "border-s border-ink/16" : ""
            } ${
              active
                ? "bg-accent text-paper"
                : "hover:bg-ink/7 has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-accent"
            }`}
          >
            <input
              type="radio"
              name={name}
              checked={active}
              onChange={() => onChange(item.key)}
              className="pointer-events-none absolute h-0 w-0 opacity-0"
            />
            <span>{item.label}</span>
          </label>
        );
      })}
    </div>
  );
}
