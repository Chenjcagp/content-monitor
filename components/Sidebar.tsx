"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Plus, Radar, Settings, Sparkles } from "lucide-react";
import clsx from "clsx";

interface Category {
  id: string;
  name: string;
  description: string | null;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  // 从路径中提取当前 category id
  const match = pathname.match(/^\/category\/([^/]+)/);
  const activeId = match?.[1];

  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/categories");
      const j = await r.json();
      if (j.ok) setCats(j.categories as Category[]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // 监听自定义事件，其他地方删除/新增 category 后可触发 refresh
    const onChange = () => refresh();
    window.addEventListener("categories:changed", onChange);
    return () => window.removeEventListener("categories:changed", onChange);
  }, [refresh]);

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white">
            <Radar className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">
              内容雷达
            </div>
            <div className="text-[11px] text-slate-400">Content Radar</div>
          </div>
        </div>
      </div>

      {/* 分类标题 */}
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
          监控分类
        </span>
        <button
          onClick={async () => {
            const name = prompt("新建监控分类名称：");
            if (!name?.trim()) return;
            const desc = prompt("分类描述（可选）：") ?? "";
            const r = await fetch("/api/categories", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: name.trim(), description: desc }),
            });
            const j = await r.json();
            if (j.ok) {
              window.dispatchEvent(new Event("categories:changed"));
              router.push(`/category/${j.category.id}/content`);
            } else {
              alert(j.error ?? "创建失败");
            }
          }}
          className="text-slate-400 hover:text-brand-600 transition-colors"
          title="新建监控分类"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* 分类列表 */}
      <nav className="px-3 flex-1 overflow-y-auto">
        {loading ? (
          <div className="px-3 py-4 text-xs text-slate-400">加载中…</div>
        ) : cats.length === 0 ? (
          <div className="px-3 py-4 text-xs text-slate-400">
            暂无监控分类
          </div>
        ) : (
          cats.map((c) => {
            const active = c.id === activeId;
            return (
              <Link
                key={c.id}
                href={`/category/${c.id}/content`}
                className={clsx(
                  "block rounded-lg px-3 py-2.5 mb-1 transition-colors group",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "hover:bg-slate-50 text-slate-700"
                )}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={clsx(
                      "mt-1 h-1.5 w-1.5 rounded-full shrink-0",
                      active ? "bg-brand-600" : "bg-slate-300 group-hover:bg-slate-400"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{c.name}</div>
                    <div
                      className={clsx(
                        "text-[11px] mt-0.5 truncate",
                        active ? "text-brand-600/70" : "text-slate-400"
                      )}
                    >
                      {c.description ?? "—"}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}

        <button
          onClick={async () => {
            const name = prompt("新建监控分类名称：");
            if (!name?.trim()) return;
            const desc = prompt("分类描述（可选）：") ?? "";
            const r = await fetch("/api/categories", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: name.trim(), description: desc }),
            });
            const j = await r.json();
            if (j.ok) {
              window.dispatchEvent(new Event("categories:changed"));
              router.push(`/category/${j.category.id}/content`);
            } else {
              alert(j.error ?? "创建失败");
            }
          }}
          className="mt-2 w-full rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-xs text-slate-500 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50/40 transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          新建监控分类
        </button>
      </nav>

      {/* 底部顶级入口 */}
      <div className="border-t border-slate-100 p-3 space-y-1">
        <NavLink
          href="/monitor"
          icon={<Radar className="h-4 w-4" />}
          label="对标监控"
          active={pathname.startsWith("/monitor")}
        />
        <NavLink
          href="/settings"
          icon={<Settings className="h-4 w-4" />}
          label="全局设置"
          active={pathname.startsWith("/settings")}
        />
        <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-400">
          <Sparkles className="h-3 w-3" />
          AI 分析基于 GPT-4o
        </div>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-brand-50 text-brand-700 font-medium"
          : "text-slate-600 hover:bg-slate-50"
      )}
    >
      <span className={active ? "text-brand-600" : "text-slate-400"}>{icon}</span>
      {label}
    </Link>
  );
}