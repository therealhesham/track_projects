import type { ComponentProps } from "react";

const VARIANTS = {
  primary: "bg-accent text-paper hover:bg-accent-600 active:bg-accent-700",
  secondary:
    "border border-ink/16 hover:bg-ink/7 active:bg-ink/14 text-ink",
  ghost: "text-accent px-1.5 hover:bg-accent/10 active:bg-accent/18",
} as const;

type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof VARIANTS;
};

/** The design system's `.btn`. Square-ish corners, heading weight, 14px. */
export default function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-transparent px-[18px] py-2.5 text-[15px] leading-[1.2] font-semibold disabled:cursor-not-allowed disabled:opacity-45 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
