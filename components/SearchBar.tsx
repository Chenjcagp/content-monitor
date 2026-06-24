"use client";

import { Search, X } from "lucide-react";

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "搜索关键词，如「Claude」「Vibe Coding」…",
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <form
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(value);
      }}
    >
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-slate-200 bg-white text-sm placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100 text-slate-400"
          aria-label="清除"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </form>
  );
}