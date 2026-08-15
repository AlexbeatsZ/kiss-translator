import { YouTubeSubtitleList } from "./YouTubeSubtitleList";
import { downloadBlobFile } from "../libs/utils";
import { buildBilingualVtt } from "./vtt.js";

jest.mock("../libs/utils", () => ({ downloadBlobFile: jest.fn() }));
jest.mock("./vtt.js", () => ({ buildBilingualVtt: jest.fn(() => "WEBVTT") }));
jest.mock("../libs/log.js", () => ({
  logger: { error: jest.fn() },
}));

const subtitles = [
  { start: 0, end: 1999, text: "Hello world", translation: "你好，世界" },
  { start: 2000, end: 3999, text: "Next line", translation: "下一行" },
];

function createHost(height = 540) {
  document.body.innerHTML = `
    <div class="html5-video-player"><video></video></div>
    <aside id="secondary-inner"></aside>
  `;
  const player = document.querySelector(".html5-video-player");
  player.getBoundingClientRect = () => ({ height });
  const video = document.querySelector("video");
  Object.defineProperty(video, "currentTime", {
    configurable: true,
    writable: true,
    value: 0,
  });
  return video;
}

describe("YouTubeSubtitleList focused timeline", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    buildBilingualVtt.mockReturnValue("WEBVTT");
    global.ResizeObserver = class {
      observe() {}
      disconnect() {}
    };
  });

  afterEach(() => {
    delete global.ResizeObserver;
    document.body.innerHTML = "";
  });

  test("renders bilingual rows and only the two relevant download actions", () => {
    const manager = new YouTubeSubtitleList(createHost(), (key) => key);
    manager.initialize(subtitles, [{ event: 1 }], 75);

    expect(document.querySelector("strong").textContent).toBe(
      "bilingual_subtitles [75%]"
    );
    expect(document.querySelectorAll(".kiss-youtube-item")).toHaveLength(2);
    expect(document.querySelector(".kiss-youtube-original").textContent).toBe(
      "Hello world"
    );
    expect(
      document.querySelector(".kiss-youtube-translation").textContent
    ).toBe("你好，世界");
    expect(
      Array.from(document.querySelectorAll("button")).map(
        (button) => button.textContent
      )
    ).toEqual([
      "×",
      "download_subtitles_vtt",
      "download_raw_subtitle_events_json",
      "0:00",
      "0:02",
    ]);
    expect(document.querySelector(".kiss-subtitle-word")).toBeNull();
    manager.destroy();
  });

  test("matches the panel height to the player", () => {
    const manager = new YouTubeSubtitleList(createHost(612));
    manager.initialize(subtitles);

    expect(manager.container.style.height).toBe("612px");
    expect(manager.container.style.maxHeight).toBe("612px");
    manager.destroy();
  });

  test("jumps from the time button and tracks the active row", () => {
    const video = createHost();
    const manager = new YouTubeSubtitleList(video);
    manager.initialize(subtitles);

    document.querySelectorAll(".kiss-youtube-item button")[1].click();
    expect(video.currentTime).toBe(2);
    expect(
      document
        .querySelectorAll(".kiss-youtube-item")[1]
        .getAttribute("aria-current")
    ).toBe("true");
    manager.destroy();
  });

  test("updates one streamed translation without rebuilding the panel", () => {
    const manager = new YouTubeSubtitleList(createHost());
    manager.initialize(subtitles);
    const panel = manager.container;

    manager.updateSingleSubtitle({ start: 2000, translation: "更新后的译文" });

    expect(manager.container).toBe(panel);
    expect(
      document.querySelectorAll(".kiss-youtube-translation")[1].textContent
    ).toBe("更新后的译文");
    manager.destroy();
  });

  test("downloads translated VTT and raw source JSON", () => {
    const manager = new YouTubeSubtitleList(createHost());
    manager.initialize(subtitles, [{ id: 1 }]);

    const buttons = document.querySelectorAll("button");
    buttons[1].click();
    buttons[2].click();

    expect(downloadBlobFile).toHaveBeenNthCalledWith(
      1,
      "WEBVTT",
      expect.stringMatching(/^kiss-subtitles-/)
    );
    expect(downloadBlobFile).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('"id": 1'),
      expect.stringMatching(/^kiss-subtitles-raw-/)
    );
    manager.destroy();
  });
});
