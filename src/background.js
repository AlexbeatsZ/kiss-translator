import browser from "webextension-polyfill";
import {
  MSG_FETCH,
  MSG_GET_HTTPCACHE,
  MSG_PUT_HTTPCACHE,
  MSG_TRANS_TOGGLE,
  MSG_TRANS_TOGGLE_ONLY,
  MSG_OPEN_OPTIONS,
  MSG_SAVE_RULE,
  MSG_TRANS_TOGGLE_STYLE,
  MSG_COMMAND_SHORTCUTS,
  MSG_INJECT_JS,
  MSG_INJECT_CSS,
  MSG_UPDATE_CSP,
  MSG_BUILTINAI_DETECT,
  MSG_BUILTINAI_TRANSLATE,
  CMD_TOGGLE_TRANSLATE,
  CMD_TOGGLE_TRANSLATE_ONLY,
  CMD_TOGGLE_STYLE,
  CMD_TOGGLE_NEVER_TRANSLATE,
  CMD_OPEN_OPTIONS,
  CLIENT_THUNDERBIRD,
  MSG_SET_LOGLEVEL,
  MSG_CLEAR_CACHES,
  PORT_STREAM_FETCH,
  MSG_UPDATE_ICON,
  MSG_SHA256,
  MSG_TOGGLE_NEVER_TRANSLATE,
  MSG_TRANS_TOGGLE_NEVER_TRANSLATE,
} from "./config";
import {
  getSettingWithDefault,
  tryInitDefaultData,
  runDataMigration,
} from "./libs/storage";
import { fetchHandle, fetchStreamNative } from "./libs/fetch";
import { tryClearCaches, getHttpCache, putHttpCache } from "./libs/cache";
import { sendTabMsg } from "./libs/msg";
import { trySyncAllSubRules } from "./libs/subRules";
import { saveRule, toggleSiteExclusion } from "./libs/rules";
import { getCurTabId } from "./libs/msg";
import { injectInlineJsBg, injectInternalCss } from "./libs/injector";
import { kissLog, logger } from "./libs/log";
import { chromeDetect, chromeTranslate } from "./libs/builtinAI";
import { sha256 } from "./libs/utils";

globalThis.__KISS_CONTEXT__ = "background";

/**
 * 根据前台翻译的激活状态更新浏览器插件栏图标。
 * @param {boolean} isActive 翻译器是否激活 (是否处于高亮彩色状态)
 * @param {number} tabId 目标标签页 ID
 */
async function updateIcon(isActive, tabId) {
  const suffix = isActive ? "_active" : "";
  const path = {
    16: `images/logo16${suffix}.png`,
    32: `images/logo32${suffix}.png`,
    48: `images/logo48${suffix}.png`,
    128: `images/logo128${suffix}.png`,
    192: `images/logo192${suffix}.png`,
  };
  try {
    // 兼容 MV3 (browser.action) 和 MV2 (browser.browserAction) 规范下的 Firefox 和 Chrome
    if (browser.action) {
      await browser.action.setIcon({ path, tabId });
    } else {
      await browser.browserAction.setIcon({ path, tabId });
    }
  } catch (err) {
    kissLog("updateIcon error", err);
  }
}

// declarativeNetRequest 动态规则的起始 ID 段，避免 ID 冲突
const CSP_RULE_START_ID = 1;
const ORI_RULE_START_ID = 10000;

/**
 * 从一个 URL 或域名字符串中提取可注册域名 (registrable domain, 即 eTLD+1)。
 * 例如 "https://dict.youdao.com/xxx" -> "youdao.com"。
 * 用于 DNR 的 excludedInitiatorDomains，使其能匹配目标站点的所有子域名页面。
 * @param {string} input URL 或域名（可不带协议）
 * @returns {string} 可注册域名；解析失败时返回空字符串
 */
function getRegistrableDomain(input) {
  try {
    const hostname = new URL(
      /^[a-z]+:\/\//i.test(input) ? input : `https://${input}`
    ).hostname;
    const labels = hostname.split(".").filter(Boolean);
    // 取最后两段作为可注册域名（足以覆盖有道等常见翻译源场景）
    return labels.length <= 2 ? hostname : labels.slice(-2).join(".");
  } catch (err) {
    kissLog("getRegistrableDomain error", err);
    return "";
  }
}
// 需要从 HTTP 响应头中移除的 CSP (Content-Security-Policy) 键名，用以允许加载第三方翻译接口脚本/发送翻译请求
const CSP_REMOVE_HEADERS = [
  `content-security-policy`,
  `content-security-policy-report-only`,
  `x-webkit-csp`,
  `x-content-security-policy`,
];

/**
 * 动态更新浏览器的 CSP (Content Security Policy) 和跨域 Origin 修改策略。
 * 利用 Chrome MV3 declarativeNetRequest (DNR) 动态配置规则，
 * 实现“剥离第三方 CSP 限制”和“伪装 Origin 请求头以绕过跨域防护”的能力。
 * @param {Object} params
 * @param {Array<string>|string} params.csplist 需移除 CSP 响应头的域名规则列表
 * @param {Array<string>|string} params.orilist 需伪装 Origin 请求头的请求过滤列表
 */
async function updateCspRules({ csplist, orilist }) {
  try {
    // 1. 获取当前所有已注册的动态 DNR 规则
    const oldRules = await browser.declarativeNetRequest.getDynamicRules();

    const rulesToAdd = [];
    const idsToRemove = [];

    // 2. 构造并处理 CSP 移除过滤规则
    if (csplist !== undefined) {
      let processedCspList = csplist;
      if (typeof processedCspList === "string") {
        processedCspList = processedCspList
          .split(/\n|,/)
          .map((url) => url.trim())
          .filter(Boolean);
      }

      // 获取所有属于 CSP 段的旧规则 ID，准备予以清理
      const oldCspRuleIds = oldRules
        .filter(
          (rule) => rule.id >= CSP_RULE_START_ID && rule.id < ORI_RULE_START_ID
        )
        .map((rule) => rule.id);
      idsToRemove.push(...oldCspRuleIds);

      // 为每个目标 url 分配新的规则 ID 并构造 removeHeaders 行动
      const newCspRules = processedCspList.map((url, index) => ({
        id: CSP_RULE_START_ID + index,
        action: {
          type: "modifyHeaders",
          responseHeaders: CSP_REMOVE_HEADERS.map((header) => ({
            operation: "remove",
            header,
          })),
        },
        condition: {
          urlFilter: url,
          resourceTypes: ["main_frame", "sub_frame"],
        },
      }));
      rulesToAdd.push(...newCspRules);
    }

    // 3. 构造并处理 Origin 请求头重写伪装规则
    if (orilist !== undefined) {
      let processedOriList = orilist;
      if (typeof processedOriList === "string") {
        processedOriList = processedOriList
          .split(/\n|,/)
          .map((url) => url.trim())
          .filter(Boolean);
      }

      // 获取所有属于 Origin 修改段的旧规则 ID，准备清理
      const oldOriRuleIds = oldRules
        .filter((rule) => rule.id >= ORI_RULE_START_ID)
        .map((rule) => rule.id);
      idsToRemove.push(...oldOriRuleIds);

      // 将发往特定翻译源的 xmlhttprequest 请求的 Origin 修改为目标源域名，伪装成同源请求
      const newOriRules = processedOriList.map((url, index) => {
        const condition = {
          urlFilter: url,
          resourceTypes: ["xmlhttprequest"],
        };

        // 仅对“非目标站点本身”的页面发起的请求伪装 Origin。
        // 否则会篡改用户在目标站点（如有道）自身页面上发出的请求的 Origin，
        // 反而触发该站点的跨域校验失败 (CORS AllowOriginMismatch)。详见 issue #759。
        const initiatorDomain = getRegistrableDomain(url);
        if (initiatorDomain) {
          condition.excludedInitiatorDomains = [initiatorDomain];
        }

        return {
          id: ORI_RULE_START_ID + index,
          action: {
            type: "modifyHeaders",
            requestHeaders: [
              { header: "Origin", operation: "set", value: url },
            ],
          },
          condition,
        };
      });
      rulesToAdd.push(...newOriRules);
    }

    // REVIEW: 批量更新 DNR 规则。在部分不支持 MV3 动态规则的旧浏览器（如旧版 Firefox）中可能会抛错，
    // 在 catch 中已做了捕获处理，能够保障基础功能的正常工作，但无法去除 CSP 限制。
    if (idsToRemove.length > 0 || rulesToAdd.length > 0) {
      await browser.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: idsToRemove,
        addRules: rulesToAdd,
      });
    }
  } catch (err) {
    kissLog("update csp rules", err);
  }
}

/**
 * 在 Thunderbird (雷鸟邮件客户端) 中注册脚本，实现邮件正文区域的注入翻译。
 */
async function registerMsgDisplayScript() {
  await messenger.messageDisplayScripts.register({
    js: [{ file: "/content.js" }],
  });
}

/**
 * 适配并转换当前浏览器的 UI 显示语言，映射为本项目支持的语言键名。
 * @returns {Promise<string>} 本项目识别的语言简写 (zh_TW / zh / ja / ko / en)
 */
async function getUiLanguage() {
  try {
    const lang = await browser.i18n.getUILanguage();

    if (lang === "zh-TW") {
      return "zh_TW";
    } else if (lang && lang.startsWith("zh")) {
      return "zh";
    } else {
      return "zh";
    }
  } catch (err) {
    kissLog("get UI language error", err);
    return "zh";
  }
}

/**
 * 监听扩展安装/升级事件 (onInstalled)。
 * 此时触发数据库默认初始化、右键菜单生成、CSP 网络过滤器注册、以及拉取网络订阅规则。
 */
browser.runtime.onInstalled.addListener(async (details) => {
  const uiLang = await getUiLanguage();
  await tryInitDefaultData(uiLang);
  if (details?.reason === "update") {
    await runDataMigration();
  }

  // 在 Thunderbird 场景下注册特定的邮件脚本
  if (process.env.REACT_APP_CLIENT === CLIENT_THUNDERBIRD) {
    registerMsgDisplayScript();
  }

  const { csplist, orilist, subrulesList } = await getSettingWithDefault();

  updateCspRules({ csplist, orilist });
  trySyncAllSubRules({ subrulesList });
});

/**
 * 监听浏览器/扩展启动事件 (onStartup)。
 * 此时从本地恢复日志级别、清空不需要的翻译长缓存，并与云端同步设置、本地规则与订阅规则。
 */
browser.runtime.onStartup.addListener(async () => {
  const { clearCache, subrulesList, csplist, orilist, logLevel } =
    await getSettingWithDefault();

  logger.setLevel(logLevel);

  if (clearCache) {
    tryClearCaches();
  }

  if (process.env.REACT_APP_CLIENT === CLIENT_THUNDERBIRD) {
    registerMsgDisplayScript();
  }

  updateCspRules({ csplist, orilist });
  trySyncAllSubRules({ subrulesList });
});

/**
 * 辅助函数：向前台当前活动标签页的所有框架 (Frames) 中注入指定的 JS 脚本或样式逻辑。
 * @param {Function} func 待注入的函数
 * @param {*} args 传递给注入函数的入参
 */
const injectToCurrentTab = async (func, args) => {
  const tabId = await getCurTabId();
  return browser.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: func,
    args: [args],
    world: "MAIN", // 运行在前台页面的真实主环境 (MAIN world)，而非隔离环境 (ISOLATED)
  });
};

// 后台消息指令与对应处理器映射表
const messageHandlers = {
  [MSG_FETCH]: (args) => fetchHandle(args), // 跨域请求代理
  [MSG_GET_HTTPCACHE]: (args) => getHttpCache(args), // 读取翻译 HTTP 缓存
  [MSG_PUT_HTTPCACHE]: (args) => putHttpCache(args), // 存入翻译 HTTP 缓存
  [MSG_SHA256]: ({ text = "", salt = "" } = {}) => sha256(text, salt), // 代算缓存签名
  [MSG_OPEN_OPTIONS]: () => browser.runtime.openOptionsPage(), // 打开设置选项页
  [MSG_SAVE_RULE]: (args) => saveRule(args), // 写入/保存规则
  [MSG_TOGGLE_NEVER_TRANSLATE]: (args) =>
    toggleSiteExclusion(args?.hostname || args?.url), // 切换网站永久不翻译
  [MSG_INJECT_JS]: (args) => injectToCurrentTab(injectInlineJsBg, args), // 注入 JS 代码到前台
  [MSG_INJECT_CSS]: (args) => injectToCurrentTab(injectInternalCss, args), // 注入 CSS 样式到前台
  [MSG_UPDATE_CSP]: (args) => updateCspRules(args), // 触发 CSP 重写规则变更
  [MSG_COMMAND_SHORTCUTS]: () => browser.commands.getAll(), // 获取 manifest 注册的所有快捷键
  [MSG_BUILTINAI_DETECT]: (args) => chromeDetect(args), // 触发 Chrome 127+ 内置 Gemini AI 语言检测
  [MSG_BUILTINAI_TRANSLATE]: (args) => chromeTranslate(args), // 触发 Chrome 内置 AI 翻译接口
  [MSG_SET_LOGLEVEL]: (args) => logger.setLevel(args), // 修改运行时的日志记录等级
  [MSG_CLEAR_CACHES]: () => tryClearCaches(), // 清空翻译缓存
  [MSG_UPDATE_ICON]: (args, sender) => updateIcon(args, sender?.tab?.id), // 变更页面的插件高亮图标
};

/**
 * 注册全局统一的 runtime.onMessage 消息通道监听器。
 */
browser.runtime.onMessage.addListener(async ({ action, args }, sender) => {
  const handler = messageHandlers[action];
  if (!handler) {
    throw new Error(`Message action is unavailable: ${action}`);
  }

  // 执行对应的处理器并回传结果给发送方 (Content Script / Popup)
  return handler(args, sender);
});

/**
 * 监听浏览器系统快捷键事件 (browser.commands)。
 * 用户在 manifest 中声明的快捷键按下时，后台直接将对应的翻译指令广播给前台 content 脚本。
 */
browser.commands?.onCommand?.addListener?.((command) => {
  switch (command) {
    case CMD_TOGGLE_TRANSLATE:
      sendTabMsg(MSG_TRANS_TOGGLE);
      break;
    case CMD_TOGGLE_TRANSLATE_ONLY:
      sendTabMsg(MSG_TRANS_TOGGLE_ONLY);
      break;
    case CMD_TOGGLE_STYLE:
      sendTabMsg(MSG_TRANS_TOGGLE_STYLE);
      break;
    case CMD_TOGGLE_NEVER_TRANSLATE:
      sendTabMsg(MSG_TRANS_TOGGLE_NEVER_TRANSLATE);
      break;
    case CMD_OPEN_OPTIONS:
      browser.runtime.openOptionsPage();
      break;
    default:
  }
});

/**
 * 专门处理 SSE/翻译大模型的流式数据请求通道。
 * 使用 for-await 逐帧读取流式 chunk，通过 port.postMessage 实时推送到前台，避免 onMessage 一次性通信无法传输流数据的限制。
 * @param {Port} port 专属长连接通信端口
 * @param {Object} args 流式请求参数 (包含接口 input, fetch 配置 init 等)
 */
async function handleStreamFetch(port, args) {
  const { input, init, opts } = args;
  const controller = new AbortController();
  let disconnected = false;
  const handleDisconnect = () => {
    disconnected = true;
    // 前台 Port 断开代表调用方已停止消费流，必须同步中止后台 fetch。
    controller.abort();
  };
  port.onDisconnect.addListener(handleDisconnect);

  try {
    for await (const chunk of fetchStreamNative(input, init, {
      httpTimeout: opts.httpTimeout,
      signal: controller.signal,
    })) {
      if (disconnected) break;
      // 实时向发送端传送当前收到的流式增量文本块
      port.postMessage({ type: "delta", data: chunk });
    }
    // 只有 Port 仍连接时才发送完成信号，避免断开后继续 postMessage。
    if (!disconnected) {
      port.postMessage({ type: "done" });
    }
  } catch (error) {
    // 过滤用户主动取消导致的 AbortError，保留真正的上游请求错误。
    if (error.name !== "AbortError") {
      if (!disconnected) {
        port.postMessage({ type: "error", error: error.message });
      }
    }
  } finally {
    port.onDisconnect.removeListener?.(handleDisconnect);
  }
}

/**
 * 监听 runtime.onConnect 连接事件。
 * 筛选流式专属端口名 PORT_STREAM_FETCH，监听 start 开始指令并启动 handleStreamFetch 异步流处理程序。
 */
browser.runtime.onConnect.addListener((port) => {
  if (port.name === PORT_STREAM_FETCH) {
    port.onMessage.addListener((message) => {
      if (message.action === "start") {
        handleStreamFetch(port, message.args);
      }
    });
  }
});
