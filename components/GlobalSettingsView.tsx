"use client";

import { useEffect, useState, useCallback } from "react";
import clsx from "clsx";
import {
  Plus,
  X,
  RefreshCw,
  Database,
  Hash,
  Users,
  Settings as SettingsIcon,
  Zap,
  RotateCcw,
  Check,
  Loader2,
} from "lucide-react";
import { SkillToggleRow } from "./SkillToggleRow";
import type { SkillDef } from "@/lib/skills/types";

interface SkillWithState extends SkillDef {
  enabled: boolean;
}

interface SettingsResp {
  auto_keywords: string[];
  follower_filter: { enabled: boolean; max: number };
  keyword_cap: number;
}

interface StatusResp {
  totalContents: number;
  bySource: Record<string, number>;
  runs: Array<{
    id: number;
    started_at_ms: number;
    finished_at_ms: number | null;
    status: string | null;
    items_inserted: number | null;
    error: string | null;
  }>;
  skillsEnabled: Record<string, boolean>;
  latestDate: Record<string, string | null>;
}

export function GlobalSettingsView() {
  const [skills, setSkills] = useState<SkillWithState[]>([]);
  const [settings, setSettings] = useState<SettingsResp | null>(null);
  const [status, setStatus] = useState<StatusResp | null>(null);
  const [kwInput, setKwInput] = useState("");
  const [ffMax, setFfMax] = useState(200000);
  const [ffEnabled, setFfEnabled] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const refresh = useCallback(async () => {
    const [s, st] = await Promise.all([
      fetch("/api/skills/list").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/cron/status").then((r) => r.json()).catch(() => null),
    ]);
    if (s.ok) setSkills(s.skills as SkillWithState[]);
    if (st.ok) {
      setSettings(st as SettingsResp);
      setFfEnabled(st.follower_filter.enabled);
      setFfMax(st.follower_filter.max);
    }
    const statusRes = await fetch("/api/cron/status").then((r) => r.json());
    if (statusRes.ok) setStatus(statusRes as StatusResp);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const showToast = (kind: "ok" | "err", msg: string) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2200);
  };

  const toggleSkill = async (skillId: string, enabled: boolean) => {
    setBusy(skillId);
    // 乐观更新：立刻改本地 skills + 顶部 status.skillsEnabled
    // 避免 Turso eventual consistency 导致用户看到「点了没反应」
    setSkills((prev) =>
      prev.map((s) => (s.id === skillId ? { ...s, enabled } : s))
    );
    setStatus((prev) =>
      prev
        ? {
            ...prev,
            skillsEnabled: { ...prev.skillsEnabled, [skillId]: enabled },
          }
        : prev
    );
    try {
      await fetch("/api/skills/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId, enabled }),
      });
      showToast("ok", `${skillId} 已${enabled ? "启用" : "禁用"}`);
      // 不立即 refresh status（Turso 写后读有 ~3-5s 滞后），依赖乐观更新即可
    } catch (e) {
      showToast("err", String(e));
      // 失败回滚
      setSkills((prev) =>
        prev.map((s) => (s.id === skillId ? { ...s, enabled: !enabled } : s))
      );
    } finally {
      setBusy(null);
    }
  };

  const addKeyword = async () => {
    const v = kwInput.trim();
    if (!v) return;
    if (!settings) return;
    if (settings.auto_keywords.includes(v)) {
      showToast("err", "关键词已存在");
      return;
    }
    if (settings.auto_keywords.length >= settings.keyword_cap) {
      showToast("err", `已达上限 ${settings.keyword_cap}`);
      return;
    }
    setBusy("add-kw");
    // 乐观更新：立刻在本地 settings 加上 v（用户立刻看到 chip 出现）
    const newKws = [...settings.auto_keywords, v];
    setSettings({ ...settings, auto_keywords: newKws });
    setKwInput("");
    try {
      const r = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto_keywords: newKws }),
      });
      const j = await r.json();
      if (!j.ok) {
        // 失败回滚
        setSettings({ ...settings, auto_keywords: settings.auto_keywords });
        setKwInput(v);
        showToast("err", j.error ?? "保存失败");
        return;
      }
      showToast("ok", `已添加「${v}」`);
    } catch (e) {
      setSettings({ ...settings, auto_keywords: settings.auto_keywords });
      setKwInput(v);
      showToast("err", String(e));
    } finally {
      setBusy(null);
    }
  };

  const removeKeyword = async (k: string) => {
    if (!settings) return;
    setBusy(`rm-kw:${k}`);
    // 乐观更新：立刻从本地 settings 移除 k（用户立刻看到 chip 消失）
    const newKws = settings.auto_keywords.filter((x) => x !== k);
    setSettings({ ...settings, auto_keywords: newKws });
    try {
      const r = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto_keywords: newKws }),
      });
      const j = await r.json();
      if (!j.ok) {
        // 失败回滚
        setSettings({ ...settings, auto_keywords: settings.auto_keywords });
        showToast("err", j.error ?? "删除失败");
        return;
      }
      showToast("ok", `已删除「${k}」`);
    } catch (e) {
      setSettings({ ...settings, auto_keywords: settings.auto_keywords });
      showToast("err", String(e));
    } finally {
      setBusy(null);
    }
  };

  const saveFollowerFilter = async () => {
    setBusy("save-ff");
    try {
      const r = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          follower_filter_enabled: ffEnabled,
          follower_filter_max: ffMax,
        }),
      });
      const j = await r.json();
      if (!j.ok) {
        showToast("err", j.error ?? "保存失败");
        return;
      }
      showToast("ok", "粉丝过滤规则已保存");
      // 不调 refresh — Turso eventual consistency 会拿到 stale 数据，且 follower_filter 没在 UI 中显示读取
    } finally {
      setBusy(null);
    }
  };

  const triggerSync = async (kind: "run" | "backfill") => {
    setBusy(kind);
    try {
      const url = kind === "run" ? "/api/cron/run" : "/api/cron/backfill?days=30";
      const r = await fetch(url, { method: "POST" });
      const j = await r.json();
      if (!j.ok) {
        showToast("err", j.error ?? "失败");
        return;
      }
      const msg =
        kind === "run"
          ? `完成：状态=${j.status} 新增=${j.totalInserted}`
          : `回填完成：${j.days} 天，新增 ${j.totalInserted} 条`;
      showToast("ok", msg);
      // cron 跑完后 status (runs, totalContents, bySource) 必须刷新；
      // 延迟 3s 等 Turso 写同步到读副本，避免拉回 stale 数据覆盖本地乐观 state
      await new Promise((res) => setTimeout(res, 3000));
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  if (!settings) {
    return (
      <div className="p-8 flex items-center gap-2 text-slate-500 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        加载设置…
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

      {/* 顶部说明 */}
      <header className="rounded-xl bg-gradient-to-r from-brand-50 to-emerald-50 border border-brand-100 p-5">
        <div className="flex items-center gap-2 text-brand-700 font-semibold text-base">
          <SettingsIcon className="h-4 w-4" />
          全局设置
        </div>
        <p className="mt-1 text-xs text-slate-600">
          控制系统所有 7 个 Redfox Skill 的启用状态、关键词自动采集列表、粉丝数过滤阈值。
          系统会在每天 <strong>09:00 (Asia/Shanghai)</strong> 自动运行一次。
        </p>
      </header>

      {/* 统计 */}
      {status && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="总内容数"
            value={status.totalContents}
            icon={<Database className="h-4 w-4" />}
          />
          <StatCard
            label="启用 Skill"
            value={Object.values(status.skillsEnabled).filter(Boolean).length + " / 7"}
            icon={<Zap className="h-4 w-4" />}
          />
          <StatCard
            label="最近同步"
            value={status.runs[0]?.status ?? "—"}
            icon={<RefreshCw className="h-4 w-4" />}
          />
          <StatCard
            label="上次新增"
            value={status.runs[0]?.items_inserted ?? 0}
            icon={<Check className="h-4 w-4" />}
          />
        </section>
      )}

      {/* 立即同步 / 回填 */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Zap className="h-4 w-4 text-amber-500" />
              同步操作
            </div>
            <p className="mt-1 text-xs text-slate-500">
              立即同步会跳过已采集日期去重；回填会按 leaderboards 跑过去 30 天
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => triggerSync("run")}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400"
            >
              {busy === "run" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              立即同步
            </button>
            <button
              onClick={() => triggerSync("backfill")}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {busy === "backfill" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              回填 30 天
            </button>
          </div>
        </div>
      </section>

      {/* 7 个 Skill 开关 */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <SectionHeader
          icon={<Zap className="h-4 w-4" />}
          title="Skill 开关"
          description="关闭后该 Skill 不会被 cron / 立即同步调用"
        />
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {skills.map((s) => (
            <SkillToggleRow
              key={s.id}
              skill={s}
              enabled={s.enabled}
              onToggle={(v) => toggleSkill(s.id, v)}
            />
          ))}
        </div>
      </section>

      {/* 关键词 */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <SectionHeader
          icon={<Hash className="h-4 w-4" />}
          title={`自动采集关键词 (${settings.auto_keywords.length}/${settings.keyword_cap})`}
          description="cron 跑 douyin-search 时会按这些关键词循环搜索并入库。关键词搜索不过滤 settings。"
        />
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={kwInput}
            onChange={(e) => setKwInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addKeyword()}
            disabled={settings.auto_keywords.length >= settings.keyword_cap}
            placeholder="输入关键词后回车"
            className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none disabled:bg-slate-50"
          />
          <button
            onClick={addKeyword}
            disabled={!kwInput.trim() || busy !== null}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            添加
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 min-h-[40px]">
          {settings.auto_keywords.length === 0 ? (
            <div className="text-xs text-slate-400 py-2">
              暂无关键词。添加后会按关键词自动搜索入库。
            </div>
          ) : (
            settings.auto_keywords.map((k) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
              >
                {k}
                <button
                  onClick={() => removeKeyword(k)}
                  className="text-slate-400 hover:text-red-500"
                  disabled={busy === `rm-kw:${k}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>
      </section>

      {/* 粉丝过滤 */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <SectionHeader
          icon={<Users className="h-4 w-4" />}
          title="粉丝数过滤"
          description="采集结果中作者粉丝数大于此阈值的会被丢弃（粉丝数=0/未知时放行）"
        />
        <div className="mt-4 grid grid-cols-1 md:grid-cols-[120px_1fr_auto] gap-3 items-end">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={ffEnabled}
              onChange={(e) => setFfEnabled(e.target.checked)}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            启用过滤
          </label>
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">
              上限（粉丝数）
            </label>
            <input
              type="number"
              value={ffMax}
              onChange={(e) => setFfMax(Math.max(0, Number(e.target.value) || 0))}
              min={0}
              step={10000}
              disabled={!ffEnabled}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none disabled:bg-slate-50"
            />
          </div>
          <button
            onClick={saveFollowerFilter}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400"
          >
            {busy === "save-ff" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            保存
          </button>
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
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <span className="text-brand-600">{icon}</span>
        {title}
      </div>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3.5">
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>{label}</span>
        <span className="text-slate-400">{icon}</span>
      </div>
      <div className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">
        {value}
      </div>
    </div>
  );
}