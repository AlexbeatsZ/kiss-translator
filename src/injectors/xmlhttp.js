/**
 * XMLHttpRequest 拦截注入器
 * 主要用于重写原生的 XMLHttpRequest.prototype.open，拦截页面中的特定请求（例如 YouTube 的 `timedtext` 歌词/字幕接口）。
 * 拦截成功后，它会监听加载事件，并通过安全信道将字幕原始响应文本派发给上层 Content Script，以实现视频/音频双语字幕渲染。
 */
export const XMLHttpRequestInjector = () => {
  try {
    if (XMLHttpRequest.prototype.open.kissSubtitleInterceptor) return;
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalFetch = window.fetch;
    const listeners = new WeakMap();
    let sawCaptionRequest = false;
    const captionUrl = (input) => {
      try {
        const url = new URL(
          typeof input === "string" ? input : input?.url || input?.href,
          window.location.href
        );
        return url.origin === window.location.origin &&
          url.pathname === "/api/timedtext"
          ? url.href
          : null;
      } catch {
        return null;
      }
    };
    const publish = (url, response, status, contentType, retryAfter) => {
      window.postMessage(
        {
          type: "KISS_XHR_DATA_YOUTUBE",
          url,
          response,
          status,
          contentType,
          retryAfter,
        },
        window.location.origin
      );
    };
    const publishFetch = (request, url) => {
      request
        .then((response) => {
          const copy = response.clone();
          return copy
            .text()
            .then((text) =>
              publish(
                response.url || url,
                text,
                response.status,
                response.headers.get("Content-Type"),
                response.headers.get("Retry-After")
              )
            );
        })
        .catch(() => {});
    };
    XMLHttpRequest.prototype.open = function (...args) {
      const previous = listeners.get(this);
      if (previous) this.removeEventListener("load", previous);
      const url = captionUrl(args[1]);
      if (url) {
        sawCaptionRequest = true;
        const listener = function () {
          try {
            const response =
              this.responseType === "json"
                ? JSON.stringify(this.response)
                : this.responseText;
            publish(
              this.responseURL || url,
              response,
              this.status,
              this.getResponseHeader("Content-Type"),
              this.getResponseHeader("Retry-After")
            );
          } catch {
            // Other response types must not break the player's own load listeners.
          }
        };
        listeners.set(this, listener);
        this.addEventListener("load", listener);
      }
      return originalOpen.apply(this, args);
    };
    XMLHttpRequest.prototype.open.kissSubtitleInterceptor = true;
    if (typeof originalFetch === "function") {
      window.fetch = function (...args) {
        const request = originalFetch.apply(this, args);
        const url = captionUrl(args[0]);
        if (url) {
          sawCaptionRequest = true;
          publishFetch(request, url);
        }
        return request;
      };

      // Tampermonkey starts at document-end. Recover one request that completed
      // before interception, preserving the player's signed URL and PO token.
      Promise.resolve()
        .then(() => {
          if (sawCaptionRequest) return;
          const videoId = new URL(window.location.href).searchParams.get("v");
          if (!videoId) return;
          const entries =
            window.performance?.getEntriesByType?.("resource") || [];
          const entry = [...entries].reverse().find(({ name }) => {
            const url = captionUrl(name);
            return url && new URL(url).searchParams.get("v") === videoId;
          });
          if (entry)
            publishFetch(originalFetch.call(window, entry.name), entry.name);
        })
        .catch(() => {});
    }
  } catch (err) {
    console.log("XMLHttpRequestInjector", err);
  }
};
