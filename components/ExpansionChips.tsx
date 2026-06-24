"use client";

import { Loader2, Tag } from "lucide-react";

export function ExpansionChips({
  topics,
  loading,
  onPick,
}: {
  topics: string[];
  loading: boolean;
  onPick: (t: string) => void;
}) {
  if (!loading && topics.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="inline-flex items-center gap-1 text-slate-400 text-[11px] font-medium">
        <Tag className="h-3 w-3" />
        拓词
      </span>
      {loading && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
      {topics.slice(0, 20).map((t, i) => (
        <button
          key={`${t}-${i}`}
          onClick={() => onPick(t)}
          className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 hover:bg-brand-100 transition border border-brand-100"
        >
          {t}
        </button>
      ))}
    </div>
  );
}