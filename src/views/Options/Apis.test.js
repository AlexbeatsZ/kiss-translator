import { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import Apis from "./Apis";
import { OPT_TRANS_OPENAI } from "../../config";
import { fetchModelList } from "../../libs/modelList";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
HTMLElement.prototype.scrollTo = jest.fn();
const mockConfirm = jest.fn();
const mockWarning = jest.fn();
const mockRegisterNavigationGuard = jest.fn();
let mockSetting = {};

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useOutletContext: () => ({
    registerNavigationGuard: mockRegisterNavigationGuard,
  }),
}));

jest.mock("../../hooks/I18n", () => ({
  useI18n: () => (key, fallback) => fallback || key,
}));

jest.mock("../../hooks/Api", () => ({
  useApiList: jest.fn(),
  useApiItem: jest.fn(),
}));

jest.mock("../../hooks/Rules", () => ({
  useRules: jest.fn(),
}));

jest.mock("../../hooks/Prompt", () => ({
  usePromptList: () => ({
    prompts: [
      {
        slug: "nobatch-translation",
        category: "user prompt",
        name: "Non-batch translation",
      },
      {
        slug: "batch-translation-json",
        category: "batch system prompt",
        name: "Batch translation",
      },
      {
        slug: "subtitle-segmentation",
        category: "subtitle prompt",
        name: "Subtitle segmentation",
      },
      {
        slug: "dictionary-en-zh",
        category: "dictionary prompt",
        name: "Dictionary",
      },
    ],
  }),
}));

jest.mock("../../hooks/Confirm", () => ({
  useConfirm: () => mockConfirm,
}));

jest.mock("../../hooks/Alert", () => ({
  useAlert: () => ({
    success: jest.fn(),
    error: jest.fn(),
    warning: mockWarning,
  }),
}));

jest.mock("../../hooks/Setting", () => ({
  useSetting: () => ({
    setting: mockSetting,
  }),
}));

jest.mock("../../apis", () => ({
  apiTranslate: jest.fn(),
}));

jest.mock("../../libs/modelList", () => ({
  fetchModelList: jest.fn(),
}));

jest.mock("./ReusableAutocomplete", () => {
  return function MockReusableAutocomplete({
    name,
    label,
    value,
    options = [],
    onChange,
    onFocus,
    textFieldProps = {},
  }) {
    return (
      <label>
        {label}
        <input
          name={name}
          value={value || ""}
          onChange={onChange}
          onFocus={onFocus}
          data-options={options.join(",")}
          aria-invalid={textFieldProps.error ? "true" : "false"}
        />
        {textFieldProps.helperText ? (
          <span>{textFieldProps.helperText}</span>
        ) : null}
      </label>
    );
  };
});

const { useApiList, useApiItem } = require("../../hooks/Api");
const { useRules } = require("../../hooks/Rules");

function createApi(overrides = {}) {
  return {
    apiSlug: "OpenAI",
    apiName: "OpenAI",
    apiType: OPT_TRANS_OPENAI,
    url: "https://api.openai.com/v1/chat/completions",
    key: "sk-test",
    model: "gpt-4",
    modelListUrl: "https://api.openai.com/v1/models",
    sortOrder: 0,
    httpTimeout: 30,
    ...overrides,
  };
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function renderApis(
  apiOrApis = createApi(),
  update = jest.fn(),
  { rulesList } = {}
) {
  const apis = Array.isArray(apiOrApis) ? apiOrApis : [apiOrApis];
  const firstApi = apis[0];
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  const apiListActions = {
    addApi: jest.fn(),
    deleteApi: jest.fn(),
    deleteApis: jest.fn(),
    pinApis: jest.fn(),
    disableApis: jest.fn(),
    enableApis: jest.fn(),
    copyApi: jest.fn(),
    alphaSortApis: jest.fn(),
    reorderApis: jest.fn(),
  };
  useApiList.mockReturnValue({
    transApis: apis,
    ...apiListActions,
  });
  useApiItem.mockImplementation((apiSlug) => {
    const api = apis.find((item) => item.apiSlug === apiSlug);
    return {
      api,
      update,
      reset: jest.fn(),
      resetData: api
        ? {
            ...createApi(),
            apiSlug: api.apiSlug,
            apiName: api.apiName,
            apiType: api.apiType,
            key: api.key,
          }
        : {},
    };
  });
  const putRule = jest.fn();
  useRules.mockReturnValue({
    list:
      rulesList === undefined
        ? [{ pattern: "*", apiSlug: firstApi.apiSlug }]
        : rulesList,
    put: putRule,
  });

  await act(async () => {
    root.render(<Apis />);
  });
  await flushEffects();

  return {
    container,
    update,
    putRule,
    ...apiListActions,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function getInput(container, name) {
  const input = container.querySelector(`input[name="${name}"]`);
  if (!input) {
    throw new Error(`Unable to find input named ${name}`);
  }
  return input;
}

function getSaveButton(container) {
  return Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent === "save"
  );
}

async function openAdvanced(container) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (item) =>
      item.textContent === "高级设置" ||
      item.textContent === "Advanced" ||
      item.value === "maintenance"
  );
  await act(async () => {
    Simulate.click(button);
  });
}

describe("Apis model list", () => {
  beforeEach(() => {
    mockConfirm.mockResolvedValue(true);
    mockSetting = {
      prompts: [],
      inputRule: {},
      tranboxSetting: {},
      subtitleSetting: {},
      uiLang: "zh",
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = "";
  });

  test("loads model list once when model input is focused", async () => {
    fetchModelList.mockResolvedValue(["gpt-4o", "gpt-4.1"]);
    const view = await renderApis();
    const modelInput = getInput(view.container, "model");

    await act(async () => {
      Simulate.focus(modelInput);
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      Simulate.focus(modelInput);
      await Promise.resolve();
    });

    expect(fetchModelList).toHaveBeenCalledTimes(1);
    expect(fetchModelList).toHaveBeenCalledWith({
      apiType: OPT_TRANS_OPENAI,
      modelListUrl: "https://api.openai.com/v1/models",
      key: "sk-test",
      httpTimeout: 30,
    });
    expect(modelInput.getAttribute("data-options")).toContain("gpt-4o");

    view.unmount();
  });

  test("does not load model list without a model list url", async () => {
    const view = await renderApis(createApi({ modelListUrl: "" }));
    const modelInput = getInput(view.container, "model");

    await act(async () => {
      Simulate.focus(modelInput);
      await Promise.resolve();
    });

    expect(fetchModelList).not.toHaveBeenCalled();

    view.unmount();
  });

  test("loads a keyless local model list", async () => {
    fetchModelList.mockResolvedValue(["qwen2.5:7b"]);
    const view = await renderApis(createApi({ key: "" }));
    const modelInput = getInput(view.container, "model");

    await act(async () => {
      Simulate.focus(modelInput);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchModelList).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "",
        modelListUrl: "https://api.openai.com/v1/models",
      })
    );
    expect(modelInput.getAttribute("data-options")).toContain("qwen2.5:7b");

    view.unmount();
  });

  test("keeps manual model input saveable", async () => {
    const update = jest.fn();
    const view = await renderApis(createApi(), update);
    const modelInput = getInput(view.container, "model");

    await act(async () => {
      Simulate.change(modelInput, {
        target: {
          name: "model",
          value: "manual-model",
        },
      });
    });

    const saveButton = getSaveButton(view.container);
    await act(async () => {
      Simulate.click(saveButton);
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "manual-model",
      })
    );

    view.unmount();
  });

  test("keeps restore-default changes in the draft until save", async () => {
    const update = jest.fn();
    const view = await renderApis(
      createApi({ model: "custom-before-reset" }),
      update
    );
    await openAdvanced(view.container);
    const restoreButton = Array.from(
      view.container.querySelectorAll("button")
    ).find((button) => button.textContent === "restore_default");

    await act(async () => {
      Simulate.click(restoreButton);
    });

    expect(update).not.toHaveBeenCalled();
    const connectionButton = Array.from(
      view.container.querySelectorAll("button")
    ).find(
      (button) =>
        button.textContent === "连接与模型" ||
        button.textContent === "Connection" ||
        button.value === "connection"
    );
    await act(async () => {
      Simulate.click(connectionButton);
    });
    expect(getInput(view.container, "model").value).toBe("gpt-4");

    await act(async () => {
      Simulate.click(getSaveButton(view.container));
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gpt-4" })
    );

    view.unmount();
  });

  test("shows fetch failure without clearing model", async () => {
    fetchModelList.mockRejectedValue(new Error("network failed"));
    const view = await renderApis();
    const modelInput = getInput(view.container, "model");

    await act(async () => {
      Simulate.focus(modelInput);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(modelInput.value).toBe("gpt-4");
    expect(modelInput.getAttribute("aria-invalid")).toBe("true");
    expect(view.container.textContent).toContain("model_list_fetch_failed");

    view.unmount();
  });

  test("resets model list error when url or key changes", async () => {
    fetchModelList.mockRejectedValue(new Error("network failed"));
    const view = await renderApis();
    const modelInput = getInput(view.container, "model");
    const modelListUrlInput = getInput(view.container, "modelListUrl");

    await act(async () => {
      Simulate.focus(modelInput);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(modelInput.getAttribute("aria-invalid")).toBe("true");
    expect(view.container.textContent).toContain("model_list_fetch_failed");

    await act(async () => {
      Simulate.change(modelListUrlInput, {
        target: {
          name: "modelListUrl",
          value: "https://api.openai.com/v1/models?fixed=1",
        },
      });
      await Promise.resolve();
    });

    expect(modelInput.getAttribute("aria-invalid")).toBe("false");
    expect(view.container.textContent).not.toContain("model_list_fetch_failed");

    view.unmount();
  });

  test("ignores a stale model list response after connection settings change", async () => {
    const oldRequest = createDeferred();
    const newRequest = createDeferred();
    fetchModelList
      .mockReturnValueOnce(oldRequest.promise)
      .mockReturnValueOnce(newRequest.promise);
    const view = await renderApis();
    const modelInput = getInput(view.container, "model");
    const modelListUrlInput = getInput(view.container, "modelListUrl");

    await act(async () => {
      Simulate.focus(modelInput);
      await Promise.resolve();
    });

    await act(async () => {
      Simulate.change(modelListUrlInput, {
        target: {
          name: "modelListUrl",
          value: "http://localhost:11434/api/tags",
        },
      });
    });

    const refreshButton = Array.from(
      view.container.querySelectorAll("button")
    ).find(
      (button) =>
        button.textContent === "刷新模型" ||
        button.textContent === "Refresh models"
    );
    await act(async () => {
      Simulate.click(refreshButton);
      await Promise.resolve();
    });

    await act(async () => {
      newRequest.resolve(["local-model"]);
      await newRequest.promise;
    });
    expect(modelInput.getAttribute("data-options")).toContain("local-model");

    await act(async () => {
      oldRequest.resolve(["stale-cloud-model"]);
      await oldRequest.promise;
    });
    expect(modelInput.getAttribute("data-options")).toContain("local-model");
    expect(modelInput.getAttribute("data-options")).not.toContain(
      "stale-cloud-model"
    );

    view.unmount();
  });

  test("changes the default page service through the services page", async () => {
    const firstApi = createApi();
    const secondApi = createApi({
      apiSlug: "OpenAI-second",
      apiName: "OpenAI second",
      model: "gpt-4.1",
    });
    const view = await renderApis([firstApi, secondApi]);
    await act(async () => {
      Simulate.click(
        view.container.querySelector(`[data-api-slug="${secondApi.apiSlug}"]`)
      );
      await Promise.resolve();
    });

    const useForPagesButton = Array.from(
      view.container.querySelectorAll("button")
    ).find(
      (button) =>
        button.textContent === "设为网页默认" ||
        button.textContent === "Use for pages"
    );
    await act(async () => {
      Simulate.click(useForPagesButton);
    });

    expect(view.putRule).toHaveBeenCalledWith("*", {
      apiSlug: secondApi.apiSlug,
    });

    view.unmount();
  });

  test("does not discard an edited service when switching is cancelled", async () => {
    const firstApi = createApi();
    const secondApi = createApi({
      apiSlug: "OpenAI-second",
      apiName: "OpenAI second",
      model: "gpt-4.1",
    });
    const view = await renderApis([firstApi, secondApi]);
    const modelInput = getInput(view.container, "model");

    await act(async () => {
      Simulate.change(modelInput, {
        target: { name: "model", value: "unsaved-model" },
      });
    });
    await flushEffects();

    const secondServiceButton = view.container.querySelector(
      `[data-api-slug="${secondApi.apiSlug}"]`
    );
    mockConfirm.mockResolvedValueOnce(false);

    await act(async () => {
      Simulate.click(secondServiceButton);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockConfirm).toHaveBeenCalled();
    expect(getInput(view.container, "model").value).toBe("unsaved-model");

    view.unmount();
  });

  test("registers a route guard while a service draft is dirty", async () => {
    const view = await renderApis();

    await act(async () => {
      Simulate.change(getInput(view.container, "model"), {
        target: { name: "model", value: "unsaved-model" },
      });
    });
    await flushEffects();

    const guard = mockRegisterNavigationGuard.mock.calls
      .map(([candidate]) => candidate)
      .findLast((candidate) => typeof candidate === "function");
    expect(guard).toEqual(expect.any(Function));

    mockConfirm.mockResolvedValueOnce(false);
    await expect(guard()).resolves.toBe(false);
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/unsaved|未保存/),
      })
    );

    view.unmount();
  });

  test("blocks deleting a service that is referenced by website rules", async () => {
    const view = await renderApis();
    await openAdvanced(view.container);
    const deleteButton = Array.from(
      view.container.querySelectorAll("button")
    ).find((button) => button.textContent === "delete");

    await act(async () => {
      Simulate.click(deleteButton);
    });

    expect(mockWarning).toHaveBeenCalledWith(
      expect.stringMatching(/Website defaults|网站默认/)
    );
    expect(view.deleteApi).not.toHaveBeenCalled();
    expect(mockConfirm).not.toHaveBeenCalled();

    view.unmount();
  });

  test("blocks deleting a service referenced by subtitle roles", async () => {
    mockSetting = {
      ...mockSetting,
      subtitleSetting: {
        apiSlug: "OpenAI",
        segSlug: "OpenAI",
        aiContextSlug: "OpenAI",
      },
    };
    const view = await renderApis(createApi(), jest.fn(), { rulesList: [] });
    await openAdvanced(view.container);
    const deleteButton = Array.from(
      view.container.querySelectorAll("button")
    ).find((button) => button.textContent === "delete");

    await act(async () => {
      Simulate.click(deleteButton);
    });

    expect(mockWarning).toHaveBeenCalledWith(
      expect.stringMatching(/Video subtitles|视频字幕/)
    );
    expect(mockWarning.mock.calls[0][0]).not.toContain("Input translation");
    expect(mockWarning.mock.calls[0][0]).not.toContain("Selection translation");
    expect(view.deleteApi).not.toHaveBeenCalled();

    view.unmount();
  });
});
