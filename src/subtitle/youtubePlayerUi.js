/**
 * YouTube 播放器 UI 层。
 * 负责控制原生字幕窗口位移避免遮挡，以及展示播放器顶部通知气泡。
 */

export const VIDEO_SELECTOR = "#container video";
export const YT_CAPTION_SELECTOR = "#ytp-caption-window-container";
export const YT_AD_SELECTOR = ".video-ads";
export const YT_SUBTITLE_BUTTON_SELECTOR = "button.ytp-subtitles-button";

/**
 * 异步等待目标 DOM 元素挂载并执行回调。
 *
 * @param {string} selector CSS 选择器。
 * @param {function(HTMLElement): void} callback 找到元素后的回调函数。
 * @returns {void}
 */
export function waitForElement(selector, callback) {
  const element = document.querySelector(selector);
  if (element) {
    callback(element);
    return;
  }

  const observer = new MutationObserver((mutations, obs) => {
    const targetNode = document.querySelector(selector);
    if (targetNode) {
      obs.disconnect();
      callback(targetNode);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * 管理 YouTube 播放器上的通知和原生字幕隐藏。
 */
export class YouTubePlayerUi {
  #getSetting;
  #getVideoEl;
  #notificationEl = null;
  #notificationTimeout = null;

  /**
   * 创建播放器 UI 管理器。
   *
   * @param {object} param0 参数对象。
   * @param {Function} param0.getSetting 获取当前字幕设置的函数。
   * @param {Function} param0.getVideoEl 获取当前 video DOM 的函数。
   */
  constructor({ getSetting, getVideoEl }) {
    this.#getSetting = getSetting;
    this.#getVideoEl = getVideoEl;
  }

  /**
   * 将 YouTube 原生字幕窗口隐藏，避免与双语字幕重叠。
   * 结合 DOM inline style 与带 !important 的全局样式标签，防止 YouTube 内部渲染器重绘时覆盖。
   *
   * @returns {void}
   */
  hideYtCaption() {
    const ytCaption = document.querySelector(YT_CAPTION_SELECTOR);
    if (ytCaption) {
      ytCaption.style.top = "-10000px";
    }
    const styleId = "kiss-hide-yt-caption-style";
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.textContent = `
        ${YT_CAPTION_SELECTOR} {
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
          top: -10000px !important;
        }
      `;
      (document.head || document.documentElement).appendChild(styleEl);
    }
  }

  /**
   * 恢复 YouTube 原生字幕窗口的位置与可见性。
   *
   * @returns {void}
   */
  showYtCaption() {
    const ytCaption = document.querySelector(YT_CAPTION_SELECTOR);
    if (ytCaption) {
      ytCaption.style.top = "0";
    }
    const styleEl = document.getElementById("kiss-hide-yt-caption-style");
    if (styleEl) {
      styleEl.remove();
    }
  }

  /**
   * 创建并插入播放器上方通知气泡。
   *
   * @returns {void}
   */
  createNotificationElement() {
    const notificationEl = document.createElement("div");
    notificationEl.className = "kiss-notification";
    Object.assign(notificationEl.style, {
      position: "absolute",
      top: "16px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(15, 19, 27, 0.88)",
      backdropFilter: "blur(8px)",
      border: "1px solid rgba(255, 255, 255, 0.12)",
      color: "#F1F5F9",
      padding: "8px 14px",
      borderRadius: "8px",
      zIndex: "2147483647",
      opacity: "0",
      transition: "opacity 0.25s ease-in-out",
      pointerEvents: "none",
      fontSize: "14px",
      fontWeight: "500",
      lineHeight: "1.4",
      width: "auto",
      maxWidth: "min(360px, calc(100% - 32px))",
      textAlign: "left",
      boxSizing: "border-box",
      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
    });

    const videoEl = this.#getVideoEl();
    const videoContainer = videoEl?.parentElement?.parentElement;
    if (videoContainer) {
      videoContainer.appendChild(notificationEl);
      this.#notificationEl = notificationEl;
    }
  }

  /**
   * 隐藏当前通知气泡。
   *
   * @returns {void}
   */
  hideNotification() {
    clearTimeout(this.#notificationTimeout);
    if (this.#notificationEl) {
      this.#notificationEl.style.opacity = "0";
    }
  }

  /**
   * 展现通知气泡，支持传入自定义停留展示时长。
   *
   * @param {string} message 通知文案。
   * @param {number} [duration=2000] 停留展示时长，单位毫秒。
   * @returns {void}
   */
  showNotification(message, duration = 2000) {
    if (this.#getSetting().showLoadNotification === false) {
      this.hideNotification();
      return;
    }

    if (!this.#notificationEl) this.createNotificationElement();
    if (!this.#notificationEl) return;

    this.#notificationEl.textContent = message;
    this.#notificationEl.style.opacity = "1";
    clearTimeout(this.#notificationTimeout);
    this.#notificationTimeout = setTimeout(() => {
      this.hideNotification();
    }, duration);
  }

  /**
   * 销毁通知并清理定时器
   *
   * @returns {void}
   */
  destroy() {
    this.hideNotification();
    this.#notificationEl?.remove();
    this.#notificationEl = null;
  }
}
