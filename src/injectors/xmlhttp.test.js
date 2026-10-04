import { XMLHttpRequestInjector } from "./xmlhttp";

describe("YouTube caption interception", () => {
  let originalXhr;
  let originalFetch;
  let originalEntries;
  let postMessage;

  const url =
    "http://localhost/api/timedtext?v=video-1&lang=en&fmt=json3&pot=player-token";
  const makeResponse = (status = 200, text = '{"events":[]}') => ({
    url,
    status,
    headers: {
      get: (key) => (key === "Retry-After" ? "120" : "application/json"),
    },
    clone: jest.fn(() => ({ text: () => Promise.resolve(text) })),
  });
  const flush = async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  };

  beforeEach(() => {
    originalXhr = window.XMLHttpRequest;
    originalFetch = window.fetch;
    originalEntries = window.performance.getEntriesByType;
    window.XMLHttpRequest = class extends EventTarget {
      open() {}
      getResponseHeader() {
        return null;
      }
    };
    window.fetch = jest.fn(() => Promise.resolve(makeResponse()));
    window.performance.getEntriesByType = jest.fn(() => []);
    postMessage = jest
      .spyOn(window, "postMessage")
      .mockImplementation(() => {});
    window.history.replaceState({}, "", "/watch?v=video-1");
  });

  afterEach(() => {
    window.XMLHttpRequest = originalXhr;
    window.fetch = originalFetch;
    window.performance.getEntriesByType = originalEntries;
    postMessage.mockRestore();
  });

  test("captures fetch(Request) without consuming or replacing the player response", async () => {
    const response = makeResponse(429, "<html><title>Sorry...</title></html>");
    window.fetch.mockResolvedValue(response);
    XMLHttpRequestInjector();
    const result = await window.fetch({ url });
    await flush();
    expect(result).toBe(response);
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        url,
        status: 429,
        retryAfter: "120",
        response: "<html><title>Sorry...</title></html>",
      }),
      window.location.origin
    );
  });

  test("reused XHR objects publish only the current caption request", async () => {
    XMLHttpRequestInjector();
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.open("GET", url + "&variant=punctuated");
    xhr.status = 200;
    xhr.responseText = '{"events":[]}';
    xhr.dispatchEvent(new Event("load"));
    expect(postMessage).toHaveBeenCalledTimes(1);
    xhr.open("GET", "http://localhost/other");
    xhr.dispatchEvent(new Event("load"));
    expect(postMessage).toHaveBeenCalledTimes(1);
    await flush();
  });

  test("replays one already completed current-video request with its signed URL intact", async () => {
    window.performance.getEntriesByType.mockReturnValue([
      { name: url.replace("video-1", "old-video") },
      { name: url },
    ]);
    const fetchSpy = window.fetch;
    XMLHttpRequestInjector();
    XMLHttpRequestInjector();
    await flush();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(url);
    expect(postMessage).toHaveBeenCalledTimes(1);
  });

  test("ignores lookalike URLs and does not replay when the player already made a request", async () => {
    window.performance.getEntriesByType.mockReturnValue([{ name: url }]);
    const fetchSpy = window.fetch;
    XMLHttpRequestInjector();
    await window.fetch(url);
    await window.fetch("https://example.test/api/timedtext?v=video-1");
    await window.fetch("http://localhost/not-timedtext");
    await flush();
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(postMessage).toHaveBeenCalledTimes(1);
  });
});
