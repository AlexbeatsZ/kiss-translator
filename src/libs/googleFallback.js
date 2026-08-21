import { DEFAULT_API_LIST, OPT_TRANS_GOOGLE_2 } from "../config";

const GOOGLE_RATE_LIMIT_COOLDOWN_MS = 10 * 60 * 1000;
let googleRateLimitedUntil = 0;

/**
 * Google 的旧 gtx 网页接口会用 429 或 /sorry 页面表示出口限流。
 * 这里只识别明确的限流信号，避免把普通断网静默改道。
 */
export const isGoogleRateLimitError = (error) => {
  const message = error?.message || String(error || "");
  let details = null;
  try {
    details = JSON.parse(message);
  } catch {
    // 非 JSON 错误仍会由下方的稳定文本标记判断。
  }

  return (
    error?.status === 429 ||
    details?.status === 429 ||
    /google\.com\/sorry|unusual traffic|google translation rate limit/i.test(
      message
    )
  );
};

export const markGoogleRateLimited = () => {
  googleRateLimitedUntil = Date.now() + GOOGLE_RATE_LIMIT_COOLDOWN_MS;
};

export const isGoogleRateLimited = () => Date.now() < googleRateLimitedUntil;

export const clearGoogleRateLimitCooldown = () => {
  googleRateLimitedUntil = 0;
};

/**
 * 构造与内置 Google2 配置一致的批量网页翻译请求。
 * 原 Google 配置的并发和超时参数会保留，避免回退后改变调度节奏。
 */
export const getGoogle2FallbackSetting = (originalSetting = {}) => {
  const fallback = DEFAULT_API_LIST.find(
    (api) => api.apiType === OPT_TRANS_GOOGLE_2
  );
  return {
    ...fallback,
    fetchInterval: originalSetting.fetchInterval ?? fallback.fetchInterval,
    fetchLimit: originalSetting.fetchLimit ?? fallback.fetchLimit,
    httpTimeout: originalSetting.httpTimeout ?? fallback.httpTimeout,
  };
};

export const buildGoogle2Request = ({ texts, from, to, apiSetting }) => ({
  input: apiSetting.url,
  init: {
    method: "POST",
    headers: {
      "Content-Type": "application/json+protobuf",
      "X-Goog-API-Key": apiSetting.key,
    },
    body: JSON.stringify([[texts, from, to], "wt_lib"]),
  },
});
