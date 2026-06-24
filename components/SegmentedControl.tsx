"use client";

import clsx from "clsx";

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface Props<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: Props<T>) {
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={clsx(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors",
              active
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}