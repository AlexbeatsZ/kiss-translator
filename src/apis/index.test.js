jest.mock("query-string", () => ({
  stringify: (obj) => new URLSearchParams(obj).toString(),
}));

jest.mock("../libs/fetch", () => ({
  fetchData: jest.fn(),
  fnPolyfill: jest.fn(),
}));

jest.mock("../libs/browser", () => ({
  isBuiltinAIAvailable: true,
}));

jest.mock("../libs/cache", () => ({
  getHttpCachePolyfill: jest.fn(),
  putHttpCachePolyfill: jest.fn(),
}));

jest.mock("../libs/batchQueue", () => ({
  getBatchQueue: jest.fn(),
}));

jest.mock("../libs/pool", () => ({
  getFetchPool: jest.fn(() => ({
    push: (fn, args) => fn(args),
  })),
}));

jest.mock("../libs/request", () => ({
  normalizeHttpTimeout: (timeout) => {
    const normalizedTimeout = timeout || 30;
    return normalizedTimeout > 600
      ? normalizedTimeout
      : normalizedTimeout * 1000;
  },
}));

const mockSha256 = jest.fn();
const mockGetCacheDigest = jest.fn();

jest.mock("../libs/utils", () => ({
  sha256: (...args) => mockSha256(...args),
  withTimeout: jest.fn((promise) => promise),
}));

jest.mock("../libs/cacheDigest", () => ({
  getCacheDigest: (...args) => mockGetCacheDigest(...args),
}));

jest.mock("./trans", () => ({
  handleTranslate: jest.fn(),
  handleSubtitle: jest.fn(),
  handleSummarize: jest.fn(),
  handleMicrosoftLangdetect: jest.fn(),
}));

import { apiGoogleLangdetect, apiTranslate } from "./index";
import { handleTranslate } from "./trans";
import { fetchData, fnPolyfill } from "../libs/fetch";
import { withTimeout } from "../libs/utils";
import { getBatchQueue } from "../libs/batchQueue";
import { getFetchPool } from "../libs/pool";
import { getHttpCachePolyfill, putHttpCachePolyfill } from "../libs/cache";
import { clearGoogleRateLimitCooldown } from "../libs/googleFallback";
import {
  DEFAULT_API_LIST,
  OPT_TRANS_BUILTINAI,
  OPT_TRANS_OPENAI,
} from "../config";

const getOpenAiApiSetting = (systemPrompt) => ({
  ...DEFAULT_API_LIST.find((api) => api.apiType === OPT_TRANS_OPENAI),
  apiSlug: "openai_test",
  key: "test-key",
  model: "test-model",
  useBatchFetch: true,
  useStream: false,
  systemPrompt,
});

const getBuiltinAiApiSetting = (httpTimeout) => ({
  ...DEFAULT_API_LIST.find((api) => api.apiType === OPT_TRANS_BUILTINAI),
  apiSlug: `builtinai_${httpTimeout}`,
  fetchInterval: 100,
  fetchLimit: 1,
  httpTimeout,
});

describe("apiTranslate BuiltinAI timeout", () => {
  beforeEach(() => {
    mockGetCacheDigest.mockResolvedValue("a".repeat(64));
    getFetchPool.mockReturnValue({
      push: (fn, args) => fn(args),
    });
    withTimeout.mockImplementation((promise) => promise);
  });

  afterEach(() => {
    clearGoogleRateLimitCooldown();
    jest.clearAllMocks();
  });

  test("converts second-based timeout before calling withTimeout", async () => {
    fnPolyfill.mockResolvedValueOnce(["translated text", "en", ""]);

    await apiTranslate({
      text: "hello",
      fromLang: "en",
      toLang: "zh-CN",
      apiSetting: getBuiltinAiApiSetting(30),
      useCache: false,
    });

    expect(withTimeout.mock.calls[0][1]).toBe(30000);
  });

  test("keeps legacy millisecond timeout before calling withTimeout", async () => {
    fnPolyfill.mockResolvedValueOnce(["translated text", "en", ""]);

    await apiTranslate({
      text: "hello",
      fromLang: "en",
      toLang: "zh-CN",
      apiSetting: getBuiltinAiApiSetting(30000),
      useCache: false,
    });

    expect(withTimeout.mock.calls[0][1]).toBe(30000);
  });

  test("includes BuiltinAI error reason in thrown message", async () => {
    fnPolyfill.mockResolvedValueOnce([
      "",
      "auto",
      "Automatic detection of source language failed: low confidence",
    ]);

    await expect(
      apiTranslate({
        text: "hello",
        fromLang: "auto",
        toLang: "zh-CN",
        apiSetting: getBuiltinAiApiSetting(30),
        useCache: false,
      })
    ).rejects.toThrow(
      "apiBuiltinAITranslate got error: Automatic detection of source language failed: low confidence"
    );
  });

  test("treats BuiltinAI same-language results as a skipped translation", async () => {
    fnPolyfill.mockResolvedValueOnce(["", "zh-Hans", "Same lang"]);

    await expect(
      apiTranslate({
        text: "已经是中文",
        fromLang: "auto",
        toLang: "zh-CN",
        apiSetting: getBuiltinAiApiSetting(30),
        useCache: false,
      })
    ).resolves.toMatchObject({
      trText: "已经是中文",
      srLang: "zh-Hans",
      isSame: true,
    });
  });
});

describe("Google language detection fallback", () => {
  beforeEach(() => {
    mockGetCacheDigest.mockResolvedValue("a".repeat(64));
  });

  afterEach(() => {
    clearGoogleRateLimitCooldown();
    jest.clearAllMocks();
  });

  test("uses Google2 when the legacy Google endpoint is rate limited", async () => {
    fetchData
      .mockRejectedValueOnce(
        new Error(
          JSON.stringify({
            url: "https://www.google.com/sorry/index",
            status: 429,
            response: "unusual traffic",
          })
        )
      )
      .mockResolvedValueOnce([["健康检查"], ["en"]])
      .mockResolvedValueOnce([["第二次检查"], ["en"]]);

    await expect(apiGoogleLangdetect("health check")).resolves.toBe("en");
    await expect(apiGoogleLangdetect("second check")).resolves.toBe("en");

    expect(fetchData).toHaveBeenCalledTimes(3);
    expect(fetchData.mock.calls[1][0]).toBe(
      "https://translate-pa.googleapis.com/v1/translateHtml"
    );
    expect(fetchData.mock.calls[2][0]).toBe(
      "https://translate-pa.googleapis.com/v1/translateHtml"
    );
    expect(JSON.parse(fetchData.mock.calls[1][1].body)).toEqual([
      [["health check"], "auto", "zh-CN"],
      "wt_lib",
    ]);
  });

  test("uses Google2 when language detection returns a verification page", async () => {
    fetchData
      .mockResolvedValueOnce(
        '<html><a href="https://www.google.com/sorry/index">unusual traffic</a></html>'
      )
      .mockResolvedValueOnce([["健康检查"], ["en"]]);

    await expect(apiGoogleLangdetect("health check")).resolves.toBe("en");

    expect(fetchData).toHaveBeenCalledTimes(2);
    expect(fetchData.mock.calls[1][0]).toBe(
      "https://translate-pa.googleapis.com/v1/translateHtml"
    );
  });
});

describe("apiTranslate prompt queue isolation", () => {
  beforeEach(() => {
    mockGetCacheDigest.mockImplementation(async (text) =>
      text.includes("batch prompt B") ? "b".repeat(64) : "a".repeat(64)
    );
    getBatchQueue.mockImplementation(() => ({
      addTask: jest.fn().mockResolvedValue(["translated text", ""]),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("uses prompt signature in batch queue key", async () => {
    await apiTranslate({
      text: "hello",
      fromLang: "en",
      toLang: "zh-CN",
      apiSetting: getOpenAiApiSetting("batch prompt A"),
      useCache: false,
    });
    await apiTranslate({
      text: "world",
      fromLang: "en",
      toLang: "zh-CN",
      apiSetting: getOpenAiApiSetting("batch prompt B"),
      useCache: false,
    });

    const queueKeys = getBatchQueue.mock.calls.map(([key]) => key);

    expect(queueKeys).toHaveLength(2);
    expect(queueKeys[0]).toContain("_aaaaaaaaaaaaaaaa");
    expect(queueKeys[1]).toContain("_bbbbbbbbbbbbbbbb");
    expect(queueKeys[0]).not.toBe(queueKeys[1]);
  });

  test("does not include subtitle prompt in batch queue key", async () => {
    await apiTranslate({
      text: "hello",
      fromLang: "en",
      toLang: "zh-CN",
      apiSetting: {
        ...getOpenAiApiSetting("batch prompt A"),
        subtitlePrompt: "subtitle prompt A",
      },
      useCache: false,
    });
    await apiTranslate({
      text: "world",
      fromLang: "en",
      toLang: "zh-CN",
      apiSetting: {
        ...getOpenAiApiSetting("batch prompt A"),
        subtitlePrompt: "subtitle prompt B",
      },
      useCache: false,
    });

    const queueKeys = getBatchQueue.mock.calls.map(([key]) => key);
    const signedTexts = mockGetCacheDigest.mock.calls.map(([text]) => text);

    expect(queueKeys).toHaveLength(2);
    expect(queueKeys[0]).toBe(queueKeys[1]);
    expect(signedTexts[0]).not.toContain("subtitle prompt A");
    expect(signedTexts[1]).not.toContain("subtitle prompt B");
  });

  test("does not include prompt slug in batch queue key", async () => {
    await apiTranslate({
      text: "hello",
      fromLang: "en",
      toLang: "zh-CN",
      apiSetting: {
        ...getOpenAiApiSetting("batch prompt A"),
        batchPromptSlug: "prompt_a",
      },
      useCache: false,
    });
    await apiTranslate({
      text: "world",
      fromLang: "en",
      toLang: "zh-CN",
      apiSetting: {
        ...getOpenAiApiSetting("batch prompt A"),
        batchPromptSlug: "prompt_b",
      },
      useCache: false,
    });

    const queueKeys = getBatchQueue.mock.calls.map(([key]) => key);
    const signedTexts = mockGetCacheDigest.mock.calls.map(([text]) => text);

    expect(queueKeys).toHaveLength(2);
    expect(queueKeys[0]).toBe(queueKeys[1]);
    expect(signedTexts[0]).not.toContain("prompt_a");
    expect(signedTexts[1]).not.toContain("prompt_b");
  });
});

describe("apiTranslate non-batch stream", () => {
  beforeEach(() => {
    mockGetCacheDigest.mockResolvedValue("a".repeat(64));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("consumes non-batch stream results without the batch queue", async () => {
    const onStreamChunk = jest.fn();
    async function* streamResult() {
      yield { id: 0, partialText: "阶段译文", isComplete: false };
      yield { id: 0, result: ["最终译文", ""] };
    }
    handleTranslate.mockImplementationOnce(streamResult);

    const result = await apiTranslate({
      text: "hello",
      fromLang: "en",
      toLang: "zh-CN",
      apiSetting: {
        ...getOpenAiApiSetting("batch prompt A"),
        useBatchFetch: false,
        useStream: true,
        streamRenderMode: "realtime",
      },
      onStreamChunk,
      useCache: false,
    });

    expect(result.trText).toBe("最终译文");
    expect(getBatchQueue).not.toHaveBeenCalled();
    expect(handleTranslate).toHaveBeenCalledWith(
      ["hello"],
      expect.objectContaining({
        onStreamChunk,
        apiSetting: expect.objectContaining({
          useBatchFetch: false,
          useStream: true,
        }),
      })
    );
    expect(onStreamChunk).toHaveBeenCalledWith({
      id: 0,
      text: "阶段译文",
      isComplete: false,
    });
    expect(onStreamChunk).toHaveBeenCalledWith({
      id: 0,
      text: ["最终译文", ""],
      isComplete: true,
    });
  });
});
