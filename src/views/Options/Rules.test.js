import { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import Rules from "./Rules";
import { useRules } from "../../hooks/Rules";
import { useSubRules } from "../../hooks/SubRules";
import { useSyncCaches } from "../../hooks/Sync";
import { syncSubRules } from "../../libs/subRules";
import {
  delSubRules,
  getDisabledSubRules,
  removeDisabledSubRules,
} from "../../libs/storage";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mockConfirm = jest.fn();
const mockRegisterNavigationGuard = jest.fn();
const mockNavigateWithGuard = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useOutletContext: () => ({
    registerNavigationGuard: mockRegisterNavigationGuard,
    navigateWithGuard: mockNavigateWithGuard,
  }),
}));

jest.mock("../../hooks/I18n", () => ({
  useI18n: () => (key) => key,
}));

jest.mock("../../hooks/Rules", () => ({
  useRules: jest.fn(),
}));

jest.mock("../../hooks/SubRules", () => ({
  useSubRules: jest.fn(),
}));

jest.mock("../../hooks/Sync", () => ({
  useSyncCaches: jest.fn(),
}));

jest.mock("../../hooks/Alert", () => ({
  useAlert: () => ({
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  }),
}));

jest.mock("../../hooks/Setting", () => ({
  useSetting: () => ({
    setting: { injectRules: true },
    updateSetting: jest.fn(),
  }),
}));

jest.mock("../../hooks/Confirm", () => ({
  useConfirm: () => mockConfirm,
}));

let mockApiList = { enabledApis: [], transApis: [] };

jest.mock("../../hooks/Api", () => ({
  useApiList: () => mockApiList,
}));

jest.mock("../../hooks/CustomStyles", () => ({
  useAllTextStyles: () => ({
    allTextStyles: [{ styleSlug: "style_none", styleName: "None" }],
  }),
}));

jest.mock("./HelpButton", () => {
  return function HelpButton() {
    return <span data-testid="help-button" />;
  };
});

jest.mock("../../libs/subRules", () => ({
  syncSubRules: jest.fn(),
  loadOrFetchSubRules: jest.fn(),
}));

jest.mock("../../libs/storage", () => ({
  delSubRules: jest.fn(() => Promise.resolve()),
  getSyncWithDefault: jest.fn(() => Promise.resolve({})),
  getDisabledSubRules: jest.fn(() => Promise.resolve([])),
  setDisabledSubRules: jest.fn(() => Promise.resolve()),
  removeDisabledSubRules: jest.fn(() => Promise.resolve()),
}));

jest.mock("../../libs/log", () => ({
  kissLog: jest.fn(),
  LogLevel: {
    INFO: { value: 3 },
  },
}));

let mockSubRules;
const mockPutRule = jest.fn();
const mockUpdateDataCache = jest.fn();
const mockDeleteDataCache = jest.fn();
const mockReloadSync = jest.fn();

function createSubRules(overrides = {}) {
  return {
    subList: [{ url: "https://rules.example/main.json", selected: true }],
    selectSub: jest.fn(),
    addSub: jest.fn(),
    delSub: jest.fn(),
    selectedSub: { url: "https://rules.example/main.json", selected: true },
    selectedUrl: "https://rules.example/main.json",
    selectedRules: [{ pattern: "en.wikipedia.org" }],
    setSelectedRules: jest.fn(),
    loading: false,
    ...overrides,
  };
}

function renderRules() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<Rules />);
  });

  return {
    container,
    root,
    rerender: () => {
      act(() => {
        root.render(<Rules />);
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function openSubscribeTab(view) {
  const tab = getByRole(view.container, "tab", "rule_subscriptions");
  await act(async () => {
    tab.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flushEffects();
}

async function openPersonalTab(view) {
  const tab = getByRole(view.container, "tab", "site_overrides");
  await act(async () => {
    tab.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flushEffects();
}

function getByRole(container, role, name) {
  const elements = Array.from(container.querySelectorAll(`[role="${role}"]`));
  const element = elements.find((item) => item.textContent === name);
  if (!element) {
    throw new Error(`Unable to find ${role} named ${name}`);
  }
  return element;
}

function getButtonByLabel(container, label) {
  const button = container.querySelector(`button[aria-label="${label}"]`);
  if (!button) {
    throw new Error(`Unable to find button labelled ${label}`);
  }
  return button;
}

function getButtonByText(container, text) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (item) => item.textContent === text
  );
  if (!button) {
    throw new Error(`Unable to find button with text ${text}`);
  }
  return button;
}

describe("Options Rules subscription tab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockResolvedValue(true);
    mockApiList = { enabledApis: [], transApis: [] };
    useRules.mockReturnValue({ list: [] });
    mockSubRules = createSubRules();
    useSubRules.mockImplementation(() => mockSubRules);
    useSyncCaches.mockReturnValue({
      dataCaches: {},
      updateDataCache: mockUpdateDataCache,
      deleteDataCache: mockDeleteDataCache,
      reloadSync: mockReloadSync,
    });
    syncSubRules.mockResolvedValue([{ pattern: "fresh.example" }]);
    getDisabledSubRules.mockResolvedValue([]);
  });

  test("does not reload sync cache when subscription rules render or change", async () => {
    const view = renderRules();
    await openSubscribeTab(view);

    expect(view.container.textContent).toContain("en.wikipedia.org");
    expect(mockReloadSync).not.toHaveBeenCalled();

    mockSubRules = createSubRules({
      selectedRules: [
        { pattern: "en.wikipedia.org" },
        { pattern: "news.ycombinator.com" },
      ],
    });
    view.rerender();
    await flushEffects();

    expect(view.container.textContent).toContain("news.ycombinator.com");
    expect(mockReloadSync).not.toHaveBeenCalled();

    view.unmount();
  });

  test("manual subscription sync still updates the selected rules cache time", async () => {
    const view = renderRules();
    await openSubscribeTab(view);

    const syncButton = getButtonByLabel(
      view.container,
      "Sync subscription https://rules.example/main.json"
    );
    await act(async () => {
      syncButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    await flushEffects();

    expect(syncSubRules).toHaveBeenCalledWith(
      "https://rules.example/main.json"
    );
    expect(mockSubRules.setSelectedRules).toHaveBeenCalledWith([
      { pattern: "fresh.example" },
    ]);
    expect(mockUpdateDataCache).toHaveBeenCalledWith(
      "https://rules.example/main.json"
    );

    view.unmount();
  });

  test("deleting a subscription still deletes its cache time", async () => {
    mockSubRules = createSubRules({
      subList: [
        { url: "https://rules.example/main.json", selected: true },
        { url: "https://rules.example/old.json", selected: false },
      ],
    });
    const view = renderRules();
    await openSubscribeTab(view);

    const deleteButton = getButtonByLabel(
      view.container,
      "Delete subscription https://rules.example/old.json"
    );
    await act(async () => {
      deleteButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    await flushEffects();

    expect(mockSubRules.delSub).toHaveBeenCalledWith(
      "https://rules.example/old.json"
    );
    expect(delSubRules).toHaveBeenCalledWith("https://rules.example/old.json");
    expect(mockDeleteDataCache).toHaveBeenCalledWith(
      "https://rules.example/old.json"
    );
    expect(removeDisabledSubRules).toHaveBeenCalledWith(
      "https://rules.example/old.json"
    );

    view.unmount();
  });
});

describe("Options Rules personal tab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockResolvedValue(true);
    mockApiList = { enabledApis: [], transApis: [] };
    useRules.mockReturnValue({
      list: [
        { pattern: "example.com", enabled: true },
        { pattern: "*", selector: "p" },
      ],
      put: mockPutRule,
    });
    mockSubRules = createSubRules({ selectedRules: [] });
    useSubRules.mockImplementation(() => mockSubRules);
    useSyncCaches.mockReturnValue({
      dataCaches: {},
      updateDataCache: mockUpdateDataCache,
      deleteDataCache: mockDeleteDataCache,
      reloadSync: mockReloadSync,
    });
  });

  test("renders a switch for personal rules but not the global rule", async () => {
    const view = renderRules();
    await openPersonalTab(view);

    const switchInput = view.container.querySelector(
      'input[aria-label="Toggle personal rule example.com"]'
    );

    expect(view.container.textContent).toContain("example.com");
    expect(switchInput).not.toBeNull();
    expect(switchInput.checked).toBe(true);

    view.unmount();
  });

  test("toggles personal rule enabled state without deleting or expanding it", async () => {
    const view = renderRules();
    await openPersonalTab(view);

    const switchInput = view.container.querySelector(
      'input[aria-label="Toggle personal rule example.com"]'
    );
    await act(async () => {
      switchInput.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    await flushEffects();

    expect(mockPutRule).toHaveBeenCalledWith("example.com", {
      enabled: false,
    });
    expect(view.container.querySelector('input[name="pattern"]')).toBeNull();

    view.unmount();
  });

  test("keeps the global service read-only and links a site override to its model", async () => {
    const siteApi = {
      apiSlug: "openai-site",
      apiName: "Site OpenAI",
      apiType: "OpenAI",
      model: "gpt-site",
    };
    const defaultApi = {
      apiSlug: "microsoft",
      apiName: "Microsoft",
      model: "",
    };
    mockApiList = {
      enabledApis: [defaultApi, siteApi],
      transApis: [defaultApi, siteApi],
    };
    useRules.mockReturnValue({
      list: [
        { pattern: "example.com", apiSlug: siteApi.apiSlug, enabled: true },
        { pattern: "*", selector: "p", apiSlug: defaultApi.apiSlug },
      ],
      put: mockPutRule,
    });

    const view = renderRules();

    expect(view.container.querySelector('input[name="apiSlug"]')).toBeNull();
    expect(
      view.container.querySelector('a[href="#/apis?service=microsoft"]')
    ).not.toBeNull();

    await openPersonalTab(view);
    const ruleSummary = getByRole(view.container, "button", "example.com");
    await act(async () => {
      ruleSummary.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushEffects();

    const serviceInput = view.container.querySelector('input[name="apiSlug"]');
    expect(serviceInput).not.toBeNull();
    expect(serviceInput.value).toBe(siteApi.apiSlug);
    expect(view.container.textContent).toContain("optional_service_override");
    expect(view.container.textContent).toContain(siteApi.model);
    expect(
      view.container.querySelector('a[href="#/apis?service=openai-site"]')
    ).not.toBeNull();

    view.unmount();
  });

  test("restoring global page defaults preserves the selected service", async () => {
    useRules.mockReturnValue({
      list: [
        { pattern: "example.com", enabled: true },
        {
          pattern: "*",
          selector: "p",
          apiSlug: "openai-default",
        },
      ],
      put: mockPutRule,
    });

    const view = renderRules();

    const restoreButton = getButtonByText(view.container, "restore_default");
    await act(async () => {
      restoreButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const saveButton = getButtonByText(view.container, "save");
    await act(async () => {
      saveButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(mockPutRule).toHaveBeenCalledWith(
      "*",
      expect.objectContaining({ apiSlug: "openai-default" })
    );

    view.unmount();
  });

  test("guards tab changes and service links while a rule draft is dirty", async () => {
    const view = renderRules();
    await act(async () => {
      Simulate.change(
        view.container.querySelector('textarea[name="rootsSelector"]'),
        {
          target: { name: "rootsSelector", value: "main article" },
        }
      );
    });
    await flushEffects();

    const guard = mockRegisterNavigationGuard.mock.calls
      .map(([candidate]) => candidate)
      .findLast((candidate) => typeof candidate === "function");
    expect(guard).toEqual(expect.any(Function));

    mockConfirm.mockResolvedValueOnce(false);
    const siteOverridesTab = getByRole(view.container, "tab", "site_overrides");
    await act(async () => {
      Simulate.click(siteOverridesTab);
      await Promise.resolve();
    });
    await flushEffects();

    expect(
      getByRole(view.container, "tab", "website_defaults").getAttribute(
        "aria-selected"
      )
    ).toBe("true");

    const manageServiceLink = Array.from(
      view.container.querySelectorAll("a")
    ).find((link) => link.textContent === "manage_default_translation_service");
    await act(async () => {
      Simulate.click(manageServiceLink);
    });
    expect(mockNavigateWithGuard).toHaveBeenCalledWith(
      "/apis?service=Microsoft"
    );

    view.unmount();
  });

  test("does not toggle a personal rule over an unsaved draft", async () => {
    const view = renderRules();
    await openPersonalTab(view);

    await act(async () => {
      Simulate.click(getByRole(view.container, "button", "example.com"));
    });
    await act(async () => {
      Simulate.click(getButtonByText(view.container, "edit"));
    });
    await act(async () => {
      Simulate.change(
        view.container.querySelector('textarea[name="rootsSelector"]'),
        {
          target: { name: "rootsSelector", value: "main article" },
        }
      );
    });
    await flushEffects();

    mockConfirm.mockResolvedValueOnce(false);
    const switchInput = view.container.querySelector(
      'input[aria-label="Toggle personal rule example.com"]'
    );
    await act(async () => {
      switchInput.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    await flushEffects();

    expect(mockConfirm).toHaveBeenCalled();
    expect(mockPutRule).not.toHaveBeenCalled();
    expect(
      view.container.querySelector('textarea[name="rootsSelector"]').value
    ).toBe("main article");

    view.unmount();
  });
});
