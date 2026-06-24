"use client";

import clsx from "clsx";
import type { SkillDef } from "@/lib/skills/types";

export function SkillToggleRow({
  skill,
  enabled,
  onToggle,
}: {
  skill: SkillDef;
  enabled: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div
      className={clsx(
        "flex items-start gap-3 rounded-lg border p-3.5 transition",
        enabled ? "border-brand-200 bg-brand-50/30" : "border-slate-200 bg-white"
      )}
    >
      <button
        type="button"
        onClick={() => onToggle(!enabled)}
        role="switch"
        aria-checked={enabled}
        className={clsx(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition mt-0.5",
          enabled ? "bg-brand-600" : "bg-slate-300"
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
            enabled ? "left-[18px]" : "left-0.5"
          )}
        />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900">{skill.name}</span>
          <span className="text-[10.5px] text-slate-400 font-mono">{skill.id}</span>
          {!skill.persist && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
              实时不入库
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-slate-500">{skill.description}</p>
      </div>
    </div>
  );
}