import { forwardRef } from "react";

interface EliteBadgeProps {
  label?: string;
}

export const EliteBadge = forwardRef<HTMLSpanElement, EliteBadgeProps>(
  ({ label = "ELITE" }, ref) => {
    return (
      <span
        ref={ref}
        className="inline-flex items-center rounded-md bg-badge-elite/20 px-2 py-0.5 text-[10px] font-bold text-neon tracking-wider"
      >
        {label}
      </span>
    );
  }
);
EliteBadge.displayName = "EliteBadge";
