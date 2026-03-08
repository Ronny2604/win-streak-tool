import { X } from "lucide-react";

interface FilterChipProps {
  label: string;
  active?: boolean;
  removable?: boolean;
  onClick: () => void;
  onRemove?: () => void;
}

export function FilterChip({ label, active, removable, onClick, onRemove }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
        active
          ? "bg-filter-chip-active text-filter-chip-active-foreground glow-neon"
          : "bg-filter-chip text-filter-chip-foreground hover:bg-surface-hover"
      }`}
    >
      {label}
      {removable && onRemove && (
        <X
          className="h-3 w-3 cursor-pointer opacity-70 hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        />
      )}
    </button>
  );
}
