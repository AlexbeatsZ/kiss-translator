/**
 * Focused defaults for page and subtitle translation.
 *
 * Older stored keys are intentionally not deleted during migration. They remain
 * recoverable in a user's backup, but new installs no longer initialise the
 * removed selection, dictionary, input-translation, hover, or cloud-sync UI.
 */

import { LogLevel } from "../libs/log";
import { DEFAULT_HTTP_TIMEOUT, DEFAULT_API_LIST } from "./api";
import {
  CURRENT_SETTINGS_VERSION,
  DEFAULT_SUBTITLE_PROMPT_SLUG,
  PROMPT_MODE_FOLLOW_API,
} from "./prompt";
import { DEFAULT_CUSTOM_STYLES } from "./styles";

export const OPT_SHORTCUT_TRANSLATE = "toggleTranslate";
export const OPT_SHORTCUT_TRANSONLY = "toggleTransOnly";
export const OPT_SHORTCUT_STYLE = "toggleStyle";
export const OPT_SHORTCUT_SETTING = "openSetting";
export const OPT_SHORTCUT_NEVER_TRANSLATE = "toggleNeverTranslate";

export const DEFAULT_SHORTCUTS = {
  [OPT_SHORTCUT_TRANSLATE]: ["AltLeft", "KeyQ"],
  [OPT_SHORTCUT_STYLE]: ["AltLeft", "KeyC"],
  [OPT_SHORTCUT_SETTING]: ["AltLeft", "KeyO"],
  [OPT_SHORTCUT_NEVER_TRANSLATE]: ["AltLeft", "ShiftLeft", "KeyD"],
};

export const TRANS_MIN_LENGTH = 2;
export const TRANS_MAX_LENGTH = 100000;
export const TRANS_NEWLINE_LENGTH = 20;

export const DEFAULT_BLACKLIST = [
  "https://fishjar.github.io/kiss-translator/options.html",
  "https://translate.google.com",
  "https://www.deepl.com/translator",
];
export const DEFAULT_CSPLIST = [];
export const DEFAULT_ORILIST = [];

/** Local metadata used only by downloadable site-rule subscriptions. */
export const DEFAULT_SYNC = {
  subRulesSyncAt: 0,
  dataCaches: {},
};

const SUBTITLE_WINDOW_STYLE = `padding: 0.5em 1em;
background-color: rgba(0, 0, 0, 0.5);
color: white;
line-height: 1.3;
text-shadow: 1px 1px 2px black;
display: inline-block`;
const SUBTITLE_ORIGIN_STYLE = `font-size: clamp(1rem, 2cqw, 3rem);`;
const SUBTITLE_TRANSLATION_STYLE = `font-size: clamp(1rem, 2cqw, 3rem);`;

export const OPT_ENHANCE_ON = "on";
export const OPT_ENHANCE_OFF = "off";
export const OPT_ENHANCE_MOBILE_OFF = "mobile_off";

export const DEFAULT_SUBTITLE_SETTING = {
  enabled: true,
  apiSlug: "Microsoft",
  segSlug: "-",
  forceSubtitleRetranslate: false,
  chunkLength: 2000,
  longSentenceThreshold: 100,
  useAlgorithmBreaker: "rule",
  preTrans: 90,
  throttleTrans: 30,
  toLang: "zh-CN",
  isBilingual: true,
  displayOrder: "original-first",
  blurTranslation: false,
  skipAd: false,
  windowStyle: SUBTITLE_WINDOW_STYLE,
  originStyle: SUBTITLE_ORIGIN_STYLE,
  translationStyle: SUBTITLE_TRANSLATION_STYLE,
  aiContextSlug: "-",
  segPromptMode: PROMPT_MODE_FOLLOW_API,
  segPromptSlug: DEFAULT_SUBTITLE_PROMPT_SLUG,
};

export const DEFAULT_SUBRULES_LIST = [
  { url: process.env.REACT_APP_RULESURL, selected: true },
  { url: process.env.REACT_APP_RULESURL_ON, selected: false },
  { url: process.env.REACT_APP_RULESURL_OFF, selected: false },
];

export const DEFAULT_SETTING = {
  version: CURRENT_SETTINGS_VERSION,
  darkMode: "dark",
  uiLang: "en",
  minLength: TRANS_MIN_LENGTH,
  maxLength: TRANS_MAX_LENGTH,
  newlineLength: TRANS_NEWLINE_LENGTH,
  httpTimeout: DEFAULT_HTTP_TIMEOUT,
  clearCache: false,
  injectRules: true,
  subrulesList: DEFAULT_SUBRULES_LIST,
  transApis: DEFAULT_API_LIST,
  prompts: [],
  deletedTransApiSlugs: [],
  shortcuts: DEFAULT_SHORTCUTS,
  touchModes: [2],
  blacklist: DEFAULT_BLACKLIST.join(",\n"),
  csplist: DEFAULT_CSPLIST.join(",\n"),
  orilist: DEFAULT_ORILIST.join(",\n"),
  skipLangs: [],
  transInterval: 100,
  langDetector: "-",
  preInit: true,
  transAllnow: false,
  subtitleSetting: DEFAULT_SUBTITLE_SETTING,
  logLevel: LogLevel.INFO.value,
  rootMargin: 500,
  customStyles: DEFAULT_CUSTOM_STYLES,
};
