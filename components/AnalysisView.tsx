"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Calendar, ListChecks, CalendarRange, Sparkles, Flame, Clock, ExternalLink } from "lucide-react";
import { DateScroller } from "./DateScroller";
import { SegmentedControl } from "./SegmentedControl";
import { TopicCard } from "./TopicCard";
import { buildDateBuckets } from "@/lib/aggregate";
import { getCategoryReports, getCategoryTopics } from "@/lib/mockData";

type Mode = "timeline" | "topics";
type Range = "7d" | "14d" | "30d";

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: "7d", label: "最近 7 天" },
  { value: "14d", label: "最近 14 天" },
  { value: "30d", label: "最近 30 天" },
];

export function AnalysisView({ categoryId }: { categoryId: string }) {
  const [mode, setMode] = useState<Mode>("timeline");

  const buckets = useMemo(() => buildDateBuckets(categoryId, 7), [categoryId]);
  const reports = useMemo(() => getCategoryReports(categoryId), [categoryId]);
  const topics = useMemo(() => getCategoryTopics(categoryId), [categoryId]);

  const firstReadyBucket = buckets.find((b) => b.hasReport);
  const [selectedDate, setSelectedDate] = useState(
    firstReadyBucket?.date ?? buckets[0]?.date ?? ""
  );

  const [range, setRange] = useState<Range>("7d");

  const currentReport = reports.find((r) => r.date === selectedDate);

  return (
    <div className="p-6 space-y-5">
      {/* 顶部：视图切换 + 摘要 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <SegmentedControl
          value={mode}
          onChange={setMode}
          options={[
            {
              value: "timeline",
              label: "按时间线",
              icon: <Calendar className="h-3.5 w-3.5" />,
            },
            {
              value: "topics",
              label: "按选题汇总",
              icon: <ListChecks className="h-3.5 w-3.5" />,
            },
          ]}
        />

        <div className="text-xs text-slate-500">
          AI 模型：<span className="font-medium text-slate-700">GPT-4o</span>
          <span className="mx-2 text-slate-300">|</span>
          共生成 <strong className="tabular-nums">{reports.length}</strong> 份报告
          <span className="mx-2 text-slate-300">|</span>
          累计 <strong className="tabular-nums">{topics.length}</strong> 个选题
        </div>
      </div>

      {mode === "timeline" ? (
        <TimelineView
          buckets={buckets}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          report={currentReport}
        />
      ) : (
        <TopicsView range={range} setRange={setRange} topics={topics} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
function TimelineView({
  buckets,
  selectedDate,
  onSelectDate,
  report,
}: {
  buckets: ReturnType<typeof buildDateBuckets>;
  selectedDate: string;
  onSelectDate: (d: string) => void;
  report: ReturnType<typeof getCategoryReports>[number] | undefined;
}) {
  return (
    <>
      {/* 日期选择 */}
      <section>
        <SectionTitle>选择日期查看报告</SectionTitle>
        <DateScroller
          buckets={buckets}
          selected={selectedDate}
          onChange={onSelectDate}
          showReportStatus
        />
      </section>

      {/* 报告内容 */}
      {report ? (
        <ReportCard report={report} />
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
          <Sparkles className="h-8 w-8 mx-auto text-slate-300 mb-2" />
          <div className="text-sm text-slate-600">该日期暂无报告</div>
          <div className="text-xs text-slate-400 mt-1">
            今日报告预计 09:30 生成完成
          </div>
        </div>
      )}
    </>
  );
}

function ReportCard({
  report,
}: {
  report: NonNullable<ReturnType<typeof getCategoryReports>>[number];
}) {
  const dateObj = new Date(report.date);
  const dateLabel = `${dateObj.getFullYear()}年${
    dateObj.getMonth() + 1
  }月${dateObj.getDate()}日`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-card overflow-hidden">
      {/* 报告头部 */}
      <div className="px-6 py-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Sparkles className="h-3.5 w-3.5" />
              AI 智能生成
              <span className="text-slate-500">·</span>
              <Clock className="h-3.5 w-3.5" />
              生成于 {report.generatedAt}
            </div>
            <h2 className="mt-1 text-lg font-semibold">
              {dateLabel} 选题报告
            </h2>
          </div>
          <button className="text-xs text-slate-300 hover:text-white inline-flex items-center gap-1 transition-colors">
            导出 PDF
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>

        {/* 一句话洞察 */}
        <div className="mt-3 rounded-lg bg-white/10 px-3.5 py-2.5 text-sm text-slate-100">
          💡 {report.oneLiner}
        </div>
      </div>

      {/* 主体：左选题 / 右热点 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
        {/* 选题建议 */}
        <div className="lg:col-span-2 p-6">
          <SectionTitle icon={<Sparkles className="h-3.5 w-3.5" />}>
            今日选题建议 · TOP {report.topics.length}
          </SectionTitle>
          <div className="space-y-3 mt-3">
            {report.topics.map((t, i) => (
              <TopicCard key={t.id} topic={t} rank={i + 1} />
            ))}
          </div>
        </div>

        {/* 热点回顾 */}
        <div className="p-6 bg-slate-50/50">
          <SectionTitle icon={<Flame className="h-3.5 w-3.5 text-orange-500" />}>
            昨日热点回顾
          </SectionTitle>
          <ul className="mt-3 space-y-3">
            {report.hotRecap.map((h, i) => (
              <li
                key={i}
                className="rounded-lg bg-white border border-slate-200 p-3 text-[13px] text-slate-700 leading-relaxed"
              >
                <span className="inline-block w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-[11px] font-semibold text-center leading-5 mr-2 shrink-0">
                  {i + 1}
                </span>
                {h}
              </li>
            ))}
          </ul>

          {/* 数据摘要卡片 */}
          <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              数据摘要
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-center">
              <Stat label="采集内容" value={String(report.topics.reduce((s, t) => s + t.relatedContentCount, 0) * 8)} />
              <Stat label="覆盖平台" value="6" />
              <Stat label="生成选题" value={String(report.topics.length)} />
              <Stat label="平均热度" value={(report.topics.reduce((s, t) => s + t.heat, 0) / Math.max(1, report.topics.length)).toFixed(1)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-semibold text-slate-900 tabular-nums">
        {value}
      </div>
      <div className="text-[10.5px] text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
function TopicsView({
  range,
  setRange,
  topics,
}: {
  range: Range;
  setRange: (r: Range) => void;
  topics: ReturnType<typeof getCategoryTopics>;
}) {
  // 按热度排序汇总
  const sorted = [...topics].sort((a, b) => b.heat - a.heat);

  return (
    <>
      {/* 时间范围 */}
      <section className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs text-slate-500">汇总范围：</span>
          <SegmentedControl
            value={range}
            onChange={setRange}
            options={RANGE_OPTIONS}
          />
        </div>
        <div className="text-xs text-slate-500">
          共 <strong className="text-slate-900 tabular-nums">{sorted.length}</strong> 个选题
        </div>
      </section>

      {/* 选题列表 */}
      <div className="space-y-3">
        {sorted.map((t, i) => (
          <TopicCard key={t.id} topic={t} rank={i + 1} />
        ))}
      </div>
    </>
  );
}

function SectionTitle({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
      {icon}
      {children}
    </div>
  );
}