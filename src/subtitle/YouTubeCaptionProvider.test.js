import { YouTubeCaptionProvider } from "./YouTubeCaptionProvider";
import { getCaptionTracks } from "./youtubeCaptionTracks";
import { BilingualSubtitleManager } from "./BilingualSubtitleManager";
import { YouTubePlayerUi } from "./youtubePlayerUi";
import { eventsToSubtitles } from "./youtubeAiSegmentation";

jest.mock("../libs/log", () => ({
  ...jest.requireActual("../libs/log"),
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("../apis/index", () => ({
  apiSubtitle: jest.fn(),
  apiSummarizeContext: jest.fn(),
}));
jest.mock("../apis/history", () => ({ clearMsgHistory: jest.fn() }));
jest.mock("../libs/docInfo", () => ({ getDocInfo: () => ({}) }));
jest.mock("../libs/utils", () => ({ downloadBlobFile: jest.fn() }));
jest.mock("../config", () => ({
  ...jest.requireActual("../config"),
  MSG_XHR_DATA_YOUTUBE: "KISS_XHR_DATA_YOUTUBE",
  API_SPE_TYPES: { ai: new Set() },
  newI18n: () => (key) => key,
}));
jest.mock("./youtubeCaptionTracks", () => ({
  ...jest.requireActual("./youtubeCaptionTracks"),
  getCaptionTracks: jest.fn(),
}));
jest.mock("./youtubeAiSegmentation", () => ({
  eventsToSubtitles: jest.fn(async () => [
    [{ start: 0, end: 5000, text: "Hello" }],
    100,
    null,
  ]),
}));
jest.mock("./BilingualSubtitleManager", () => ({
  BilingualSubtitleManager: jest.fn(),
}));
jest.mock("./youtubePlayerUi", () => ({
  ...jest.requireActual("./youtubePlayerUi"),
  waitForElement: jest.fn(),
  YouTubePlayerUi: jest.fn(),
}));

describe("YouTube caption acquisition lifecycle", () => {
  let listeners;
  let ui;
  let manager;
  const originalFetch = global.fetch;
  const flush = async () => {
    for (let i = 0; i < 15; i++) await Promise.resolve();
  };
  const send = async (
    videoId = "video-1",
    response = JSON.stringify({
      events: [
        { tStartMs: 100, dDurationMs: 5000, segs: [{ utf8: "Hello world." }] },
      ],
    }),
    status = 200,
    query = ""
  ) => {
    window.dispatchEvent(
      new MessageEvent("message", {
        source: window,
        origin: window.location.origin,
        data: {
          type: "KISS_XHR_DATA_YOUTUBE",
          url: `http://localhost/api/timedtext?v=${videoId}&lang=en&kind=asr${query}`,
          response,
          status,
        },
      })
    );
    await flush();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    eventsToSubtitles.mockResolvedValue([
      [{ start: 100, end: 5000, text: "Hello" }],
      100,
      null,
    ]);
    ui = {
      showNotification: jest.fn(),
      showYtCaption: jest.fn(),
      hideYtCaption: jest.fn(),
      destroy: jest.fn(),
    };
    manager = {
      start: jest.fn(),
      destroy: jest.fn(),
      repairChunkTranslations: jest.fn(),
    };
    YouTubePlayerUi.mockImplementation(() => ui);
    BilingualSubtitleManager.mockImplementation(() => manager);
    window.history.replaceState({}, "", "/watch?v=video-1");
    document.body.innerHTML =
      '<div id="container"><div><video></video></div></div><button class="ytp-subtitles-button" aria-pressed="true"></button>';
    listeners = [];
    const add = window.addEventListener.bind(window);
    jest
      .spyOn(window, "addEventListener")
      .mockImplementation((name, fn, ...args) => {
        listeners.push([name, fn]);
        add(name, fn, ...args);
      });
    new YouTubeCaptionProvider({ toLang: "zh-CN" }).initialize();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    for (const [name, fn] of listeners) window.removeEventListener(name, fn);
    window.addEventListener.mockRestore();
  });

  test("starts from captured captions even when watch-page metadata is unavailable", async () => {
    await send();
    expect(getCaptionTracks).not.toHaveBeenCalled();
    expect(manager.start).toHaveBeenCalledTimes(1);
    expect(ui.hideYtCaption).toHaveBeenCalledTimes(1);
  });

  test("reports rate limiting once and recovers on a healthy player response", async () => {
    await send("video-1", "<html><title>Sorry...</title></html>", 429);
    await send("video-1", "<html><title>Sorry...</title></html>", 429);
    expect(getCaptionTracks).not.toHaveBeenCalled();
    expect(manager.start).not.toHaveBeenCalled();
    expect(ui.showNotification).toHaveBeenCalledTimes(1);
    expect(ui.showNotification).toHaveBeenCalledWith(
      "subtitle_rate_limited",
      10000
    );
    expect(ui.showYtCaption).toHaveBeenCalled();
    await send();
    expect(manager.start).toHaveBeenCalledTimes(1);
  });

  test("navigation finish does not discard captions already delivered for the new video", async () => {
    await send();
    window.history.replaceState({}, "", "/watch?v=video-2");
    await send("video-2");
    expect(manager.destroy).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event("yt-navigate-finish"));
    await send("video-2");
    expect(manager.destroy).toHaveBeenCalledTimes(1);
    expect(manager.start).toHaveBeenCalledTimes(2);
  });

  test("failed original-track recovery preserves working captions and cooldown suppresses more requests", async () => {
    await send();
    getCaptionTracks.mockResolvedValue({});
    global.fetch = jest.fn().mockResolvedValue({
      status: 429,
      text: async () => "<html><title>Sorry...</title></html>",
      headers: { get: () => "120" },
    });
    await send("video-1", undefined, 200, "&tlang=fr");
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(manager.destroy).not.toHaveBeenCalled();
    expect(ui.showNotification).toHaveBeenLastCalledWith(
      "subtitle_rate_limited",
      10000
    );
    const notificationCount = ui.showNotification.mock.calls.length;
    await send("video-1", undefined, 200, "&tlang=de");
    expect(getCaptionTracks).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(manager.destroy).not.toHaveBeenCalled();
    expect(ui.showNotification).toHaveBeenCalledTimes(notificationCount);
  });
});
