import { getById } from "@/lib/repo/categories";
import { Calendar, Hash } from "lucide-react";
import { TODAY, formatYMD, getRelativeLabel, getWeekday } from "@/lib/date";

export async function CategoryHeader({ id }: { id: string }) {
  const category = await getById(id);
  if (!category) {
    return (
      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <div className="text-slate-500">未找到分类</div>
      </div>
    );
  }
  const next = `每天 09:00 自动运行`;

  return (
    <div className="border-b border-slate-200 bg-white px-8 py-5">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-slate-900 truncate">
            {category.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {category.description ?? "—"}
          </p>
        </div>

        {/* 状态指示 */}
        <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          运行中 · {next}
        </div>
      </div>

      {/* meta 行 */}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          下次运行：明天 09:00
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Hash className="h-3.5 w-3.5" />
          {category.keywords.length} 个关键词
        </span>
        <span className="inline-flex items-center gap-1.5">
          今日 {getRelativeLabel(TODAY)} · {getWeekday(TODAY)} · {formatYMD(TODAY)}
        </span>
      </div>
    </div>
  );
}
