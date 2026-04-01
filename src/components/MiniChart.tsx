import { forwardRef } from "react";

interface MiniChartProps {
  data: number[];
  positive?: boolean;
}

export const MiniChart = forwardRef<HTMLDivElement, MiniChartProps>(
  ({ data, positive = true }, ref) => {
    const max = Math.max(...data, 1);
    const barCount = data.length;

    return (
      <div ref={ref} className="flex items-end gap-[2px] h-10">
        {data.map((val, i) => {
          const height = Math.max((val / max) * 100, 8);
          const isPositive = val > 0;
          return (
            <div
              key={i}
              className={`w-[4px] rounded-t-sm transition-all ${
                isPositive ? "bg-chart-positive" : "bg-chart-negative"
              }`}
              style={{ height: `${height}%`, opacity: 0.5 + (i / barCount) * 0.5 }}
            />
          );
        })}
      </div>
    );
  }
);
MiniChart.displayName = "MiniChart";
