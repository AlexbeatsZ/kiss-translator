import {
  DEFAULT_API_LIST,
  normalizeApiModelListUrls,
  OPT_TRANS_CLOUDFLAREAI,
  OPT_TRANS_DEEPSEEK,
  OPT_TRANS_LOCAL_AGY,
  OPT_TRANS_LOCAL_CODEX,
  OPT_TRANS_OPENAI,
} from "./api";

describe("normalizeApiModelListUrls", () => {
  test("旧数据缺少 modelListUrl 时按接口类型补充默认模型列表 URL", () => {
    const transApis = [
      {
        apiSlug: "DeepSeek",
        apiType: OPT_TRANS_DEEPSEEK,
      },
    ];

    const nextApis = normalizeApiModelListUrls(transApis);

    expect(nextApis).not.toBe(transApis);
    expect(nextApis[0]).toEqual({
      apiSlug: "DeepSeek",
      apiType: OPT_TRANS_DEEPSEEK,
      modelListUrl: "https://api.deepseek.com/models",
    });
  });

  test("用户已明确保存为空字符串时不覆盖 modelListUrl", () => {
    const transApis = [
      {
        apiSlug: "OpenAI",
        apiType: OPT_TRANS_OPENAI,
        modelListUrl: "",
      },
    ];

    const nextApis = normalizeApiModelListUrls(transApis);

    expect(nextApis).toBe(transApis);
    expect(nextApis[0].modelListUrl).toBe("");
  });

  test("没有官方默认模型列表接口的旧数据补为空字符串", () => {
    const transApis = [
      {
        apiSlug: "CloudflareAI",
        apiType: OPT_TRANS_CLOUDFLAREAI,
      },
    ];

    const nextApis = normalizeApiModelListUrls(transApis);

    expect(nextApis).not.toBe(transApis);
    expect(nextApis[0].modelListUrl).toBe("");
  });

  test("没有需要补充的字段时保持原数组引用", () => {
    const transApis = [
      {
        apiSlug: "DeepSeek",
        apiType: OPT_TRANS_DEEPSEEK,
        modelListUrl: "https://custom.example.com/models",
      },
    ];

    expect(normalizeApiModelListUrls(transApis)).toBe(transApis);
  });

  test("ships loopback-only Agy and Codex bridge profiles", () => {
    const agy = DEFAULT_API_LIST.find(
      (api) => api.apiType === OPT_TRANS_LOCAL_AGY
    );
    const codex = DEFAULT_API_LIST.find(
      (api) => api.apiType === OPT_TRANS_LOCAL_CODEX
    );

    expect(agy).toMatchObject({
      url: "http://127.0.0.1:17891/v1/agy/chat/completions",
      modelListUrl: "http://127.0.0.1:17891/v1/agy/models",
      useStream: false,
    });
    expect(codex).toMatchObject({
      url: "http://127.0.0.1:17891/v1/codex/chat/completions",
      modelListUrl: "http://127.0.0.1:17891/v1/codex/models",
      useStream: false,
    });
  });
});
