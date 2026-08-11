import { createModelListRequest, parseModelListResponse } from "./modelList";
import {
  OPT_TRANS_CLAUDE,
  OPT_TRANS_GEMINI,
  OPT_TRANS_GEMINI_2,
  OPT_TRANS_OPENAI,
} from "../config/api";

describe("modelList", () => {
  test("parses OpenAI-compatible model lists", () => {
    expect(
      parseModelListResponse({
        data: [
          { id: "gpt-4o" },
          { id: "gpt-4o" },
          { id: "deepseek-chat" },
          { id: "" },
        ],
      })
    ).toEqual(["gpt-4o", "deepseek-chat"]);
  });

  test("parses Gemini model lists", () => {
    expect(
      parseModelListResponse({
        models: [
          { name: "models/gemini-2.5-flash" },
          { baseModelId: "gemini-2.5-pro" },
        ],
      })
    ).toEqual(["gemini-2.5-flash", "gemini-2.5-pro"]);
  });

  test("parses Ollama-style model lists", () => {
    expect(
      parseModelListResponse({
        models: [{ name: "llama3.1" }, { name: "qwen2.5:7b" }],
      })
    ).toEqual(["llama3.1", "qwen2.5:7b"]);
  });

  test("returns an empty list for invalid responses", () => {
    expect(parseModelListResponse(null)).toEqual([]);
    expect(parseModelListResponse({ data: "invalid" })).toEqual([]);
  });

  test("builds bearer auth requests by default", () => {
    expect(
      createModelListRequest({
        apiType: OPT_TRANS_OPENAI,
        modelListUrl: "https://api.openai.com/v1/models",
        key: "sk-test",
      })
    ).toEqual({
      input: "https://api.openai.com/v1/models",
      init: {
        method: "GET",
        headers: {
          Authorization: "Bearer sk-test",
        },
      },
    });
  });

  test("builds unauthenticated requests for keyless model endpoints", () => {
    expect(
      createModelListRequest({
        apiType: OPT_TRANS_OPENAI,
        modelListUrl: "http://localhost:11434/api/tags",
        key: "",
      })
    ).toEqual({
      input: "http://localhost:11434/api/tags",
      init: {
        method: "GET",
      },
    });
  });

  test("uses the first non-empty configured key for bearer auth", () => {
    expect(
      createModelListRequest({
        apiType: OPT_TRANS_OPENAI,
        modelListUrl: "https://api.openai.com/v1/models",
        key: " ,\n sk-first,\r\nsk-second ",
      })
    ).toEqual({
      input: "https://api.openai.com/v1/models",
      init: {
        method: "GET",
        headers: {
          Authorization: "Bearer sk-first",
        },
      },
    });
  });

  test("builds Gemini key query requests", () => {
    expect(
      createModelListRequest({
        apiType: OPT_TRANS_GEMINI,
        modelListUrl: "https://generativelanguage.googleapis.com/v1beta/models",
        key: "gemini-key",
      })
    ).toEqual({
      input:
        "https://generativelanguage.googleapis.com/v1beta/models?key=gemini-key",
      init: {
        method: "GET",
      },
    });
  });

  test("uses the first non-empty configured key for Gemini query auth", () => {
    expect(
      createModelListRequest({
        apiType: OPT_TRANS_GEMINI,
        modelListUrl: "https://generativelanguage.googleapis.com/v1beta/models",
        key: "\n,gemini-first,gemini-second",
      })
    ).toEqual({
      input:
        "https://generativelanguage.googleapis.com/v1beta/models?key=gemini-first",
      init: {
        method: "GET",
      },
    });
  });

  test("uses Gemini query auth for the default Gemini2 native model list", () => {
    expect(
      createModelListRequest({
        apiType: OPT_TRANS_GEMINI_2,
        modelListUrl: "https://generativelanguage.googleapis.com/v1beta/models",
        key: "gemini2-key",
      })
    ).toEqual({
      input:
        "https://generativelanguage.googleapis.com/v1beta/models?key=gemini2-key",
      init: {
        method: "GET",
      },
    });
  });

  test("keeps bearer auth for Gemini2 OpenAI-compatible model lists", () => {
    expect(
      createModelListRequest({
        apiType: OPT_TRANS_GEMINI_2,
        modelListUrl:
          "https://generativelanguage.googleapis.com/v1beta/openai/models",
        key: "gemini2-key",
      })
    ).toEqual({
      input: "https://generativelanguage.googleapis.com/v1beta/openai/models",
      init: {
        method: "GET",
        headers: {
          Authorization: "Bearer gemini2-key",
        },
      },
    });
  });

  test("keeps bearer auth for third-party Gemini2 proxies", () => {
    expect(
      createModelListRequest({
        apiType: OPT_TRANS_GEMINI_2,
        modelListUrl: "https://proxy.example/v1/models",
        key: "proxy-key",
      })
    ).toEqual({
      input: "https://proxy.example/v1/models",
      init: {
        method: "GET",
        headers: {
          Authorization: "Bearer proxy-key",
        },
      },
    });
  });

  test("builds Anthropic model list headers", () => {
    expect(
      createModelListRequest({
        apiType: OPT_TRANS_CLAUDE,
        modelListUrl: "https://api.anthropic.com/v1/models",
        key: "claude-key",
      })
    ).toEqual({
      input: "https://api.anthropic.com/v1/models",
      init: {
        method: "GET",
        headers: {
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
          "x-api-key": "claude-key",
        },
      },
    });
  });

  test("keeps bearer auth for third-party Claude proxies", () => {
    expect(
      createModelListRequest({
        apiType: OPT_TRANS_CLAUDE,
        modelListUrl: "https://proxy.example/v1/models",
        key: "proxy-key",
      })
    ).toEqual({
      input: "https://proxy.example/v1/models",
      init: {
        method: "GET",
        headers: {
          Authorization: "Bearer proxy-key",
        },
      },
    });
  });

  test("uses key placeholder without extra authorization", () => {
    expect(
      createModelListRequest({
        apiType: OPT_TRANS_OPENAI,
        modelListUrl: "https://example.com/models?api_key={{key}}",
        key: " ,\nkey with space,second-key",
      })
    ).toEqual({
      input: "https://example.com/models?api_key=key%20with%20space",
      init: {
        method: "GET",
      },
    });
  });

  test("requires a configured key when the URL contains a key placeholder", () => {
    expect(
      createModelListRequest({
        apiType: OPT_TRANS_OPENAI,
        modelListUrl: "https://example.com/models?api_key={{key}}",
        key: " ,\n ",
      })
    ).toBeNull();
  });
});
