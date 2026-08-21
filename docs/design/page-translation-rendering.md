# Page Translation Rendering Contract

## Goal

Page translation must not change the page merely to indicate work whose source language is still unknown and may later be discarded. Clearly target-language text should be stopped before provider dispatch; ambiguous text may still require a provider result, but must not briefly show a loading/identical-text translation before being removed.

## Dispatch boundary

- When the page source language is `auto`, run the conservative target-script preflight before browser/remote detection and before `apiTranslate`.
- The preflight recognizes only high-confidence Chinese, Japanese, and Korean text. It deliberately does not guess among Latin-script languages.
- A positive preflight result marks the node processed and skips provider dispatch.
- Browser or configured language detection remains the next decision layer. A detected source matching the target, or present in `skipLangs`, also skips dispatch.
- Provider-returned `sourceLanguage` is only the final safety net; reaching it may already have consumed quota.

## Rendering boundary

- Build the translation wrapper off-DOM, but do not attach it as a loading placeholder.
- Attach the wrapper only when actual translated content is ready, a safe stream chunk is ready, or an error/retry control must be shown.
- If `fromLang` is `auto` and pre-detection returned no source language, suppress partial stream rendering until the final provider result establishes whether source and target match.
- When pre-detection established a different source language, normal streaming remains enabled.
- A final same-language result leaves the page unchanged; if an earlier safe stream was visible, remove it with viewport anchoring.
- Translation-only mode inserts the completed wrapper and moves the original nodes in one anchored DOM update.

## Regression checks

- `src/libs/detect.test.js` covers conservative target-script classification.
- `src/libs/translator.test.js` covers pre-dispatch skipping, an unchanged DOM while an ambiguous request is pending, final same-language removal, and deferred error/retry rendering.
