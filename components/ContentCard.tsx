import clsx from "clsx";
import { Heart, MessageCircle, Share2, Eye, Clock } from "lucide-react";
import type { ContentItem } from "@/lib/types";
import { PLATFORMS } from "@/lib/platforms";
import { formatNumber } from "@/lib/date";

export function ContentCard({ item }: { item: ContentItem }) {
  const platform = PLATFORMS[item.platform];

  return (
    <article className="group rounded-xl border border-slate-200 bg-white shadow-card hover:shadow-cardHover hover:border-slate-300 transition-all overflow-hidden">
      {/* 左侧品牌色条 */}
      <div
        className="h-1 w-full"
        style={{ backgroundColor: platform.brandColor }}
      />

      <div className="p-4">
        {/* 顶部：平台 + 作者 */}
        <div className="flex items-center gap-2.5">
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
            style={{ backgroundColor: `hsl(${item.avatarHue}, 65%, 55%)` }}
          >
            {item.author[0]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-700 truncate">
                {item.author}
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                style={{
                  backgroundColor: platform.softBg,
                  color: platform.brandColor,
                }}
              >
                {platform.icon} {platform.name}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 inline-flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3" />
              {item.publishTime}
            </div>
          </div>
        </div>

        {/* 标题 + 摘要 */}
        <h3 className="mt-3 text-sm font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-brand-700 transition-colors">
          {item.title}
        </h3>
        <p className="mt-1.5 text-[12.5px] text-slate-500 leading-relaxed line-clamp-2">
          {item.excerpt}
        </p>

        {/* 标签 */}
        <div className="mt-3 flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="text-[10.5px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded"
            >
              #{t}
            </span>
          ))}
        </div>

        {/* 互动数据 */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3.5 text-xs text-slate-500">
          <Metric icon={Heart} value={item.metrics.likes} color="#ef4444" />
          <Metric
            icon={MessageCircle}
            value={item.metrics.comments}
            color="#3b82f6"
          />
          {item.metrics.shares !== undefined && (
            <Metric
              icon={Share2}
              value={item.metrics.shares}
              color="#10b981"
            />
          )}
          {item.metrics.views !== undefined && (
            <Metric icon={Eye} value={item.metrics.views} color="#8b5cf6" />
          )}
        </div>
      </div>
    </article>
  );
}

function Metric({
  icon: Icon,
  value,
  color,
}: {
  icon: typeof Heart;
  value: number;
  color: string;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="h-3.5 w-3.5" style={{ color }} />
      <span className="tabular-nums">{formatNumber(value)}</span>
    </span>
  );
}