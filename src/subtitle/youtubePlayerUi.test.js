import { YouTubePlayerUi, YT_CAPTION_SELECTOR } from "./youtubePlayerUi.js";

describe("YouTubePlayerUi", () => {
  let setting;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    document.body.innerHTML = "";
    setting = { showLoadNotification: true };
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  function createUi(videoEl = null) {
    return new YouTubePlayerUi({
      getSetting: () => setting,
      getVideoEl: () => videoEl,
    });
  }

  test("hides and shows native YouTube caption container", () => {
    document.body.innerHTML = `<div id="ytp-caption-window-container"></div>`;
    const captionContainer = document.querySelector(YT_CAPTION_SELECTOR);
    const ui = createUi();

    ui.hideYtCaption();
    expect(captionContainer.style.top).toBe("-10000px");
    expect(
      document.getElementById("kiss-hide-yt-caption-style")
    ).not.toBeNull();

    ui.showYtCaption();
    expect(captionContainer.style.top).toBe("0px");
    expect(document.getElementById("kiss-hide-yt-caption-style")).toBeNull();
  });

  test("shows and hides notification toast correctly", () => {
    document.body.innerHTML = "<div><div><video></video></div></div>";
    const videoEl = document.querySelector("video");
    const ui = createUi(videoEl);

    ui.showNotification("双语字幕加载成功！");
    const notification = document.querySelector(".kiss-notification");
    expect(notification).not.toBeNull();
    expect(notification.textContent).toBe("双语字幕加载成功！");
    expect(notification.style.opacity).toBe("1");

    ui.hideNotification();
    expect(notification.style.opacity).toBe("0");

    setting.showLoadNotification = false;
    ui.showNotification("hidden message");
    expect(notification.style.opacity).toBe("0");

    ui.destroy();
    expect(document.querySelector(".kiss-notification")).toBeNull();
  });
});
