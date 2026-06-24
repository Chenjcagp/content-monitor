"use client";

import { useMemo } from "react";

export interface SparklinePoint {
  date: string;
  value: number | null;
}

export function MonitorSparkline({
  points,
  width = 240,
  height = 60,
  color = "#10b981",
  label,
}: {
  points: SparklinePoint[];
  width?: number;
  height?: number;
  color?: string;
  label?: string;
}) {
  const { path, area, validCount, last, changePct } = useMemo(() => {
    const valid = points
      .map((p, i) => ({ ...p, i }))
      .filter((p) => typeof p.value === "number");
    if (valid.length < 2) {
      return { path: "", area: "", validCount: valid.length, last: null, changePct: null };
    }
    const ys = valid.map((p) => p.value as number);
    const min = Math.min(...ys);
    const max = Math.max(...ys);
    const range = max - min || 1;
    const xStep = (width - 8) / Math.max(1, points.length - 1);

    const coords = valid.map((p) => {
      const x = 4 + p.i * xStep;
      const y = height - 4 - ((p.value as number) - min) / range * (height - 8);
      return [x, y];
    });

    const d = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`).join(" ");
    const lastY = coords[coords.length - 1][1];
    const a =
      d +
      ` L ${(coords[coords.length - 1][0]).toFixed(1)} ${height} L 4 ${height} Z`;

    const last = valid[valid.length - 1].value as number;
    const first = valid[0].value as number;
    const change = first > 0 ? ((last - first) / first) * 100 : 0;

    return { path: d, area: a, validCount: valid.length, last, changePct: change };
  }, [points, width, height]);

  if (validCount < 2) {
    return (
      <div className="flex items-center justify-center text-[11px] text-slate-400 h-[60px]">
        数据点不足（需要 ≥ 2 个快照）
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        {label && (
          <span className="text-[11px] text-slate-500 font-medium">{label}</span>
        )}
        {changePct !== null && (
          <span
            className={
              "text-[11px] tabular-nums font-semibold " +
              (changePct >= 0 ? "text-emerald-600" : "text-rose-600")
            }
          >
            {changePct >= 0 ? "+" : ""}
            {changePct.toFixed(2)}%
          </span>
        )}
      </div>
      <svg width={width} height={height} className="block">
        <path d={area} fill={color} fillOpacity="0.1" />
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}