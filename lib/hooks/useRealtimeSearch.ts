// useRealtimeSearch: 实时搜索（不入库，只展示）

"use client";

import { useEffect, useState } from "react";

export interface RealtimeArticle {
  opusId?: string;
  awemeId?: string;
  description: string;
  nickname: string;
  likeNum: number;
  commentNum: number;
  shareNum: number;
  collectNum: number;
  forwardNum?: number;
  playNum?: number;
  url: string;
  publishTime: string;
  fansNum: number;
  topics?: string;
}

export function useRealtimeSearch(
  keyword: string,
  enabled = true,
  sortType: "1" | "2" | "3" = "1",
  publishTime: "0" | "7" | "30" | "90" = "7"
) {
  const [articles, setArticles] = useState<RealtimeArticle[]>([]);
  const [hotTopics, setHotTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !keyword.trim()) {
      setArticles([]);
      setHotTopics([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({
      keyword,
      sortType,
      publishTime,
    });
    fetch(`/api/search/realtime?${qs.toString()}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (!j.ok) throw new Error(j.error ?? "search failed");
        setArticles((j.list ?? []) as RealtimeArticle[]);
        const topics = Array.isArray(j.hotTopics)
          ? (j.hotTopics as Array<string | { name: string }>).map((t) =>
              typeof t === "string" ? t : t.name
            )
          : [];
        setHotTopics(topics);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setArticles([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [keyword, enabled, sortType, publishTime]);

  return { articles, hotTopics, loading, error };
}

/** 拓词：单独调用 /api/search/expand，返回去重后的主题词数组 */
export function useExpansion(keyword: string, enabled = true) {
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !keyword.trim()) {
      setTopics([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/search/expand?keyword=${encodeURIComponent(keyword)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        setTopics((j.topics ?? []) as string[]);
      })
      .catch(() => {
        if (!cancelled) setTopics([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [keyword, enabled]);

  return { topics, loading };
}