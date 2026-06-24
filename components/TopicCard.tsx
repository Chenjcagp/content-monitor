import { Flame, Sparkles, TrendingUp, Hash, FileText } from "lucide-react";
import type { Topic } from "@/lib/types";
import clsx from "clsx";

interface Props {
  topic: Topic;
  rank?: number;
  expanded?: boolean;
}

export function TopicCard({ topic, rank, expanded = false }: Props) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-card hover:shadow-cardHover transition-all">
      {/* 头部：排名 + 热度 */}
      <div className="flex items-start gap-3">
        {rank !== undefined && (
          <div
            className={clsx(
              "shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold",
              rank === 1
                ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                : rank === 2
                ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white"
                : rank === 3
                ? "bg-gradient-to-br from-orange-300 to-orange-400 text-white"
                : "bg-slate-100 text-slate-500"
            )}
          >
            {rank}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold text-slate-900 leading-snug">
            {topic.title}
          </h3>

          {/* meta 行 */}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <HeatDots heat={topic.heat} />
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              {topic.relatedContentCount} 篇相关
            </span>
            {topic.tags.slice(0, 3).map((t) => (
              <span key={t} className="inline-flex items-center gap-0.5 text-slate-400">
                <Hash className="h-3 w-3" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 三段式简介（始终展开，便于快速预览） */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field
          icon={<Sparkles className="h-3.5 w-3.5" />}
          label="为什么做"
          color="text-blue-600"
          value={topic.whyDoIt}
        />
        <Field
          icon={<Flame className="h-3.5 w-3.5" />}
          label="爆点"
          color="text-orange-600"
          value={topic.viralPoint}
        />
        <Field
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="增长空间"
          color="text-emerald-600"
          value={topic.growthSpace}
        />
      </div>
    </article>
  );
}

function Field({
  icon,
  label,
  color,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className={clsx("flex items-center gap-1 text-[11px] font-medium", color)}>
        {icon}
        {label}
      </div>
      <p className="mt-1.5 text-[12.5px] text-slate-600 leading-relaxed">
        {value}
      </p>
    </div>
  );
}

function HeatDots({ heat }: { heat: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`热度 ${heat}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={clsx(
            "h-1.5 w-1.5 rounded-full",
            i <= heat ? "bg-orange-500" : "bg-slate-200"
          )}
        />
      ))}
      <span className="ml-1 text-[10.5px] text-slate-400">热度</span>
    </span>
  );
}