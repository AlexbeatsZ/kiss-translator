jest.mock("../apis", () => ({
  apiBaiduLangdetect: jest.fn(),
  apiBuiltinAIDetect: jest.fn(),
  apiGoogleLangdetect: jest.fn(),
  apiMicrosoftLangdetect: jest.fn(),
  apiTencentLangdetect: jest.fn(),
}));

const { isLikelyTargetLanguageText } = require("./detect");

describe("target-language script preflight", () => {
  test("recognizes Chinese-dominant text before a translation request", () => {
    expect(
      isLikelyTargetLanguageText(
        "这是 OpenAI 发布的新模型说明，当前内容已经主要是中文。",
        "zh-CN"
      )
    ).toBe(true);
  });

  test("keeps English and Japanese text eligible for Chinese translation", () => {
    expect(
      isLikelyTargetLanguageText(
        "This release contains a new translation pipeline.",
        "zh-CN"
      )
    ).toBe(false);
    expect(
      isLikelyTargetLanguageText(
        "新しい翻訳モデルの使い方を説明します。",
        "zh-CN"
      )
    ).toBe(false);
  });

  test("recognizes Japanese and Korean only with their distinctive scripts", () => {
    expect(isLikelyTargetLanguageText("これは日本語の文章です。", "ja")).toBe(
      true
    );
    expect(
      isLikelyTargetLanguageText(
        "이 문장은 이미 한국어로 작성되었습니다.",
        "ko"
      )
    ).toBe(true);
    expect(isLikelyTargetLanguageText("纯中文内容不会被当成日文", "ja")).toBe(
      false
    );
  });

  test("does not guess among Latin-script target languages", () => {
    expect(
      isLikelyTargetLanguageText(
        "This paragraph is already written in English.",
        "en"
      )
    ).toBe(false);
  });
});
