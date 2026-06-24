"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { FileText, LineChart, Settings as SettingsIcon } from "lucide-react";

const TABS = [
  { key: "content", label: "内容", icon: FileText, href: "content" },
  { key: "analysis", label: "选题分析与报告", icon: LineChart, href: "analysis" },
  { key: "settings", label: "监控设置", icon: SettingsIcon, href: "settings" },
] as const;

export function TabNav({ id }: { id: string }) {
  const pathname = usePathname();
  const activeKey = pathname.split("/").pop();

  return (
    <div className="border-b border-slate-200 bg-white px-8">
      <nav className="flex gap-1 -mb-px">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeKey === tab.href;
          return (
            <Link
              key={tab.key}
              href={`/category/${id}/${tab.href}`}
              className={clsx(
                "inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                active
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}