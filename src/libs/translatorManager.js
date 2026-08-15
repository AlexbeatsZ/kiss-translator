import { browser } from "./browser";
import { Translator } from "./translator";
import { shortcutRegister } from "./shortcut";
import { sendIframeMsg } from "./iframe";
import { touchTapListener } from "./touch";
import { FabManager } from "./fabManager";
import { logger } from "./log";
import {
  EVENT_KISS_TRANSLATOR,
  MSG_TRANS_GETRULE,
  MSG_TRANS_PUTRULE,
  MSG_TRANS_TOGGLE,
  MSG_TRANS_TOGGLE_ONLY,
  MSG_TRANS_TOGGLE_STYLE,
  OPT_SHORTCUT_SETTING,
  OPT_SHORTCUT_STYLE,
  OPT_SHORTCUT_TRANSLATE,
  OPT_SHORTCUT_TRANSONLY,
  newI18n,
} from "../config";

/**
 * Own the page-translation runtime lifecycle.
 *
 * Subtitle translation deliberately stays behind runSubtitle(). This module
 * only keeps the page translator, its compact floating control, retained
 * shortcuts, cross-frame actions, and SPA container recovery in one place.
 */
export default class TranslatorManager {
  #clearShortcuts = [];
  #menuCommandIds = [];
  #clearTouchListeners = [];
  #isActive = false;

  #setting;
  #rule;
  #fabConfig;
  #isUserscript;
  #isIframe;

  #documentObserver = null;
  #documentElementObserver = null;
  #knownDocumentElement = null;
  #knownBody = null;
  #spaRefreshTimer = null;
  #pendingSpaRefresh = null;
  #pendingSpaRefreshReason = "";

  #innerMessageHandler;
  #browserMessageHandler;
  #windowMessageHandler;
  #pageRestoreHandler;
  #spaNavigationHandler;

  _translator = null;
  _fabManager = null;

  constructor({ setting, rule, fabConfig, isIframe, isUserscript }) {
    this.#setting = this.#cloneConfig(setting);
    this.#rule = this.#cloneConfig(rule);
    this.#fabConfig = this.#cloneConfig(fabConfig);
    this.#isIframe = isIframe;
    this.#isUserscript = isUserscript;

    this.#innerMessageHandler = this.#handleInnerMessage.bind(this);
    this.#browserMessageHandler = this.#handleBrowserMessage.bind(this);
    this.#windowMessageHandler = this.#handleWindowMessage.bind(this);
    this.#pageRestoreHandler = this.#handlePageRestore.bind(this);
    this.#spaNavigationHandler = this.#handleSpaNavigation.bind(this);
  }

  start() {
    if (this.#isActive) return;

    this.#createRuntimeModules();
    this.#setupMessageListeners();
    this.#setupTouchOperations();

    if (!this.#isIframe && this.#isUserscript) {
      this.#registerShortcuts();
      this.#registerMenus();
    }

    this.#setupSpaListeners();
    this.#isActive = true;
    logger.info("Page translation runtime started.");
  }

  restart(reason = "spa-navigation") {
    if (!this.#isActive) return;

    const state = this.#snapshotRuntimeState();
    this.#destroyRuntimeModules();
    this.#setting = state.setting;
    this.#rule = state.rule;
    this.#fabConfig = state.fabConfig;
    this.#createRuntimeModules();
    this.#refreshDocumentElementObserver();
    logger.info(`Page translation runtime restarted: ${reason}`);
  }

  stop() {
    if (!this.#isActive) return;

    this.#clearSpaRefreshTimer();
    this.#teardownSpaListeners();
    window.removeEventListener(
      EVENT_KISS_TRANSLATOR,
      this.#windowMessageHandler
    );

    if (this.#isUserscript) {
      window.removeEventListener("message", this.#innerMessageHandler);
    } else {
      browser.runtime.onMessage.removeListener(this.#browserMessageHandler);
      if (this.#isIframe) {
        window.removeEventListener("message", this.#innerMessageHandler);
      }
    }

    this.#clearShortcuts.forEach((clear) => clear());
    this.#clearShortcuts = [];
    this.#clearTouchListeners.forEach((clear) => clear());
    this.#clearTouchListeners = [];

    if (globalThis.GM && this.#menuCommandIds.length > 0) {
      this.#menuCommandIds.forEach((id) => GM.unregisterMenuCommand?.(id));
      this.#menuCommandIds = [];
    }

    this.#destroyRuntimeModules();
    this.#isActive = false;
    logger.info("Page translation runtime stopped.");
  }

  #createRuntimeModules() {
    this._translator = new Translator({
      rule: this.#cloneConfig(this.#rule),
      setting: this.#cloneConfig(this.#setting),
      isUserscript: this.#isUserscript,
      isIframe: this.#isIframe,
    });

    if (!this.#isIframe) {
      this._fabManager = new FabManager({
        processActions: this.#processActions.bind(this),
        fabConfig: this.#cloneConfig(this.#fabConfig),
      });
    }
  }

  #destroyRuntimeModules() {
    this._fabManager?.destroy();
    this._translator?.stop();
    this._fabManager = null;
    this._translator = null;
  }

  #cloneConfig(value) {
    if (value == null) return value;
    if (typeof globalThis.structuredClone === "function") {
      try {
        return globalThis.structuredClone(value);
      } catch (error) {
        logger.debug("structuredClone failed, using JSON clone.", error);
      }
    }
    return JSON.parse(JSON.stringify(value));
  }

  #snapshotRuntimeState() {
    return {
      setting: this.#cloneConfig(this._translator?.setting || this.#setting),
      rule: this.#cloneConfig(this._translator?.rule || this.#rule),
      fabConfig: this.#cloneConfig(this.#fabConfig),
    };
  }

  #setupSpaListeners() {
    this.#documentObserver = new MutationObserver(() => {
      this.#handleDocumentContainerMutation("document");
    });
    this.#documentObserver.observe(document, { childList: true });

    this.#refreshDocumentElementObserver();
    window.addEventListener("pageshow", this.#pageRestoreHandler);
    document.addEventListener(
      "turbo:frame-load",
      this.#spaNavigationHandler,
      true
    );
  }

  #teardownSpaListeners() {
    this.#documentObserver?.disconnect();
    this.#documentObserver = null;
    this.#documentElementObserver?.disconnect();
    this.#documentElementObserver = null;
    this.#knownDocumentElement?.removeEventListener(
      "turbo:load",
      this.#spaNavigationHandler
    );
    this.#knownDocumentElement = null;
    this.#knownBody = null;
    window.removeEventListener("pageshow", this.#pageRestoreHandler);
    document.removeEventListener(
      "turbo:frame-load",
      this.#spaNavigationHandler,
      true
    );
  }

  #refreshDocumentElementObserver() {
    this.#documentElementObserver?.disconnect();
    this.#documentElementObserver = null;
    this.#knownDocumentElement?.removeEventListener(
      "turbo:load",
      this.#spaNavigationHandler
    );

    this.#knownDocumentElement = document.documentElement;
    this.#knownBody = document.body;
    if (!this.#knownDocumentElement) return;

    this.#knownDocumentElement.addEventListener(
      "turbo:load",
      this.#spaNavigationHandler
    );
    this.#documentElementObserver = new MutationObserver(() => {
      this.#handleDocumentContainerMutation("documentElement");
    });
    this.#documentElementObserver.observe(this.#knownDocumentElement, {
      childList: true,
    });
  }

  #handleDocumentContainerMutation(reason) {
    if (this.#hasDocumentContainerChanged()) {
      this.#scheduleSpaRefresh("restart", reason);
    }
  }

  #handlePageRestore(event) {
    if (event.type === "pageshow" && event.persisted !== true) return;
    this.#scheduleSpaRefresh("rescan", event.type);
  }

  #handleSpaNavigation(event) {
    this.#scheduleSpaRefresh("rescan", event.type);
  }

  #scheduleSpaRefresh(type, reason) {
    if (!this.#isActive) return;

    if (this.#spaRefreshTimer) {
      clearTimeout(this.#spaRefreshTimer);
      this.#spaRefreshTimer = null;
    }

    if (type === "restart" || this.#pendingSpaRefresh !== "restart") {
      this.#pendingSpaRefresh = type;
      this.#pendingSpaRefreshReason = reason;
    }
    if (type === "restart") this.#pendingSpaRefreshReason = reason;

    this.#spaRefreshTimer = setTimeout(() => {
      const refreshType = this.#pendingSpaRefresh;
      const refreshReason = this.#pendingSpaRefreshReason;
      this.#spaRefreshTimer = null;
      this.#pendingSpaRefresh = null;
      this.#pendingSpaRefreshReason = "";
      if (!this.#isActive) return;

      if (refreshType === "restart" || this.#hasDocumentContainerChanged()) {
        this.restart(refreshReason);
        return;
      }

      this._translator?.rescan();
      logger.info(`Page translation runtime rescanned: ${refreshReason}`);
    }, 0);
  }

  #clearSpaRefreshTimer() {
    if (!this.#spaRefreshTimer) return;
    clearTimeout(this.#spaRefreshTimer);
    this.#spaRefreshTimer = null;
    this.#pendingSpaRefresh = null;
    this.#pendingSpaRefreshReason = "";
  }

  #hasDocumentContainerChanged() {
    return (
      document.documentElement !== this.#knownDocumentElement ||
      document.body !== this.#knownBody
    );
  }

  #setupMessageListeners() {
    if (this.#isUserscript) {
      window.addEventListener("message", this.#innerMessageHandler);
    } else {
      browser.runtime.onMessage.addListener(this.#browserMessageHandler);
      if (this.#isIframe) {
        window.addEventListener("message", this.#innerMessageHandler);
      }
    }
    window.addEventListener(EVENT_KISS_TRANSLATOR, this.#windowMessageHandler);
  }

  #setupTouchOperations() {
    if (this.#isIframe) return;
    const { touchModes = [2] } = this._translator.setting;
    const optionsByMode = {
      2: { taps: 1, fingers: 2 },
      3: { taps: 1, fingers: 3 },
      4: { taps: 1, fingers: 4 },
      5: { taps: 2, fingers: 1 },
      6: { taps: 3, fingers: 1 },
      7: { taps: 2, fingers: 2 },
    };

    touchModes.forEach((mode) => {
      const options = optionsByMode[mode];
      if (!options) return;
      this.#clearTouchListeners.push(
        touchTapListener(
          () => this.#processActions({ action: MSG_TRANS_TOGGLE }),
          options
        )
      );
    });
  }

  #handleWindowMessage(event) {
    this.#processActions(event.detail);
  }

  #handleInnerMessage(event) {
    this.#processActions(event.data);
  }

  #handleBrowserMessage(message, sender, sendResponse) {
    const result = this.#processActions(message, true);
    sendResponse(
      result || {
        rule: this._translator?.rule || this.#rule,
        setting: this._translator?.setting || this.#setting,
      }
    );
    return true;
  }

  #registerShortcuts() {
    const { shortcuts = {} } = this._translator.setting;
    this.#clearShortcuts = [
      shortcutRegister(shortcuts[OPT_SHORTCUT_TRANSLATE], () =>
        this.#processActions({ action: MSG_TRANS_TOGGLE })
      ),
      shortcutRegister(shortcuts[OPT_SHORTCUT_TRANSONLY], () =>
        this.#processActions({ action: MSG_TRANS_TOGGLE_ONLY })
      ),
      shortcutRegister(shortcuts[OPT_SHORTCUT_STYLE], () =>
        this.#processActions({ action: MSG_TRANS_TOGGLE_STYLE })
      ),
      shortcutRegister(shortcuts[OPT_SHORTCUT_SETTING], () =>
        window.open(process.env.REACT_APP_OPTIONSPAGE, "_blank")
      ),
    ];
  }

  #registerMenus() {
    if (!globalThis.GM) return;
    const { contextMenusEnabled = true, uiLang } = this._translator.setting;
    if (!contextMenusEnabled) return;

    const i18n = newI18n(uiLang || "zh");
    this.#menuCommandIds = [
      GM.registerMenuCommand?.(
        i18n("translate_switch"),
        () => this.#processActions({ action: MSG_TRANS_TOGGLE }),
        "Q"
      ),
      GM.registerMenuCommand?.(
        i18n("transonly_alt"),
        () => this.#processActions({ action: MSG_TRANS_TOGGLE_ONLY }),
        "Q"
      ),
      GM.registerMenuCommand?.(
        i18n("toggle_style"),
        () => this.#processActions({ action: MSG_TRANS_TOGGLE_STYLE }),
        "C"
      ),
      GM.registerMenuCommand?.(
        i18n("open_setting"),
        () => window.open(process.env.REACT_APP_OPTIONSPAGE, "_blank"),
        "O"
      ),
    ].filter(Boolean);
  }

  #processActions({ action, args } = {}, fromExt = false) {
    if (!action) return;
    if (!fromExt) sendIframeMsg(action, args);

    switch (action) {
      case MSG_TRANS_TOGGLE:
        this._translator?.toggle();
        break;
      case MSG_TRANS_TOGGLE_ONLY:
        this._translator?.toggleTransOnly();
        break;
      case MSG_TRANS_TOGGLE_STYLE:
        this._translator?.toggleStyle();
        break;
      case MSG_TRANS_GETRULE:
        break;
      case MSG_TRANS_PUTRULE:
        this._translator?.updateRule(args);
        break;
      default:
        return { error: `Message action is unavailable: ${action}` };
    }
  }
}
