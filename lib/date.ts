// 与日期相关的纯函数工具

export const TODAY = new Date("2026-06-23"); // 题目要求的"今天"固定日期，避免时钟影响演示

export function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseYMD(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function diffDays(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function getWeekday(d: Date): string {
  return WEEKDAYS[d.getDay()];
}

export function getRelativeLabel(d: Date, today: Date = TODAY): string {
  const diff = diffDays(today, d);
  if (diff === 0) return "今天";
  if (diff === 1) return "昨天";
  if (diff === 2) return "前天";
  if (diff > 0 && diff < 7) return `${diff}天前`;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function getShortDate(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// 在原型里，给定一个日期，返回往前 n 天的有序日期数组（最新在前）
export function recentDates(n: number, today: Date = TODAY): Date[] {
  const out: Date[] = [];
  for (let i = 0; i < n; i++) out.push(addDays(today, -i));
  return out;
}

export function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}