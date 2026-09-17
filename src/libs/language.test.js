import {
  isEffectivelyUnchangedTranslation,
  isSameLanguage,
  isSameLanguageSkipError,
  normalizeLanguageFamily,
} from "./language";

describe("language normalization", () => {
  test("normalizes provider aliases and regional variants", () => {
    expect(normalizeLanguageFamily("zh-Hans")).toBe("zh");
    expect(normalizeLanguageFamily("Simplified Chinese")).toBe("zh");
    expect(isSameLanguage("zh-TW", "zh-CN")).toBe(true);
    expect(isSameLanguage("English", "en-US")).toBe(true);
    expect(isSameLanguage("ja", "zh-CN")).toBe(false);
  });

  test("recognizes unchanged text and same-language control-flow errors", () => {
    expect(isEffectivelyUnchangedTranslation("OpenAI", " OpenAI ")).toBe(true);
    expect(
      isSameLanguageSkipError(new Error("检测到源语言和目标语言相同，无需翻译"))
    ).toBe(true);
    expect(isSameLanguageSkipError(new Error("provider unavailable"))).toBe(
      false
    );
    expect(
      isSameLanguageSkipError(new Error("No translation provider available"))
    ).toBe(false);
  });
});
