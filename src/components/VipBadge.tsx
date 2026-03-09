import { Crown } from "lucide-react";

interface VipBadgeProps {
  plan?: string;
}

export function VipBadge({ plan = "pro" }: VipBadgeProps) {
  if (plan !== "pro") return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-badge-star/15 border border-badge-star/30 px-2.5 py-0.5 text-[10px] font-extrabold tracking-widest text-badge-star animate-pulse-subtle select-none">
      <Crown className="h-3 w-3" />
      VIP
    </span>
  );
}
