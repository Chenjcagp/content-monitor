"use client";

import { useEffect, useState, useCallback } from "react";
import clsx from "clsx";
import {
  Plus,
  Trash2,
  Loader2,
  Radar,
  Users,
  X,
  Check,
  Search,
} from "lucide-react";
import { MonitorSparkline } from "./MonitorSparkline";

interface Account {
  id: string;
  douyin_id: string;
  display_name: string | null;
  account_type: "compete" | "similar" | "follow";
  category_id: string | null;
  follower_count: number | null;
  total_favorited: number | null;
  aweme_count: number | null;
  redfox_index: number | null;
  auto_sync: 0 | 1;
  track_growth: 0 | 1;
  notes: string | null;
  added_at_ms: number;
  last_fetched_at_ms: number | null;
}

interface Snapshot {
  account_id: string;
  snapshot_date: string;
  follower_count: number | null;
  total_favorited: number | null;
  aweme_count: number | null;
  redfox_index: number | null;
}

const TYPE_LABELS: Record<Account["account_type"], string> = {
  compete: "竞对",
  similar: "同类",
  follow: "关注",
};
const TYPE_COLORS: Record<Account["account_type"], string> = {
  compete: "bg-rose-50 text-rose-700 border-rose-200",
  similar: "bg-emerald-50 text-emerald-700 border-emerald-200",
  follow: "bg-sky-50 text-sky-700 border-sky-200",
};

export function MonitorView() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, Snapshot[]>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Account["account_type"]>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/accounts");
      const j = await res.json();
      if (!j.ok) return;
      setAccounts(j.accounts as Account[]);
      // 并行拉每个账号的快照
      const snapMap: Record<string, Snapshot[]> = {};
      await Promise.all(
        (j.accounts as Account[]).map(async (a) => {
          const r = await fetch(`/api/accounts/${a.id}/snapshots?days=30`);
          const sj = await r.json();
          if (sj.ok) snapMap[a.id] = sj.snapshots as Snapshot[];
        })
      );
      setSnapshots(snapMap);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const showToast = (kind: "ok" | "err", msg: string) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2200);
  };

  const filtered = accounts.filter((a) => filter === "all" || a.account_type === filter);
  const counts = {
    all: accounts.length,
    compete: accounts.filter((a) => a.account_type === "compete").length,
    similar: accounts.filter((a) => a.account_type === "similar").length,
    follow: accounts.filter((a) => a.account_type === "follow").length,
  };

  return (
    <div className="p-6 space-y-5 max-w-6xl">
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

      {/* 顶部 */}
      <header className="rounded-xl bg-gradient-to-r from-sky-50 to-brand-50 border border-sky-100 p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sky-700 font-semibold text-base">
              <Radar className="h-4 w-4" />
              对标监控
            </div>
            <p className="mt-1 text-xs text-slate-600">
              追踪指定抖音账号的基础信息 + 成长曲线（粉丝、获赞、作品数）
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            添加账号
          </button>
        </div>
      </header>

      {/* 类型过滤 */}
      <div className="flex items-center gap-2">
        {(["all", "compete", "similar", "follow"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={clsx(
              "px-3 py-1.5 rounded-full text-xs font-medium transition",
              filter === t
                ? "bg-brand-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            {t === "all" ? "全部" : TYPE_LABELS[t]} ({counts[t]})
          </button>
        ))}
      </div>

      {/* 账号卡片 */}
      {loading ? (
        <div className="p-12 flex items-center justify-center text-slate-500 text-sm">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          加载账号…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState onAdd={() => setShowAdd(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((a) => (
            <AccountCard
              key={a.id}
              account={a}
              snapshots={snapshots[a.id] ?? []}
              onDelete={async () => {
                if (!confirm(`确认删除「${a.display_name ?? a.douyin_id}」？`)) return;
                const r = await fetch(`/api/accounts/${a.id}`, { method: "DELETE" });
                const j = await r.json();
                if (j.ok) {
                  showToast("ok", "已删除");
                  refresh();
                } else {
                  showToast("err", j.error ?? "失败");
                }
              }}
              onToggleAutoSync={async () => {
                const r = await fetch(`/api/accounts/${a.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ auto_sync: a.auto_sync === 1 ? 0 : 1 }),
                });
                if (r.ok) refresh();
              }}
              onToggleGrowth={async () => {
                const r = await fetch(`/api/accounts/${a.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ track_growth: a.track_growth === 1 ? 0 : 1 }),
                });
                if (r.ok) refresh();
              }}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddAccountDialog
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false);
            refresh();
            showToast("ok", "已添加，正在异步回填账号信息…");
          }}
          onError={(msg) => showToast("err", msg)}
        />
      )}
    </div>
  );
}

function AccountCard({
  account,
  snapshots,
  onDelete,
  onToggleAutoSync,
  onToggleGrowth,
}: {
  account: Account;
  snapshots: Snapshot[];
  onDelete: () => void;
  onToggleAutoSync: () => void;
  onToggleGrowth: () => void;
}) {
  const followerPoints = snapshots
    .slice()
    .reverse()
    .map((s) => ({ date: s.snapshot_date, value: s.follower_count }));
  const favoritedPoints = snapshots
    .slice()
    .reverse()
    .map((s) => ({ date: s.snapshot_date, value: s.total_favorited }));

  return (
    <article className="rounded-xl border border-slate-200 bg-white shadow-card hover:shadow-cardHover transition-all overflow-hidden">
      <div className="h-1 w-full bg-sky-500" />
      <div className="p-4">
        {/* 顶部：账号名 + 类型 */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-slate-900 truncate">
              {account.display_name ?? `ID: ${account.douyin_id}`}
            </h3>
            <div className="mt-0.5 text-[11px] text-slate-400 font-mono">
              {account.douyin_id}
            </div>
          </div>
          <span
            className={clsx(
              "text-[10.5px] px-1.5 py-0.5 rounded border font-medium shrink-0",
              TYPE_COLORS[account.account_type]
            )}
          >
            {TYPE_LABELS[account.account_type]}
          </span>
        </div>

        {/* 关键数据 */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Metric
            value={account.follower_count ?? 0}
            label="粉丝"
            color="text-slate-900"
          />
          <Metric
            value={account.total_favorited ?? 0}
            label="总获赞"
            color="text-slate-900"
          />
          <Metric
            value={account.aweme_count ?? 0}
            label="作品"
            color="text-slate-900"
          />
        </div>

        {/* Sparkline */}
        <div className="mt-3 space-y-2.5">
          <MonitorSparkline points={followerPoints} label="粉丝走势" color="#10b981" />
          <MonitorSparkline points={favoritedPoints} label="获赞走势" color="#f59e0b" />
        </div>

        {/* 开关 + 操作 */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <ToggleChip
              checked={account.auto_sync === 1}
              onChange={onToggleAutoSync}
              label="自动同步"
            />
            <ToggleChip
              checked={account.track_growth === 1}
              onChange={onToggleGrowth}
              label="追踪成长"
            />
          </div>
          <button
            onClick={onDelete}
            className="text-slate-400 hover:text-red-500 transition-colors"
            aria-label="删除"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

function Metric({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="rounded-md bg-slate-50 py-1.5">
      <div className={clsx("text-sm font-semibold tabular-nums", color)}>
        {value.toLocaleString()}
      </div>
      <div className="text-[10px] text-slate-400">{label}</div>
    </div>
  );
}

function ToggleChip({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onChange}
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] border transition",
        checked
          ? "bg-brand-50 border-brand-200 text-brand-700"
          : "bg-slate-50 border-slate-200 text-slate-500"
      )}
    >
      <span
        className={clsx(
          "h-1.5 w-1.5 rounded-full",
          checked ? "bg-brand-500" : "bg-slate-300"
        )}
      />
      {label}
    </button>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/40 py-16 flex flex-col items-center text-slate-500">
      <Users className="h-10 w-10 mb-3 text-slate-300" />
      <div className="text-sm">暂无对标账号</div>
      <div className="text-xs mt-1 mb-4">添加抖音账号后自动拉取基础信息和成长曲线</div>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700"
      >
        <Plus className="h-3.5 w-3.5" />
        添加第一个账号
      </button>
    </div>
  );
}

function AddAccountDialog({
  onClose,
  onAdded,
  onError,
}: {
  onClose: () => void;
  onAdded: () => void;
  onError: (msg: string) => void;
}) {
  const [douyinId, setDouyinId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [accountType, setAccountType] = useState<Account["account_type"]>("compete");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!douyinId.trim()) {
      onError("请输入抖音号");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          douyin_id: douyinId.trim(),
          display_name: displayName.trim() || undefined,
          account_type: accountType,
          notes: notes.trim() || undefined,
        }),
      });
      const j = await r.json();
      if (j.ok) {
        onAdded();
      } else {
        onError(j.error ?? "添加失败");
      }
    } catch (e) {
      onError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Search className="h-4 w-4" />
            添加对标账号
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">抖音号 / AccountId *</label>
            <input
              type="text"
              value={douyinId}
              onChange={(e) => setDouyinId(e.target.value)}
              placeholder="如 70563022822"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">昵称（可选）</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="如 周小闹"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">类型</label>
            <div className="flex gap-2">
              {(["compete", "similar", "follow"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setAccountType(t)}
                  className={clsx(
                    "flex-1 rounded-md px-3 py-2 text-sm border transition",
                    accountType === t
                      ? "bg-brand-50 border-brand-300 text-brand-700"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">备注（可选）</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="如：搞笑赛道头部"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50/40">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            取消
          </button>
          <button
            onClick={submit}
            disabled={submitting || !douyinId.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            添加
          </button>
        </div>
      </div>
    </div>
  );
}