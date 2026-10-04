import {
  buildTrackKey,
  findCaptionTrack,
  isChatCaptionTrack,
  isSameLang,
  getSubtitleEvents,
  parseSubtitleResponse,
} from "./youtubeCaptionTracks.js";

jest.mock("../libs/log.js", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
  },
}));

describe("youtubeCaptionTracks", () => {
  test("classifies 429 HTML and HTTP failures instead of silently returning no subtitles", () => {
    expect(() =>
      parseSubtitleResponse("<html><title>Sorry...</title></html>", {
        status: 429,
      })
    ).toThrow("rate-limit (429)");
    expect(() => parseSubtitleResponse("Forbidden", { status: 403 })).toThrow(
      "http (403)"
    );
    expect(() => parseSubtitleResponse("<html>unexpected</html>")).toThrow(
      "invalid-response"
    );
    expect(() => parseSubtitleResponse("", { status: 200 })).toThrow("empty");
  });

  test("reuses a valid original caption response without fetching again", async () => {
    const url = new URL(
      "https://www.youtube.com/api/timedtext?v=video-1&lang=en&kind=asr"
    );
    const events = [{ tStartMs: 100, segs: [{ utf8: "Hello" }] }];
    await expect(
      getSubtitleEvents(url, url, JSON.stringify({ events }))
    ).resolves.toEqual(events);
  });

  test("preserves signed query data when recovering original captions", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest
      .fn()
      .mockResolvedValue({
        status: 429,
        text: async () => "<html><title>Sorry...</title></html>",
        headers: { get: () => "60" },
      });
    const requestUrl = new URL(
      "https://www.youtube.com/api/timedtext?v=video-1&lang=en&tlang=zh&pot=token&signature=signed"
    );
    const originalUrl = requestUrl.href;
    try {
      await expect(
        getSubtitleEvents(requestUrl, requestUrl, '{"events":[]}')
      ).rejects.toMatchObject({ code: "rate-limit", status: 429 });
      expect(requestUrl.href).toBe(originalUrl);
      const fetchedUrl = new URL(global.fetch.mock.calls[0][0]);
      expect(fetchedUrl.searchParams.get("pot")).toBe("token");
      expect(fetchedUrl.searchParams.get("signature")).toBe("signed");
      expect(fetchedUrl.searchParams.has("tlang")).toBe(false);
    } finally {
      global.fetch = originalFetch;
    }
  });
  test("matches language families by their leading language code", () => {
    expect(isSameLang("zh-CN", "zh-TW")).toBe(true);
    expect(isSameLang("en", "fr")).toBe(false);
  });

  test("builds a stable track key from timedtext query parameters", () => {
    const url = new URL(
      "https://example.test/api?v=video-1&lang=en&kind=asr&name=English&tlang=zh"
    );

    expect(buildTrackKey(url)).toBe("video-1|en|asr|English|zh");
  });

  test("detects live chat caption tracks", () => {
    expect(
      isChatCaptionTrack({ name: { simpleText: "Live Chat replay" } })
    ).toBe(true);
    expect(isChatCaptionTrack({ name: { simpleText: "English" } })).toBe(false);
  });

  test("prefers exact language and kind matches", () => {
    const exact = { languageCode: "en", kind: "asr" };
    const manual = { languageCode: "en" };

    expect(findCaptionTrack([manual, exact], "en", "asr")).toBe(exact);
  });

  test("falls back from ASR to a same-language manual track", () => {
    const asr = { languageCode: "en", kind: "asr" };
    const manual = { languageCode: "en-US" };

    expect(findCaptionTrack([asr, manual], "fr", null)).toBe(manual);
  });

  test("falls back away from chat tracks when possible", () => {
    const chat = { languageCode: "en", name: { simpleText: "Live chat" } };
    const normal = { languageCode: "en", name: { simpleText: "English" } };

    expect(findCaptionTrack([chat, normal], "en", null)).toBe(normal);
  });

  test("keeps the existing pop fallback behavior when no track matches", () => {
    const tracks = [{ languageCode: "de" }];

    expect(findCaptionTrack(tracks, "en", null)).toEqual({
      languageCode: "de",
    });
    expect(tracks).toHaveLength(0);
  });
});
