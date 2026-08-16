import { browser } from "./browser";

/**
 * 获取当前用户正在浏览且聚焦的活跃标签页 (Tab) 信息。
 * @returns {Promise<Object|undefined>} 活跃的标签页对象
 */
export const getCurTab = async () => {
  const [tab] = await browser.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  return tab;
};

/**
 * 获取当前活跃标签页的 ID。
 * @returns {Promise<number|undefined>} 标签页 ID
 */
export const getCurTabId = async () => {
  const tab = await getCurTab();
  return tab?.id;
};

/**
 * 向扩展后台 Service Worker (Background) 发送单向或双向消息。
 * REVIEW: 该方法依赖 `browser?.runtime` API，只能在浏览器扩展环境（Content Script, Popup, Options 等）下工作。
 * 在油猴 Userscript 环境中不可使用（油猴需使用特定 GM 接口或 CustomEvent 传递信息）。
 * @param {string} action 指令动作名称
 * @param {Object} args 指令参数数据
 * @returns {Promise<*>} 后台响应的数据
 */
export const sendBgMsg = async (action, args) => {
  try {
    if (globalThis.chrome?.runtime && !globalThis.chrome.runtime.id) {
      return;
    }
    return await browser?.runtime?.sendMessage({ action, args });
  } catch (err) {
    if (
      err?.message?.includes("Extension context invalidated") ||
      err?.message?.includes("Could not establish connection") ||
      err?.message?.includes("Receiving end does not exist")
    ) {
      return;
    }
    throw err;
  }
};

/**
 * 向当前活跃页面标签发送通信消息。
 * @param {string} action 指令动作名称
 * @param {Object} args 指令参数数据
 * @returns {Promise<*>} 页面 Content Script 接收处理后的响应数据
 */
export const sendTabMsg = async (action, args) => {
  try {
    const tabId = await getCurTabId();
    if (!tabId) return;

    return await browser.tabs.sendMessage(tabId, { action, args });
  } catch (err) {
    if (
      err?.message?.includes("Could not establish connection") ||
      err?.message?.includes("Receiving end does not exist") ||
      err?.message?.includes("Extension context invalidated")
    ) {
      return;
    }
    throw err;
  }
};
