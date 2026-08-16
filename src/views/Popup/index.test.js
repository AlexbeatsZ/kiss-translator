import { act } from "react";
import { createRoot } from "react-dom/client";
import Popup from "./index";
import { sendTabMsg } from "../../libs/msg";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("../../libs/msg", () => ({
  sendTabMsg: jest.fn(),
}));

jest.mock("../../libs/browser", () => ({
  browser: {
    runtime: {
      openOptionsPage: jest.fn(),
    },
  },
}));

jest.mock("../../hooks/I18n", () => ({
  useI18n: () => (key, fallback) => fallback || key,
}));

jest.mock("../../hooks/Setting", () => ({
  useSetting: () => ({
    setting: {
      transApis: [
        {
          apiSlug: "Google2",
          apiName: "Google2",
          apiType: "Google2",
          model: "google-translate",
        },
      ],
      subtitleSetting: { enabled: true },
    },
    updateSetting: jest.fn(),
  }),
}));

jest.mock("../../hooks/Rules", () => ({
  useRules: () => ({
    list: [
      {
        pattern: "*",
        apiSlug: "Google2",
        fromLang: "auto",
        toLang: "zh-CN",
        transOpen: "false",
        transOnly: "false",
      },
    ],
    put: jest.fn(),
  }),
}));

describe("Popup component", () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    jest.clearAllMocks();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test("renders gracefully with global rule fallback when tab message fails", async () => {
    sendTabMsg.mockRejectedValue(new Error("Receiving end does not exist"));

    await act(async () => {
      root.render(<Popup />);
    });

    expect(container.textContent).toContain("翻译");
    expect(container.textContent).toContain("Google2");
    // Language card displays concise native names rather than "AutoDetect - AutoDetect"
    expect(container.textContent).toContain("自动检测");
    expect(container.textContent).toContain("简体中文");
    expect(container.textContent).not.toContain("AutoDetect - AutoDetect");
    expect(container.textContent).not.toContain("Simplified Chinese - 简体中文");
  });

  test("renders tab rule when sendTabMsg succeeds", async () => {
    sendTabMsg.mockResolvedValue({
      rule: {
        pattern: "example.com",
        apiSlug: "Google2",
        fromLang: "en",
        toLang: "zh-CN",
        transOpen: "true",
      },
    });

    await act(async () => {
      root.render(<Popup />);
    });

    expect(container.textContent).toContain("English");
    expect(container.textContent).toContain("简体中文");
  });
});
