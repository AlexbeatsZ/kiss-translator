const mockTranslatorInstances = [];

jest.mock("../config", () => ({
  EVENT_KISS_TRANSLATOR: "kiss-translator",
  MSG_TRANS_GETRULE: "trans-getrule",
  MSG_TRANS_PUTRULE: "trans-putrule",
  MSG_TRANS_TOGGLE: "trans-toggle",
  MSG_TRANS_TOGGLE_ONLY: "trans-toggle-only",
  MSG_TRANS_TOGGLE_STYLE: "trans-toggle-style",
  MSG_TOGGLE_NEVER_TRANSLATE: "toggle-never-translate-site",
  MSG_TRANS_TOGGLE_NEVER_TRANSLATE: "trans-toggle-never-translate",
  OPT_SHORTCUT_SETTING: "setting",
  OPT_SHORTCUT_STYLE: "style",
  OPT_SHORTCUT_TRANSLATE: "translate",
  OPT_SHORTCUT_TRANSONLY: "transonly",
  OPT_SHORTCUT_NEVER_TRANSLATE: "toggleNeverTranslate",
  newI18n: () => (key) => key,
}));

jest.mock("./msg", () => ({
  sendBgMsg: jest.fn(),
}));

jest.mock("./rules", () => ({
  toggleSiteExclusion: jest.fn(),
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
      disable: jest.fn(),
      enable: jest.fn(),
    };
    mockTranslatorInstances.push(instance);
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
  logger: { debug: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

const { browser } = require("./browser");
const { Translator } = require("./translator");
const { sendIframeMsg } = require("./iframe");
const { sendBgMsg } = require("./msg");
const { toggleSiteExclusion } = require("./rules");
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
      disable: jest.fn(),
      enable: jest.fn(),
    };
    mockTranslatorInstances.push(instance);
    return instance;
  });
}

function createManager(overrides = {}) {
  return new TranslatorManager({
    setting: { touchModes: [], shortcuts: {} },
    rule: { transOpen: "true", transOnly: "false" },
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
    jest.clearAllMocks();
    setupRuntimeMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test("starts only the page translator runtime", () => {
    const manager = createManager();
    manager.start();

    expect(Translator).toHaveBeenCalledTimes(1);
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

  test("toggles never-translate exclusion through message", async () => {
    const manager = createManager();
    manager.start();

    sendBgMsg.mockResolvedValue({ isNeverTranslate: true });
    await manager.toggleNeverTranslate();

    expect(sendBgMsg).toHaveBeenCalledWith("toggle-never-translate-site", {
      hostname: window.location.hostname,
    });
    expect(mockTranslatorInstances[0].disable).toHaveBeenCalledTimes(1);

    sendBgMsg.mockResolvedValue({ isNeverTranslate: false });
    await manager.toggleNeverTranslate();

    expect(mockTranslatorInstances[0].enable).toHaveBeenCalledTimes(1);
    manager.stop();
  });

  test("restarts page modules when the body container is replaced", async () => {
    const manager = createManager();
    manager.start();
    const firstTranslator = mockTranslatorInstances[0];

    document.body.replaceWith(document.createElement("body"));
    await Promise.resolve();
    jest.runOnlyPendingTimers();

    expect(Translator).toHaveBeenCalledTimes(2);
    expect(firstTranslator.stop).toHaveBeenCalledTimes(1);
    manager.stop();
  });

  test("stops listeners and runtime modules idempotently", () => {
    const manager = createManager();
    manager.start();
    manager.stop();
    manager.stop();

    expect(mockTranslatorInstances[0].stop).toHaveBeenCalledTimes(1);
    expect(browser.runtime.onMessage.removeListener).toHaveBeenCalledTimes(1);
  });
});
