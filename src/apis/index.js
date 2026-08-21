import queryString from "query-string";
import { fetchData } from "../libs/fetch";
import {
  URL_CACHE_TRAN,
  URL_CACHE_DELANG,
  OPT_LANGS_TO_SPEC,
  OPT_LANGS_SPEC_DEFAULT,
  API_SPE_TYPES,
  DEFAULT_API_SETTING,
  OPT_TRANS_MICROSOFT,
  OPT_TRANS_GOOGLE,
  MSG_BUILTINAI_DETECT,
  MSG_BUILTINAI_TRANSLATE,
  OPT_TRANS_BUILTINAI,
  URL_CACHE_SUBTITLE,
  URL_CACHE_CONTEXT,
  OPT_LANGS_TO_CODE,
  defaultNobatchUserPrompt,
} from "../config";
import { withTimeout } from "../libs/utils";
import { getCacheDigest } from "../libs/cacheDigest";
import {
  handleTranslate,
  handleSubtitle,
  handleSummarize,
  handleMicrosoftLangdetect,
} from "./trans";
import { getHttpCachePolyfill, putHttpCachePolyfill } from "../libs/cache";
import { getBatchQueue } from "../libs/batchQueue";
import { isBuiltinAIAvailable } from "../libs/browser";
import { chromeDetect, chromeTranslate } from "../libs/builtinAI";
import { fnPolyfill } from "../libs/fetch";
import { normalizeHttpTimeout } from "../libs/request";
import { getFetchPool } from "../libs/pool";
import {
  buildGoogle2Request,
  getGoogle2FallbackSetting,
  isGoogleRateLimited,
  isGoogleRateLimitError,
  markGoogleRateLimited,
} from "../libs/googleFallback";

const PROMPT_CACHE_SALT = "prompt-cache";
const PROMPT_CACHE_SCOPE_BATCH = "batch";
const PROMPT_CACHE_SCOPE_NOBATCH = "nobatch";
const PROMPT_CACHE_SCOPE_SUBTITLE = "subtitle";
const PROMPT_CACHE_SCOPE_PLAIN = "plain";

function getTranslatePromptCacheScope(apiSetting = {}) {
  if (!API_SPE_TYPES.ai.has(apiSetting.apiType)) {
    return PROMPT_CACHE_SCOPE_PLAIN;
  }

  return apiSetting.useBatchFetch && API_SPE_TYPES.batch.has(apiSetting.apiType)
    ? PROMPT_CACHE_SCOPE_BATCH
    : PROMPT_CACHE_SCOPE_NOBATCH;
}

function getPromptCacheFields(apiSetting = {}, promptScope) {
  if (promptScope === PROMPT_CACHE_SCOPE_BATCH) {
    return [apiSetting.systemPrompt || ""];
  }

  if (promptScope === PROMPT_CACHE_SCOPE_NOBATCH) {
    return [
      apiSetting.nobatchPrompt || "",
      apiSetting.nobatchUserPrompt ?? defaultNobatchUserPrompt,
    ];
  }

  if (promptScope === PROMPT_CACHE_SCOPE_SUBTITLE) {
    return [apiSetting.subtitlePrompt || ""];
  }

  return [];
}

async function getPromptCacheSig(apiSetting = {}, promptScope) {
  const promptText = [
    promptScope,
    ...getPromptCacheFields(apiSetting, promptScope),
  ].join("\n");

  return (await getCacheDigest(promptText, PROMPT_CACHE_SALT)).slice(0, 16);
}

/**
 * 通用轻量数据拉取函数。
 * @param {string} url 目标 URL
 * @returns {Promise<*>} 拉取的数据内容
 */
export const apiFetch = (url) => fetchData(url);
export const apiFetchText = (url) =>
  fetchData(url, undefined, { expect: "text" });

/**
 * 谷歌语言识别 API。
 * @param {string} text 待识别的原文文本
 * @returns {Promise<string>} 识别出的 ISO 语言简写代码 (e.g. "en")
 */
export const apiGoogleLangdetect = async (text) => {
  const detectWithGoogle2 = async () => {
    const apiSetting = getGoogle2FallbackSetting();
    const { input, init } = buildGoogle2Request({
      texts: [text],
      from: "auto",
      to: "zh-CN",
      apiSetting,
    });
    const res = await fetchData(input, init, { useCache: true });
    if (res?.[1]?.[0]) {
      await putHttpCachePolyfill(input, init, res);
      return res[1][0];
    }
    return "";
  };

  if (isGoogleRateLimited()) {
    return detectWithGoogle2();
  }

  const params = {
    client: "gtx",
    dt: "t",
    dj: 1,
    ie: "UTF-8",
    sl: "auto",
    tl: "zh-CN",
    q: text,
  };
  const input = `https://translate.googleapis.com/translate_a/single?${queryString.stringify(params)}`;
  const init = {
    headers: {
      "Content-type": "application/json",
    },
  };
  // 语言识别通常调用频繁，此处开启 useCache: true 节省请求开销
  let res;
  try {
    res = await fetchData(input, init, { useCache: true });
  } catch (error) {
    if (!isGoogleRateLimitError(error)) throw error;
    markGoogleRateLimited();
    return detectWithGoogle2();
  }

  if (typeof res === "string" && isGoogleRateLimitError(new Error(res))) {
    markGoogleRateLimited();
    return detectWithGoogle2();
  }

  if (res?.src) {
    await putHttpCachePolyfill(input, init, res);
    return res.src;
  }

  return "";
};

/**
 * 微软 Edge 语言识别 API。
 * 支持在队列中进行高并发批处理合并（Batching）以及本地缓存。
 * @param {string} text 待识别的原文文本
 * @returns {Promise<string>} 语言简写代码
 */
export const apiMicrosoftLangdetect = async (text) => {
  const cacheOpts = { text, detector: OPT_TRANS_MICROSOFT };
  const cacheInput = `${URL_CACHE_DELANG}?${queryString.stringify(cacheOpts)}`;

  // 1. 优先读取本地网络缓存
  const cache = await getHttpCachePolyfill(cacheInput);
  if (cache) {
    return cache;
  }

  // 2. 无缓存时，推入批量请求合并队列中（200ms 内的请求合并发送，每批最大 20 条）
  const key = `${URL_CACHE_DELANG}_${OPT_TRANS_MICROSOFT}`;
  const queue = getBatchQueue(key, handleMicrosoftLangdetect, {
    batchInterval: 200,
    batchSize: 20,
    batchLength: 100000,
  });
  const lang = await queue.addTask(text);

  if (lang) {
    putHttpCachePolyfill(cacheInput, null, lang);
    return lang;
  }

  return "";
};

/**
 * 百度语言识别 API。
 * @param {string} text 待识别的原文文本
 * @returns {Promise<string>} 语言简写代码
 */
export const apiBaiduLangdetect = async (text) => {
  const input = "https://fanyi.baidu.com/langdetect";
  const init = {
    headers: {
      "Content-type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      query: text,
    }),
  };
  const res = await fetchData(input, init, { useCache: true });

  if (res?.error === 0) {
    await putHttpCachePolyfill(input, init, res);
    return res.lan;
  }

  return "";
};

/**
 * 腾讯 Transmart 语言识别 API。
 * @param {string} text 原文文本
 * @returns {Promise<string>} 语言简写代号
 */
export const apiTencentLangdetect = async (text) => {
  const input = "https://transmart.qq.com/api/imt";
  const body = JSON.stringify({
    header: {
      fn: "text_analysis",
      client_key:
        "browser-chrome-110.0.0-Mac OS-df4bd4c5-a65d-44b2-a40f-42f34f3535f2-1677486696487",
    },
    text,
  });
  const init = {
    headers: {
      "Content-type": "application/json",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
      referer: "https://transmart.qq.com/zh-CN/index",
    },
    method: "POST",
    body,
  };
  const res = await fetchData(input, init, { useCache: true });

  if (res?.language) {
    await putHttpCachePolyfill(input, init, res);
    return res.language;
  }

  return "";
};

/**
 * 现代浏览器 (Chrome 127+) 内置 Gemini Nano AI 本地语言识别 API。
 * 依靠扩展 runtime/polyfill 桥接特权页面 API 实现。
 * @param {string} text 待测原文
 * @returns {Promise<string>} 检测出的语言
 */
export const apiBuiltinAIDetect = async (text) => {
  if (!isBuiltinAIAvailable) {
    return "";
  }

  // 跨运行环境调用 chrome.translation.canDetectLanguage() 垫片包装
  const [lang, error] = await fnPolyfill({
    fn: chromeDetect,
    msg: MSG_BUILTINAI_DETECT,
    text,
  });
  if (!error) {
    return lang;
  }

  return "";
};

/**
 * 浏览器内置 Gemini Nano AI 翻译 API。
 * 整合了超时管理与内置并发频率池（FetchPool），保证前台调用不易发生死锁。
 */
const apiBuiltinAITranslate = async ({ text, from, to, apiSetting }) => {
  if (!isBuiltinAIAvailable) {
    return ["", true];
  }

  const { fetchInterval, fetchLimit, httpTimeout } = apiSetting;
  // 1. 获取限制并发的频率控制池，保障不频繁打爆本地 AI 进程
  const fetchPool = getFetchPool(fetchInterval, fetchLimit);

  // 2. 执行带有超时机制 (withTimeout) 的本地 AI 翻译
  const result = await withTimeout(
    fetchPool.push(fnPolyfill, {
      fn: chromeTranslate,
      msg: MSG_BUILTINAI_TRANSLATE,
      text,
      from,
      to,
    }),
    normalizeHttpTimeout(httpTimeout)
  );

  if (!result) {
    throw new Error("apiBuiltinAITranslate got null reault");
  }

  const [trText, srLang, error] = result;
  if (error === "Same lang") {
    return [text, srLang, true];
  }
  if (error) {
    throw new Error(`apiBuiltinAITranslate got error: ${error}`);
  }

  return [trText, srLang];
};

/**
 * 全局统一翻译分发控制网关。
 * 承载了翻译缓存命中判断、并发批量队列合并、流式文本输出处理等最核心的工程化细节。
 * @param {Object} params
 * @param {string} params.text 待翻译的原文字符串 (如果是网页翻译，为被分割出的 DOM 文本块)
 * @param {string} params.fromLang 源语言，默认为 "auto"
 * @param {string} params.toLang 目标翻译语言
 * @param {Object} params.apiSetting 翻译接口的配置参数项
 * @param {string} params.glossary 自定义词汇术语替换表
 * @param {Function} params.onStreamChunk 流式响应增量回调函数 (用于 SSE/LLM 翻译)
 * @param {Object} params.docInfo 视频/文档摘要等额外上下文环境数据
 * @param {boolean} params.useCache 是否应用本地请求缓存 (默认 true)
 * @param {boolean} params.usePool 是否应用限制连接池 (默认 true)
 * @param {AbortSignal} params.signal AbortController 传导的取消控制信号
 * @returns {Promise<Object>} 最终解析出的翻译响应数据 (trText, srLang, srCode, isSame)
 */
export const apiTranslate = async ({
  text,
  fromLang = "auto",
  toLang,
  apiSetting = DEFAULT_API_SETTING,
  glossary,
  onStreamChunk,
  docInfo,
  useCache = true,
  usePool = true,
  signal,
}) => {
  if (!text) {
    throw new Error("The text cannot be empty.");
  }
  if (signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }

  const { apiType, apiSlug, useBatchFetch } = apiSetting;
  const langMap = OPT_LANGS_TO_SPEC[apiType] || OPT_LANGS_SPEC_DEFAULT;
  const from = langMap.get(fromLang);
  const to = langMap.get(toLang);
  if (!to) {
    throw new Error(`The target lang: ${toLang} not support`);
  }

  // REVIEW: 极其精妙的缓存 Key (cacheOpts) 构造。
  // 特别是将项目的 REACT_APP_VERSION 版本号（仅前两位小版本）加入了缓存 key。
  // 这可以确保用户在升级扩展插件后，旧版本的翻译缓存会被自动作废，防止旧的翻译 Prompt/规则影响新版效果。
  // 此外，如果当前是视频字幕翻译，还会缓存前 50 字符的上下文视频摘要信息，使上下文关联缓存更智能。
  const [v1, v2] = process.env.REACT_APP_VERSION.split(".");
  const promptSig = await getPromptCacheSig(
    apiSetting,
    getTranslatePromptCacheScope(apiSetting)
  );
  const cacheOpts = {
    apiSlug,
    text,
    fromLang,
    toLang,
    version: [v1, v2].join("."),
    promptSig,
    ...(docInfo?.summary && { ctx: docInfo.summary.slice(0, 50) }),
  };
  const cacheInput = `${URL_CACHE_TRAN}?${queryString.stringify(cacheOpts)}`;

  // 1. 查询本地 HTTP/CacheStorage 缓存
  if (useCache) {
    const cache = await getHttpCachePolyfill(cacheInput);
    if (cache?.trText) {
      return cache;
    }
  }
  if (signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }

  // 2. 缓存未命中，分发执行翻译请求
  let translation = [];
  if (apiType === OPT_TRANS_BUILTINAI) {
    // 2.1 浏览器本地 AI 翻译路径
    translation = await apiBuiltinAITranslate({
      text,
      from,
      to,
      apiSetting,
    });
  } else if (useBatchFetch && API_SPE_TYPES.batch.has(apiType)) {
    // 2.2 支持批量翻译的传统接口 (如 Google/Microsoft/DeepL 等)
    // 使用 BatchQueue 进行零散文本大合并，节省网络交互次数，大幅提升网页整页翻译的载入速度
    const { apiSlug, batchInterval, batchSize, batchLength, useStream } =
      apiSetting;
    const enableStream = useStream && API_SPE_TYPES.stream.has(apiType);
    const key = `${apiSlug}_${fromLang}_${toLang}_${enableStream ? "stream" : "batch"}_${promptSig}`;
    const queue = getBatchQueue(key, handleTranslate, {
      batchInterval,
      batchSize,
      batchLength,
    });

    translation = await queue.addTask(text, {
      from,
      to,
      fromLang,
      toLang,
      langMap,
      glossary,
      apiSetting,
      usePool,
      onStreamChunk,
      docInfo,
      signal,
    });
  } else {
    // 2.3 不支持批量翻译、需要单个请求执行的 API (如某些流式大模型 API)
    const generator = handleTranslate([text], {
      from,
      to,
      fromLang,
      toLang,
      langMap,
      glossary,
      apiSetting,
      usePool,
      docInfo,
      onStreamChunk,
      signal,
    });

    for await (const item of generator) {
      if (item.id !== 0) {
        continue;
      }

      const isComplete = item.isComplete !== false;
      if (!isComplete) {
        if (onStreamChunk) {
          onStreamChunk({
            id: item.id,
            text: item.partialText,
            isComplete: false,
          });
        }
        continue;
      }

      if (onStreamChunk) {
        onStreamChunk({
          id: item.id,
          text: item.result,
          isComplete: true,
        });
      }
      translation = item.result;
    }
  }

  // 3. 对翻译引擎返回的数据格式进行规范化处理
  let trText = "";
  let srLang = "";
  let srCode = "";
  let providerIsSame = false;
  if (Array.isArray(translation)) {
    [trText, srLang = "", providerIsSame = false] = translation;
    if (srLang) {
      srCode =
        (OPT_LANGS_TO_CODE[apiType] || OPT_LANGS_SPEC_DEFAULT).get(srLang) ||
        "";
    }
  } else if (typeof translation === "string") {
    trText = translation;
  }

  if (!trText) {
    throw new Error("tanslate api got empty trtext");
  }

  // 判断是否发生了“源语言与目标语言相同”的无效翻译情况 (如英文网页翻译为英文)
  const isSame = providerIsSame || (fromLang === "auto" && srLang === to);

  // 4. 将成功的结果写入本地网络缓存中
  if (useCache) {
    putHttpCachePolyfill(cacheInput, null, { trText, isSame, srLang, srCode });
  }

  return { trText, srLang, srCode, isSame };
};

/**
 * 专为视频外挂字幕 (Subtitle Segment) 订制的翻译处理函数。
 * 融合了视频上下文摘要，使得大模型字幕翻译语义更加贴合剧情，不会产生传统断句翻译的突兀感。
 * @param {Object} params 包含视频 ID、字幕块标识、当前切片字幕数组、上一句和下一句字幕上下文等。
 * @param {Function} [params.onSubtitleChunk] 字幕断句流式输出完整句子时触发的增量回调。
 * @param {AbortSignal} [params.signal] 当前字幕处理生命周期的取消信号，会下传到请求层。
 * @returns {Promise<Array<Object>>} 完整字幕断句与翻译结果。
 */
export const apiSubtitle = async ({
  videoId,
  chunkSign,
  fromLang = "auto",
  toLang,
  events = [],
  apiSetting,
  docInfo,
  prevContext = "",
  nextContext = "",
  onSubtitleChunk,
  signal,
}) => {
  if (!events?.length) return [];
  const cacheOpts = {
    apiSlug: apiSetting.apiSlug,
    videoId,
    chunkSign,
    fromLang,
    toLang,
    segVer: 2,
    promptSig: await getPromptCacheSig(apiSetting, PROMPT_CACHE_SCOPE_SUBTITLE),
    ctx: docInfo?.summary?.slice(0, 50) || "",
  };
  const cacheInput = `${URL_CACHE_SUBTITLE}?${queryString.stringify(cacheOpts)}`;

  // 1. 读取视频字幕缓存
  const cache = await getHttpCachePolyfill(cacheInput);
  if (cache) {
    return cache;
  }

  // 2. 发起含有剧本前后文语义的字幕翻译请求
  const subtitles = await handleSubtitle({
    events,
    from: fromLang,
    to: toLang,
    apiSetting,
    docInfo,
    prevContext,
    nextContext,
    onSubtitleChunk,
    signal,
  });
  if (subtitles?.length) {
    putHttpCachePolyfill(cacheInput, null, subtitles);
    return subtitles;
  }

  return [];
};

/**
 * 对视频标题、简介和原始字幕轨进行长文本上下文的总结与归纳，提取视频核心大纲 (Video Context Summary)。
 * 归纳出的 summary 会反馈给字幕翻译 API，以便提供语义支撑。
 */
export const apiSummarizeContext = async ({
  videoId,
  title,
  description,
  transcript,
  apiSetting,
}) => {
  const cacheOpts = { apiSlug: apiSetting.apiSlug, videoId };
  const cacheInput = `${URL_CACHE_CONTEXT}?${queryString.stringify(cacheOpts)}`;

  // 1. 读取总结摘要缓存，避免每次打开同一视频重复对长文本请求总结
  const cache = await getHttpCachePolyfill(cacheInput);
  if (cache) {
    return cache;
  }

  // 2. 调用大模型/特定接口生成视频提炼大纲
  const summary = await handleSummarize({
    title,
    description,
    transcript,
    apiSetting,
  });

  if (summary) {
    putHttpCachePolyfill(cacheInput, null, summary);
    return summary;
  }

  return "";
};
