import { logger } from "../libs/log.js";
import { downloadBlobFile } from "../libs/utils.js";
import { buildBilingualVtt } from "./vtt.js";

const PANEL_ID = "kiss-youtube-subtitle-list-container";

/** A focused bilingual timeline for YouTube subtitles. */
export class YouTubeSubtitleList {
  constructor(videoElement, i18n = () => "") {
    this.videoEl = videoElement;
    this.i18n = i18n;
    this.bilingualSubtitles = [];
    this.rawSubtitleEvents = [];
    this.subtitleProgress = 0;
    this.container = null;
    this.subtitleTabEl = null;
    this.subtitleListEl = null;
    this.subtitleScrollContainer = null;
    this._cachedSubtitleItems = [];
    this._lastActiveIndex = -1;
    this._autoScroll = true;
    this._resizeObserver = null;
    this._boundTimeUpdate = this._handleTimeUpdate.bind(this);
    this._boundResize = this._syncContainerHeightToPlayer.bind(this);
    this._boundMouseEnter = () => {
      this._autoScroll = false;
    };
    this._boundMouseLeave = () => {
      this._autoScroll = true;
    };
  }

  initialize(subtitles, rawSubtitleEvents = [], progressed = 100) {
    this.bilingualSubtitles = Array.isArray(subtitles) ? subtitles : [];
    this.rawSubtitleEvents = Array.isArray(rawSubtitleEvents)
      ? rawSubtitleEvents
      : [];
    this.subtitleProgress = this._normalizeProgress(progressed);
    this._ensureContainer();
    this._renderVirtualSubtitles(true);
    this._updateSubtitleTabLabel();
    this._syncContainerHeightToPlayer();
    this._observePlayerSize();
  }

  setBilingualSubtitles(subtitles, progressed = this.subtitleProgress) {
    this.bilingualSubtitles = Array.isArray(subtitles) ? subtitles : [];
    this.subtitleProgress = this._normalizeProgress(progressed);
    this._updateSubtitleTabLabel();
    this._renderVirtualSubtitles(true);
  }

  updateBilingualSubtitles() {
    this._renderVirtualSubtitles(true);
  }

  updateSingleSubtitle(subtitleUpdate) {
    if (!subtitleUpdate) return;
    const index = this._findSubtitleIndexByStart(subtitleUpdate.start);
    if (index < 0) return;

    this.bilingualSubtitles[index] = {
      ...this.bilingualSubtitles[index],
      ...subtitleUpdate,
    };
    const item = this._cachedSubtitleItems[index];
    if (!item) return;
    const subtitle = this.bilingualSubtitles[index];
    const original = item.querySelector(".kiss-youtube-original");
    const translation = item.querySelector(".kiss-youtube-translation");
    if (original) original.textContent = subtitle.text || "";
    if (translation) translation.textContent = subtitle.translation || "…";
  }

  turnOnAutoSub() {
    this.videoEl?.removeEventListener("timeupdate", this._boundTimeUpdate);
    this.videoEl?.addEventListener("timeupdate", this._boundTimeUpdate);
    this._handleTimeUpdate();
  }

  turnOffAutoSub() {
    this.videoEl?.removeEventListener("timeupdate", this._boundTimeUpdate);
  }

  destroy() {
    this.turnOffAutoSub();
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    window.removeEventListener("resize", this._boundResize);
    this.subtitleScrollContainer?.removeEventListener(
      "mouseenter",
      this._boundMouseEnter
    );
    this.subtitleScrollContainer?.removeEventListener(
      "mouseleave",
      this._boundMouseLeave
    );
    this.container?.remove();
    this.container = null;
    this.subtitleTabEl = null;
    this.subtitleListEl = null;
    this.subtitleScrollContainer = null;
    this._cachedSubtitleItems = [];
    this._lastActiveIndex = -1;
  }

  _ensureContainer() {
    document.getElementById(PANEL_ID)?.remove();

    const container = document.createElement("section");
    container.id = PANEL_ID;
    container.setAttribute(
      "aria-label",
      this._t("bilingual_subtitles", "Bilingual subtitles")
    );
    container.style.cssText = [
      "--kt-paper:#0F131B",
      "--kt-surface-raised:#171D28",
      "--kt-surface-hover:#1E2636",
      "--kt-ink:#F1F5F9",
      "--kt-muted:#94A3B8",
      "--kt-rule:#252E3E",
      "--kt-source:#94A3B8",
      "--kt-translation:#7C9CFF",
      "--kt-active-bg:rgba(124, 156, 255, 0.14)",
      "display:flex",
      "flex-direction:column",
      "width:100%",
      "min-height:240px",
      "overflow:hidden",
      "border:1px solid var(--kt-rule)",
      "border-radius:10px",
      "background:var(--kt-paper)",
      "color:var(--kt-ink)",
      "font-family:'Segoe UI Variable',Aptos,'Noto Sans SC','Microsoft YaHei UI',sans-serif",
      "box-sizing:border-box",
      "box-shadow:0 4px 20px rgba(0,0,0,0.35)",
    ].join(";");

    const header = document.createElement("header");
    header.style.cssText =
      "display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--kt-rule);background:var(--kt-surface-raised);";
    const marker = document.createElement("span");
    marker.setAttribute("aria-hidden", "true");
    marker.style.cssText =
      "width:4px;height:24px;border-radius:3px;background:var(--kt-translation);";
    this.subtitleTabEl = document.createElement("strong");
    this.subtitleTabEl.style.cssText =
      "flex:1;font-size:15px;font-weight:650;color:var(--kt-ink);letter-spacing:-0.01em;";
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "×";
    closeButton.title = this._t("close", "Close panel");
    closeButton.setAttribute("aria-label", closeButton.title);
    closeButton.style.cssText =
      "border:0;background:transparent;color:var(--kt-muted);font-size:22px;line-height:1;cursor:pointer;padding:2px 6px;border-radius:4px;transition:color 0.15s,background 0.15s;";
    closeButton.addEventListener("mouseenter", () => {
      closeButton.style.color = "var(--kt-ink)";
      closeButton.style.background = "var(--kt-surface-hover)";
    });
    closeButton.addEventListener("mouseleave", () => {
      closeButton.style.color = "var(--kt-muted)";
      closeButton.style.background = "transparent";
    });
    closeButton.addEventListener("click", () => this.destroy());
    header.append(marker, this.subtitleTabEl, closeButton);

    const actions = document.createElement("div");
    actions.style.cssText =
      "display:flex;gap:8px;padding:8px 14px;border-bottom:1px solid var(--kt-rule);background:var(--kt-paper);";
    actions.append(
      this._createActionButton(
        this._t("download_subtitles_vtt", "Download subtitles (VTT)"),
        () => this.downloadSubtitles()
      ),
      this._createActionButton(
        this._t(
          "download_raw_subtitle_events_json",
          "Download source data (JSON)"
        ),
        () => this.downloadRawSubtitleEvents()
      )
    );

    this.subtitleScrollContainer = document.createElement("div");
    this.subtitleScrollContainer.style.cssText =
      "flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--kt-rule) transparent;";
    this.subtitleScrollContainer.addEventListener(
      "mouseenter",
      this._boundMouseEnter
    );
    this.subtitleScrollContainer.addEventListener(
      "mouseleave",
      this._boundMouseLeave
    );
    this.subtitleListEl = document.createElement("ol");
    this.subtitleListEl.style.cssText =
      "list-style:none;margin:0;padding:0;contain:layout style;";
    this.subtitleScrollContainer.appendChild(this.subtitleListEl);
    container.append(header, actions, this.subtitleScrollContainer);

    const mount = document.querySelector("#secondary-inner") || document.body;
    mount.prepend(container);
    this.container = container;
  }

  _createActionButton(label, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.style.cssText =
      "min-height:28px;padding:4px 10px;border:1px solid var(--kt-rule);border-radius:6px;background:var(--kt-surface-raised);color:var(--kt-ink);font:inherit;font-size:11px;font-weight:500;cursor:pointer;transition:background 0.15s,border-color 0.15s;";
    button.addEventListener("mouseenter", () => {
      button.style.background = "var(--kt-surface-hover)";
      button.style.borderColor = "var(--kt-translation)";
    });
    button.addEventListener("mouseleave", () => {
      button.style.background = "var(--kt-surface-raised)";
      button.style.borderColor = "var(--kt-rule)";
    });
    button.addEventListener("click", onClick);
    return button;
  }

  _renderVirtualSubtitles() {
    if (!this.subtitleListEl) return;
    const fragment = document.createDocumentFragment();
    this._cachedSubtitleItems = this.bilingualSubtitles.map(
      (subtitle, index) => {
        const item = document.createElement("li");
        item.className = "kiss-youtube-item";
        item.dataset.index = String(index);
        item.style.cssText =
          "display:grid;grid-template-columns:52px 1fr;gap:10px;padding:10px 14px;border-bottom:1px solid var(--kt-rule);transition:background-color 140ms ease;";

        const time = document.createElement("button");
        time.type = "button";
        time.textContent = this.millisToMinutesAndSeconds(subtitle.start || 0);
        time.title = this._t("jump_to_subtitle", "Jump to subtitle");
        time.style.cssText =
          "align-self:start;border:0;background:transparent;color:var(--kt-muted);font-family:'JetBrains Mono','Cascadia Mono',monospace;font-size:11px;cursor:pointer;text-align:left;padding:2px 0;transition:color 0.15s;";
        time.addEventListener("mouseenter", () => {
          time.style.color = "var(--kt-translation)";
        });
        time.addEventListener("mouseleave", () => {
          time.style.color = "var(--kt-muted)";
        });
        time.addEventListener("click", () =>
          this.jumpToTime(subtitle.start, index)
        );

        const text = document.createElement("div");
        const original = document.createElement("div");
        original.className = "kiss-youtube-original";
        original.textContent = subtitle.text || "";
        original.style.cssText =
          "color:var(--kt-source);font-size:13px;line-height:1.5;word-break:break-word;";
        const translation = document.createElement("div");
        translation.className = "kiss-youtube-translation";
        translation.textContent = subtitle.translation || "…";
        translation.style.cssText =
          "margin-top:4px;color:var(--kt-translation);font-size:13px;line-height:1.5;font-weight:600;word-break:break-word;";
        text.append(original, translation);
        item.append(time, text);
        fragment.appendChild(item);
        return item;
      }
    );
    this.subtitleListEl.replaceChildren(fragment);
    this._lastActiveIndex = -1;
    this._handleTimeUpdate();
  }

  jumpToTime(timeMs, exactIndex = null) {
    if (!this.videoEl) return;
    this.videoEl.currentTime = Math.max(0, Number(timeMs) || 0) / 1000;
    const index = exactIndex ?? this._binarySearchSubtitle(Number(timeMs) || 0);
    this._setActiveSubtitle(index, true);
  }

  _handleTimeUpdate() {
    const timeMs = (this.videoEl?.currentTime || 0) * 1000;
    this._setActiveSubtitle(
      this._binarySearchSubtitle(timeMs),
      this._autoScroll
    );
  }

  _setActiveSubtitle(index, shouldScroll = false) {
    if (index === this._lastActiveIndex) return;
    if (this._lastActiveIndex >= 0) {
      const previous = this._cachedSubtitleItems[this._lastActiveIndex];
      if (previous) {
        previous.style.background = "transparent";
        previous.removeAttribute("aria-current");
      }
    }
    this._lastActiveIndex = index;
    const current = this._cachedSubtitleItems[index];
    if (!current) return;
    current.style.background =
      "var(--kt-active-bg, rgba(124, 156, 255, 0.14))";
    current.setAttribute("aria-current", "true");
    if (shouldScroll) {
      current.scrollIntoView?.({ block: "center", behavior: "smooth" });
    }
  }

  _binarySearchSubtitle(timeMs) {
    let low = 0;
    let high = this.bilingualSubtitles.length - 1;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const subtitle = this.bilingualSubtitles[middle];
      if (timeMs < subtitle.start) high = middle - 1;
      else if (timeMs > subtitle.end) low = middle + 1;
      else return middle;
    }
    return -1;
  }

  _findSubtitleIndexByStart(start) {
    return this.bilingualSubtitles.findIndex(
      (subtitle) => Number(subtitle.start) === Number(start)
    );
  }

  _observePlayerSize() {
    window.removeEventListener("resize", this._boundResize);
    window.addEventListener("resize", this._boundResize);
    const player = this._getPlayerElement();
    if (typeof ResizeObserver === "function" && player) {
      this._resizeObserver?.disconnect();
      this._resizeObserver = new ResizeObserver(this._boundResize);
      this._resizeObserver.observe(player);
    }
  }

  _getPlayerElement() {
    return (
      this.videoEl?.closest?.(".html5-video-player") ||
      this.videoEl?.parentElement
    );
  }

  _syncContainerHeightToPlayer() {
    if (!this.container) return;
    const height = this._getPlayerElement()?.getBoundingClientRect?.().height;
    if (height > 0) {
      this.container.style.height = `${height}px`;
      this.container.style.maxHeight = `${height}px`;
    }
  }

  _normalizeProgress(progressed) {
    const value = Number(progressed);
    return Number.isFinite(value)
      ? Math.min(100, Math.max(0, Math.round(value)))
      : 0;
  }

  _updateSubtitleTabLabel() {
    if (!this.subtitleTabEl) return;
    const label = this._t("bilingual_subtitles", "Bilingual subtitles");
    this.subtitleTabEl.textContent = `${label} [${this.subtitleProgress}%]`;
  }

  _t(key, fallback) {
    return this.i18n?.(key) || fallback;
  }

  downloadSubtitles() {
    if (this.bilingualSubtitles.length === 0) return;
    try {
      downloadBlobFile(
        buildBilingualVtt(this.bilingualSubtitles),
        `kiss-subtitles-${this._getYouTubeVideoId()}_${Date.now()}.vtt`
      );
    } catch (error) {
      logger.error("Youtube Provider: download subtitles error:", error);
    }
  }

  downloadRawSubtitleEvents() {
    if (this.rawSubtitleEvents.length === 0) return;
    try {
      downloadBlobFile(
        JSON.stringify(this.rawSubtitleEvents, null, 2),
        `kiss-subtitles-raw-${this._getYouTubeVideoId()}_${Date.now()}.json`
      );
    } catch (error) {
      logger.error("Youtube Provider: download raw subtitles error:", error);
    }
  }

  millisToMinutesAndSeconds(millis) {
    const seconds = Math.max(0, Math.floor((Number(millis) || 0) / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }

  _getYouTubeVideoId() {
    try {
      return new URL(window.location.href).searchParams.get("v") || "video";
    } catch {
      return "video";
    }
  }
}
