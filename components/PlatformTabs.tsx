"use client";

import clsx from "clsx";
import { PLATFORM_LIST } from "@/lib/platforms";
import type { PlatformId } from "@/lib/types";
import { LayoutGrid } from "lucide-react";

interface Props {
  active: PlatformId | "all";
  onChange: (p: PlatformId | "all") => void;
  counts: Record<PlatformId | "all", number>;
}

export function PlatformTabs({ active, onChange, counts }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {/* 全部 */}
      <button
        onClick={() => onChange("all")}
        className={clsx(
          "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-all",
          active === "all"
            ? "border-slate-900 bg-slate-900 text-white shadow-sm"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        全部
        <span
          className={clsx(
            "rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
            active === "all"
              ? "bg-white/20 text-white"
              : "bg-slate-100 text-slate-500"
          )}
        >
          {counts.all}
        </span>
      </button>

      {PLATFORM_LIST.map((p) => {
        const isActive = active === p.id;
        const count = counts[p.id] ?? 0;
        return (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            disabled={count === 0}
            className={clsx(
              "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-all",
              isActive
                ? "border-transparent shadow-sm"
                : count === 0
                ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            )}
            style={
              isActive
                ? {
                    backgroundColor: p.brandColor,
                    color: p.brandColor === "#000000" ? "#fff" : "#fff",
                  }
                : undefined
            }
          >
            <span>{p.icon}</span>
            {p.name}
            <span
              className={clsx(
                "rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
                isActive
                  ? "bg-white/25 text-white"
                  : "bg-slate-100 text-slate-500"
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}