const mockTranslatorInstances = [];
const mockFabInstances = [];

jest.mock("../config", () => ({
  EVENT_KISS_TRANSLATOR: "kiss-translator",
  MSG_TRANS_GETRULE: "trans-getrule",
  MSG_TRANS_PUTRULE: "trans-putrule",
  MSG_TRANS_TOGGLE: "trans-toggle",
  MSG_TRANS_TOGGLE_ONLY: "trans-toggle-only",
  MSG_TRANS_TOGGLE_STYLE: "trans-toggle-style",
  OPT_SHORTCUT_SETTING: "setting",
  OPT_SHORTCUT_STYLE: "style",
  OPT_SHORTCUT_TRANSLATE: "translate",
  OPT_SHORTCUT_TRANSONLY: "transonly",
  newI18n: () => (key) => key,
}));

jest.mock("./browser", () => ({
  browser: {
    runtime: {
      onMessage: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
      },
    },
  },
}));

jest.mock("./translator", () => ({
  Translator: jest.fn().mockImplementation((args) => {
    const instance = {
      setting: args.setting,
      rule: args.rule,
      stop: jest.fn(),
      rescan: jest.fn(),
      toggle: jest.fn(),
      toggleTransOnly: jest.fn(),
      toggleStyle: jest.fn(),
      updateRule: jest.fn(),
    };
    mockTranslatorInstances.push(instance);
    return instance;
  }),
}));

jest.mock("./fabManager", () => ({
  FabManager: jest.fn().mockImplementation((args) => {
    const instance = { args, destroy: jest.fn() };
    mockFabInstances.push(instance);
    return instance;
  }),
}));

jest.mock("./shortcut", () => ({
  shortcutRegister: jest.fn(() => jest.fn()),
}));
jest.mock("./touch", () => ({
  touchTapListener: jest.fn(() => jest.fn()),
}));
jest.mock("./iframe", () => ({ sendIframeMsg: jest.fn() }));
jest.mock("./log", () => ({
  logger: { debug: jest.fn(), info: jest.fn() },
}));

const { browser } = require("./browser");
const { Translator } = require("./translator");
const { FabManager } = require("./fabManager");
const { sendIframeMsg } = require("./iframe");
const TranslatorManager = require("./translatorManager").default;

function setupRuntimeMocks() {
  Translator.mockImplementation((args) => {
    const instance = {
      setting: args.setting,
      rule: args.rule,
      stop: jest.fn(),
      rescan: jest.fn(),
      toggle: jest.fn(),
      toggleTransOnly: jest.fn(),
      toggleStyle: jest.fn(),
      updateRule: jest.fn(),
    };
    mockTranslatorInstances.push(instance);
    return instance;
  });
  FabManager.mockImplementation((args) => {
    const instance = { args, destroy: jest.fn() };
    mockFabInstances.push(instance);
    return instance;
  });
}

function createManager(overrides = {}) {
  return new TranslatorManager({
    setting: { touchModes: [], shortcuts: {}, contextMenusEnabled: true },
    rule: { transOpen: "true", transOnly: "false" },
    fabConfig: { isHide: false },
    isIframe: false,
    isUserscript: false,
    ...overrides,
  });
}

describe("TranslatorManager focused page runtime", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.documentElement.innerHTML = "<head></head><body></body>";
    mockTranslatorInstances.length = 0;
    mockFabInstances.length = 0;
    jest.clearAllMocks();
    setupRuntimeMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test("starts only the page translator and floating translation control", () => {
    const manager = createManager();
    manager.start();

    expect(Translator).toHaveBeenCalledTimes(1);
    expect(FabManager).toHaveBeenCalledTimes(1);
    expect(browser.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
    manager.stop();
  });

  test("routes the three page translation actions", () => {
    const manager = createManager();
    manager.start();
    const translator = mockTranslatorInstances[0];

    window.dispatchEvent(
      new CustomEvent("kiss-translator", {
        detail: { action: "trans-toggle" },
      })
    );
    window.dispatchEvent(
      new CustomEvent("kiss-translator", {
        detail: { action: "trans-toggle-only" },
      })
    );
    window.dispatchEvent(
      new CustomEvent("kiss-translator", {
        detail: { action: "trans-toggle-style" },
      })
    );

    expect(translator.toggle).toHaveBeenCalledTimes(1);
    expect(translator.toggleTransOnly).toHaveBeenCalledTimes(1);
    expect(translator.toggleStyle).toHaveBeenCalledTimes(1);
    expect(sendIframeMsg).toHaveBeenCalledTimes(3);
    manager.stop();
  });

  test("updates the current site rule through extension messages", () => {
    const manager = createManager();
    manager.start();
    const listener = browser.runtime.onMessage.addListener.mock.calls[0][0];
    const respond = jest.fn();

    listener({ action: "trans-putrule", args: { toLang: "ja" } }, {}, respond);

    expect(mockTranslatorInstances[0].updateRule).toHaveBeenCalledWith({
      toLang: "ja",
    });
    manager.stop();
  });

  test("restarts page modules when the body container is replaced", async () => {
    const manager = createManager();
    manager.start();
    const firstTranslator = mockTranslatorInstances[0];
    const firstFab = mockFabInstances[0];

    document.body.replaceWith(document.createElement("body"));
    await Promise.resolve();
    jest.runOnlyPendingTimers();

    expect(Translator).toHaveBeenCalledTimes(2);
    expect(firstTranslator.stop).toHaveBeenCalledTimes(1);
    expect(firstFab.destroy).toHaveBeenCalledTimes(1);
    manager.stop();
  });

  test("stops listeners and runtime modules idempotently", () => {
    const manager = createManager();
    manager.start();
    manager.stop();
    manager.stop();

    expect(mockTranslatorInstances[0].stop).toHaveBeenCalledTimes(1);
    expect(mockFabInstances[0].destroy).toHaveBeenCalledTimes(1);
    expect(browser.runtime.onMessage.removeListener).toHaveBeenCalledTimes(1);
  });
});
