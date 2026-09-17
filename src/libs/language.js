/**
 * Normalize provider-specific language labels to the language family used by
 * page filtering. Regional variants intentionally share one family because a
 * zh-CN target should not produce a second line for already-Chinese text.
 */
const LANGUAGE_NAME_TO_CODE = new Map([
  ["arabic", "ar"],
  ["bulgarian", "bg"],
  ["catalan", "ca"],
  ["croatian", "hr"],
  ["czech", "cs"],
  ["danish", "da"],
  ["dutch", "nl"],
  ["english", "en"],
  ["finnish", "fi"],
  ["french", "fr"],
  ["german", "de"],
  ["greek", "el"],
  ["hindi", "hi"],
  ["hungarian", "hu"],
  ["indonesian", "id"],
  ["italian", "it"],
  ["japanese", "ja"],
  ["korean", "ko"],
  ["malay", "ms"],
  ["maltese", "mt"],
  ["norwegian", "nb"],
  ["persian", "fa"],
  ["polish", "pl"],
  ["portuguese", "pt"],
  ["romanian", "ro"],
  ["russian", "ru"],
  ["slovak", "sk"],
  ["slovenian", "sl"],
  ["spanish", "es"],
  ["swedish", "sv"],
  ["tamil", "ta"],
  ["telugu", "te"],
  ["thai", "th"],
  ["turkish", "tr"],
  ["ukrainian", "uk"],
  ["vietnamese", "vi"],
]);

export const normalizeLanguageFamily = (language) => {
  const value = String(language || "")
    .trim()
    .toLowerCase();
  if (!value || value === "auto") return "";

  if (
    /^(?:zh|cmn)(?:[-_]|$)/.test(value) ||
    value.includes("chinese") ||
    value.includes("中文") ||
    value.includes("汉语") ||
    value.includes("漢語")
  ) {
    return "zh";
  }

  for (const [name, code] of LANGUAGE_NAME_TO_CODE) {
    if (
      value === name ||
      value.startsWith(`${name} `) ||
      value.startsWith(`${name}-`)
    ) {
      return code;
    }
  }

  const codeMatch = value.match(/^([a-z]{2,3})(?:[-_]|$)/);
  return codeMatch?.[1] || "";
};

export const isSameLanguage = (left, right) => {
  const leftFamily = normalizeLanguageFamily(left);
  const rightFamily = normalizeLanguageFamily(right);
  return Boolean(leftFamily && rightFamily && leftFamily === rightFamily);
};

const normalizeComparableText = (text) =>
  String(text || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const isEffectivelyUnchangedTranslation = (source, translation) => {
  const sourceText = normalizeComparableText(source);
  const translatedText = normalizeComparableText(translation);
  return Boolean(sourceText && translatedText && sourceText === translatedText);
};

/**
 * Translation providers use exceptions for same-language/no-op results in
 * several incompatible formats. These are control-flow outcomes, not errors
 * that should create a retry icon beside the original text.
 */
export const isSameLanguageSkipError = (error) => {
  if (error?.isSame === true || error?.code === "SAME_LANGUAGE") return true;

  const message = String(error?.message || error || "").trim();
  if (!message) return false;

  return [
    /\bsame[\s_-]*lang(?:uage)?\b/i,
    /source(?:\s+language)?.{0,40}target(?:\s+language)?.{0,24}(?:same|identical|equal|must be different)/i,
    /already (?:in|written in) (?:the )?target language/i,
    /\bno translation (?:is )?(?:needed|required|necessary)\b/i,
    /\b(?:does not|doesn't) need to be translated\b/i,
    /(?:源|原)语言.{0,24}(?:目标|译入)语言.{0,16}(?:相同|一致)/,
    /(?:目标|译入)语言.{0,24}(?:源|原)语言.{0,16}(?:相同|一致)/,
    /(?:已经是|本身是).{0,12}(?:目标语言|中文|简体中文|繁体中文)/,
    /(?:无需|不用|不需要)(?:再次)?翻译/,
  ].some((pattern) => pattern.test(message));
};
