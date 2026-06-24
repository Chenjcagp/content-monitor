"use client";

import { useRef } from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, Check, Loader2, Circle } from "lucide-react";
import type { DateBucket } from "@/lib/types";

interface Props {
  buckets: DateBucket[];
  selected: string;
  onChange: (date: string) => void;
  // true 时显示报告状态（用于 Tab 2），false 时显示内容数量（用于 Tab 1）
  showReportStatus?: boolean;
}

export function DateScroller({
  buckets,
  selected,
  onChange,
  showReportStatus,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (delta: number) => {
    ref.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {/* 左侧箭头 */}
      <button
        onClick={() => scroll(-240)}
        className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 text-slate-500"
        aria-label="向左滚动"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div
        ref={ref}
        className="overflow-x-auto scrollbar-hide scroll-smooth px-1"
      >
        <div className="flex gap-2 py-1">
          {buckets.map((b) => {
            const isActive = b.date === selected;
            // 解析日期数字（用于副标题）
            const day = Number(b.date.split("-")[2]);
            return (
              <button
                key={b.date}
                onClick={() => onChange(b.date)}
                className={clsx(
                  "shrink-0 w-[88px] rounded-xl border px-3 py-2.5 text-left transition-all",
                  isActive
                    ? "border-brand-500 bg-brand-50 shadow-sm"
                    : b.count > 0 || b.hasReport
                    ? "border-slate-200 bg-white hover:border-slate-300"
                    : "border-slate-100 bg-slate-50/50 text-slate-300 hover:border-slate-200"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={clsx(
                      "text-[11px] font-medium",
                      isActive
                        ? "text-brand-700"
                        : b.relativeLabel === "今天"
                        ? "text-brand-600"
                        : "text-slate-500"
                    )}
                  >
                    {b.relativeLabel}
                  </span>

                  {showReportStatus ? (
                    <ReportBadge status={b.reportStatus} active={isActive} />
                  ) : b.count > 0 ? (
                    <span
                      className={clsx(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                        isActive
                          ? "bg-brand-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {b.count}
                    </span>
                  ) : null}
                </div>

                <div
                  className={clsx(
                    "mt-1.5 text-lg font-semibold tabular-nums leading-none",
                    isActive ? "text-brand-700" : "text-slate-700"
                  )}
                >
                  {day}
                </div>

                <div
                  className={clsx(
                    "text-[10px] mt-1",
                    isActive ? "text-brand-600/70" : "text-slate-400"
                  )}
                >
                  {b.weekday}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 右侧箭头 */}
      <button
        onClick={() => scroll(240)}
        className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 text-slate-500"
        aria-label="向右滚动"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function ReportBadge({
  status,
  active,
}: {
  status?: "ready" | "generating" | "pending";
  active: boolean;
}) {
  if (status === "ready") {
    return (
      <span
        className={clsx(
          "inline-flex h-4 w-4 items-center justify-center rounded-full",
          active ? "bg-brand-600 text-white" : "bg-emerald-500 text-white"
        )}
      >
        <Check className="h-2.5 w-2.5" />
      </span>
    );
  }
  if (status === "generating") {
    return (
      <span
        className={clsx(
          "inline-flex h-4 w-4 items-center justify-center rounded-full",
          active ? "bg-brand-600 text-white" : "bg-amber-100 text-amber-600"
        )}
      >
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
      </span>
    );
  }
  return (
    <span
      className={clsx(
        "inline-flex h-4 w-4 items-center justify-center rounded-full",
        active ? "bg-brand-600/20" : "bg-slate-100"
      )}
    >
      <Circle
        className={clsx(
          "h-2 w-2",
          active ? "text-brand-600 fill-brand-600" : "text-slate-300 fill-slate-300"
        )}
      />
    </span>
  );
}