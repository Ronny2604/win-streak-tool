interface EliteBadgeProps {
  label?: string;
}

export function EliteBadge({ label = "ELITE" }: EliteBadgeProps) {
  return (
    <span className="inline-flex items-center rounded-md bg-badge-elite/20 px-2 py-0.5 text-[10px] font-bold text-neon tracking-wider">
      {label}
    </span>
  );
}
