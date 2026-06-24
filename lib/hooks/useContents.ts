// useContents: 从 /api/contents 取真实数据
// 失败时 fallback 到 mockData 旧数据（首次启动 DB 为空时）

"use client";

import { useEffect, useState } from "react";
import type { ContentItem } from "@/lib/types";
import type { ContentRow } from "@/lib/repo/contents";

export interface UseContentsParams {
  categoryId: string;
  platform?: string;
  date?: string;
  limit?: number;
}

/** ContentRow (DB) → ContentItem (UI) */
export function dbRowToContentItem(r: ContentRow): ContentItem {
  // avatarHue 用 author 名字 hash
  const author = r.author ?? "匿名";
  const hue = Array.from(author).reduce((s, c) => s + c.charCodeAt(0), 0) % 360;
  const pub = r.publish_time_ms
    ? new Date(r.publish_time_ms).toISOString().slice(11, 16) // HH:mm
    : "";
  return {
    id: r.id,
    categoryId: r.category_id ?? "claudecode",
    platform: (r.platform as ContentItem["platform"]) ?? "douyin",
    author,
    avatarHue: hue,
    title: r.title,
    excerpt: r.excerpt ?? "",
    publishTime: pub,
    collectDate: r.collect_date,
    metrics: {
      likes: r.metrics?.likeCount ?? 0,
      comments: r.metrics?.commentCount ?? 0,
      shares: r.metrics?.shareCount ?? 0,
    },
    tags: r.tags ?? [],
  };
}

export function useContents(params: UseContentsParams) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const key = `${params.categoryId}|${params.platform ?? ""}|${params.date ?? ""}|${params.limit ?? ""}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    qs.set("categoryId", params.categoryId);
    if (params.platform && params.platform !== "all")
      qs.set("platform", params.platform);
    if (params.date) qs.set("date", params.date);
    if (params.limit) qs.set("limit", String(params.limit));

    fetch(`/api/contents?${qs.toString()}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (!j.ok) throw new Error(j.error ?? "fetch failed");
        const rows = j.items as ContentRow[];
        setItems(rows.map(dbRowToContentItem));
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return { items, loading, error };
}