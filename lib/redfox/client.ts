// Redfox 平台 HTTP 客户端
// - 统一鉴权 (X-API-KEY)
// - 15s 超时
// - 3108 限频：sleep 5s 后重试 1 次
// - 网络错误：指数退避重试 2 次

const DEFAULT_BASE_URL = "https://redfox.hk";

export class RedfoxError extends Error {
  constructor(
    public code: number | string,
    public detail: unknown,
    message?: string
  ) {
    super(message ?? `Redfox API error code=${code}`);
    this.name = "RedfoxError";
  }
}

function getApiKey(): string {
  const k = process.env.REDFOX_API_KEY;
  if (!k) {
    throw new RedfoxError(
      "NO_KEY",
      null,
      "REDFOX_API_KEY not set in .env.local"
    );
  }
  return k;
}

function getBaseUrl(): string {
  return process.env.REDFOX_BASE_URL || DEFAULT_BASE_URL;
}

interface RedfoxRawResp<T = unknown> {
  code: number;
  msg?: string;
  data?: T;
}

export interface RedfoxFetchOptions {
  /** 请求体 */
  body: Record<string, unknown>;
  /** 信号 */
  signal?: AbortSignal;
}

export async function redfoxFetch<T = unknown>(
  path: string,
  options: RedfoxFetchOptions
): Promise<T> {
  const url = getBaseUrl() + path;
  const apiKey = getApiKey();

  const maxAttempts = 3;
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 15_000);
      // 合并外部 signal
      if (options.signal) {
        options.signal.addEventListener("abort", () => ctrl.abort());
      }
      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": apiKey,
            "User-Agent": "content-monitor/1.0",
          },
          body: JSON.stringify(options.body),
          signal: ctrl.signal,
        });

        // HTTP 层错误
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          // 触发 sleep-and-retry
          if (resp.status === 429 && attempt < maxAttempts) {
            await sleep(5_000);
            continue;
          }
          throw new RedfoxError(
            resp.status,
            text.slice(0, 500),
            `HTTP ${resp.status}: ${text.slice(0, 200)}`
          );
        }

        const json = (await resp.json()) as RedfoxRawResp<T>;

        // 限频（应用层）
        if (json.code === 3108 && attempt < maxAttempts) {
          await sleep(5_000);
          continue;
        }
        // 鉴权失败不重试
        if (json.code === 3106 || json.code === 3107) {
          throw new RedfoxError(
            json.code,
            json,
            `Redfox auth failed: ${json.msg ?? json.code}`
          );
        }
        if (json.code !== 2000 && json.code !== 200) {
          throw new RedfoxError(json.code, json, json.msg ?? `code=${json.code}`);
        }
        return json.data as T;
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      lastErr = err;
      // 业务错误直接抛出，不重试
      if (err instanceof RedfoxError && err.code !== 429) {
        const isAppError = typeof err.code === "number" && err.code >= 2000;
        if (isAppError) throw err;
      }
      // 网络错误：指数退避
      if (attempt < maxAttempts) {
        await sleep(500 * Math.pow(2, attempt - 1));
        continue;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("redfoxFetch failed");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
