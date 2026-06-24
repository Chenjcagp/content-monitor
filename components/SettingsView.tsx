"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  Plus,
  X,
  Save,
  RefreshCw,
  Trash2,
  Hash,
  AlertTriangle,
  Loader2,
  Check,
  Power,
  Pause,
} from "lucide-react";
import { PLATFORM_LIST } from "@/lib/platforms";
import type { PlatformId } from "@/lib/types";

interface CategoryData {
  id: string;
  name: string;
  description: string | null;
  enabled_platforms: string[];
  keywords: string[];
  enabled: 0 | 1;
}

export function SettingsView({ categoryId }: { categoryId: string }) {
  const router = useRouter();
  const [cat, setCat] = useState<CategoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [platforms, setPlatforms] = useState<PlatformId[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [kwInput, setKwInput] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/categories`);
      const j = await r.json();
      const found = (j.categories as CategoryData[]).find((c) => c.id === categoryId);
      if (!found) {
        // category 已删除，回到首页
        router.push("/");
        return;
      }
      setCat(found);
      setName(found.name);
      setDescription(found.description ?? "");
      setPlatforms(found.enabled_platforms as PlatformId[]);
      setKeywords(found.keywords);
      setEnabled(found.enabled === 1);
    } finally {
      setLoading(false);
    }
  }, [categoryId, router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const showToast = (kind: "ok" | "err", msg: string) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2200);
  };

  const togglePlatform = (id: PlatformId) => {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const addKeyword = () => {
    const v = kwInput.trim();
    if (!v || keywords.includes(v)) return;
    setKeywords([...keywords, v]);
    setKwInput("");
  };

  const removeKeyword = (k: string) => {
    setKeywords(keywords.filter((x) => x !== k));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await fetch(`/api/categories/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          enabled_platforms: platforms,
          keywords,
          enabled,
        }),
      });
      const j = await r.json();
      if (j.ok) {
        showToast("ok", "已保存");
        window.dispatchEvent(new Event("categories:changed"));
        await refresh();
      } else {
        showToast("err", j.error ?? "保存失败");
      }
    } catch (e) {
      showToast("err", String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const r = await fetch("/api/cron/run", { method: "POST" });
      const j = await r.json();
      if (j.ok) {
        showToast("ok", `同步完成：新增 ${j.totalInserted} 条`);
      } else {
        showToast("err", j.error ?? "同步失败");
      }
    } catch (e) {
      showToast("err", String(e));
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const r = await fetch(`/api/categories/${categoryId}`, { method: "DELETE" });
      const j = await r.json();
      if (j.ok) {
        showToast("ok", `已删除「${name}」并清理 ${j.contentsDeleted} 条历史内容`);
        window.dispatchEvent(new Event("categories:changed"));
        setTimeout(() => router.push("/"), 800);
      } else {
        showToast("err", j.error ?? "删除失败");
        setDeleting(false);
      }
    } catch (e) {
      showToast("err", String(e));
      setDeleting(false);
    }
  };

  if (loading || !cat) {
    return (
      <div className="p-8 flex items-center gap-2 text-slate-500 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        加载配置…
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl relative">
      {/* Toast */}
      {toast && (
        <div
          className={clsx(
            "fixed top-4 right-4 z-50 rounded-lg px-4 py-2 text-sm shadow-lg flex items-center gap-2",
            toast.kind === "ok"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          )}
        >
          {toast.kind === "ok" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* 顶部状态条 */}
      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
        <div className="text-xs text-slate-600">
          修改设置后，下一次自动运行（明天 09:00）将按新配置采集。
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {syncing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            立即运行一次
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            保存配置
          </button>
        </div>
      </div>

      {/* 基本信息 */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <SectionHeader title="基本信息" description="修改分类名称和描述" />
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">分类名称 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">分类描述</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简短描述这个分类的选题方向"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* 启动监控 */}
      <section
        className={clsx(
          "rounded-xl border p-6 transition-colors",
          enabled
            ? "border-emerald-200 bg-emerald-50/40"
            : "border-slate-200 bg-slate-50"
        )}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
              {enabled ? (
                <Power className="h-4 w-4 text-emerald-600" />
              ) : (
                <Pause className="h-4 w-4 text-slate-500" />
              )}
              启动监控
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {enabled
                ? "该分类当前正在运行：cron 每天会自动用本分类的关键词进行搜索采集"
                : "该分类当前已暂停：cron 不再使用本分类的关键词采集新内容（历史内容仍可查看）"}
            </p>
          </div>

          {/* Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled((v) => !v)}
            className={clsx(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-100",
              enabled ? "bg-emerald-500" : "bg-slate-300"
            )}
          >
            <span
              className={clsx(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform",
                enabled ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>
      </section>

      {/* 监控平台 */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <SectionHeader
          icon={<span>📡</span>}
          title="监控平台"
          description="勾选需要采集内容的平台，至少选择 1 个"
        />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
          {PLATFORM_LIST.map((p) => {
            const checked = platforms.includes(p.id);
            return (
              <label
                key={p.id}
                className={clsx(
                  "flex items-center gap-3 rounded-lg border-2 p-3 cursor-pointer transition-all",
                  checked
                    ? "border-brand-500 bg-brand-50/40"
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => togglePlatform(p.id)}
                  className="sr-only"
                />
                <span
                  className="h-9 w-9 rounded-lg flex items-center justify-center text-lg shrink-0"
                  style={{
                    backgroundColor: checked ? p.brandColor : p.softBg,
                    color: checked ? "#fff" : p.brandColor,
                  }}
                >
                  {p.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-900">
                    {p.name}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {checked ? "已启用" : "未启用"}
                  </div>
                </div>
                <span
                  className={clsx(
                    "h-4 w-4 rounded-full border-2 flex items-center justify-center text-white text-[10px]",
                    checked
                      ? "border-brand-600 bg-brand-600"
                      : "border-slate-300"
                  )}
                >
                  {checked && "✓"}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {/* 关键词 */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <SectionHeader
          icon={<Hash className="h-4 w-4" />}
          title="对标关键词"
          description="系统会采集包含这些关键词的内容（不区分大小写）"
        />

        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={kwInput}
            onChange={(e) => setKwInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addKeyword()}
            placeholder="输入关键词后回车，例如：Claude Code"
            className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
          />
          <button
            onClick={addKeyword}
            disabled={!kwInput.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            添加
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 min-h-[40px]">
          {keywords.length === 0 ? (
            <div className="text-xs text-slate-400 py-2">暂无关键词</div>
          ) : (
            keywords.map((k) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
              >
                {k}
                <button
                  onClick={() => removeKeyword(k)}
                  className="text-slate-400 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>
      </section>

      {/* 删除监控（危险操作） */}
      <section className="rounded-xl border border-red-200 bg-red-50/30 p-6">
        <SectionHeader
          icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
          title="删除监控"
          description={`删除「${cat.name}」及其所有历史采集数据，此操作不可撤销`}
        />
        <div className="mt-4">
          {!showDelete ? (
            <button
              onClick={() => setShowDelete(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              删除该监控
            </button>
          ) : (
            <div className="rounded-lg bg-white border border-red-200 p-3.5 space-y-2.5">
              <div className="text-sm text-slate-700">
                确认删除 <strong className="text-red-600">{cat.name}</strong>？将一并清理该分类下的所有历史内容。
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:bg-red-300"
                >
                  {deleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  确认删除
                </button>
                <button
                  onClick={() => setShowDelete(false)}
                  disabled={deleting}
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
        {icon && <span className="text-brand-600">{icon}</span>}
        {title}
      </div>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}