# Page Translation Rendering Contract

## Goal

Page translation must not change the page merely to indicate work whose source language is still unknown and may later be discarded. Clearly target-language text should be stopped before provider dispatch; ambiguous text may still require a provider result, but must not briefly show a loading/identical-text translation before being removed.

## Dispatch boundary

- When the page source language is `auto`, run the conservative target-script preflight before browser/remote detection and before `apiTranslate`.
- The preflight recognizes Chinese, Japanese, and Korean text by script. Short CJK labels are eligible for the same early skip; any kana/hangul prevents Chinese classification. It deliberately does not guess among Latin-script languages.
- A positive preflight result marks the node processed and skips provider dispatch.
- A specific `lang` declaration on the content element or one of its non-document ancestors also skips dispatch when it matches the target language family.
- Browser or configured language detection remains the next decision layer. A detected source matching the target, or present in `skipLangs`, also skips dispatch.
- Provider-returned `sourceLanguage` is only the final safety net; reaching it may already have consumed quota.

## Candidate filtering boundary

- Smart scanning is reading-content first. Semantic text selectors (`p`, headings, list items, quotes, captions) remain eligible, while generic `div`/`span` leaves are eligible only inside `main`, `article`, `[role="main"]`, `[role="article"]`, an `articleBody`, or an explicitly configured non-body root.
- Navigation, sidebars, forms, menus, dialogs, page-level headers/footers, and interactive ARIA roles are excluded from smart scanning. Headers/footers inside article/main content remain eligible.
- Author intent is a hard boundary in every mode: `.notranslate`, `[translate="no"]`, editable controls, scripts/styles, and code-like subtrees never become standalone translation units. Inline code/math retained by `keepSelector` is serialized as an unchanged placeholder rather than removed.
- `scanAll` may include page chrome, but it does not override author no-translate markers or unsafe/editable elements.

## Rendering boundary

- Build the translation wrapper off-DOM, but do not attach it as a loading placeholder.
- Attach the wrapper only when actual translated content is ready, a safe stream chunk is ready, or an error/retry control must be shown.
- If `fromLang` is `auto` and pre-detection returned no source language, suppress partial stream rendering until the final provider result establishes whether source and target match.
- When pre-detection established a different source language, normal streaming remains enabled.
- A final same-language result leaves the page unchanged; if an earlier safe stream was visible, remove it with viewport anchoring.
- Provider language aliases are compared by language family. An empty same-language result, an unchanged result, or an explicit same-language/no-translation exception is a successful no-op and must never create a retry/error control.
- Translation-only mode inserts the completed wrapper and moves the original nodes in one anchored DOM update.

## Regression checks

- `src/libs/detect.test.js` covers conservative target-script classification.
- `src/libs/language.test.js` covers provider language aliases, unchanged results, and same-language exception classification.
- `src/libs/translator.test.js` covers smart candidate filtering, hard no-translate boundaries, pre-dispatch skipping, an unchanged DOM while an ambiguous request is pending, final same-language removal, and deferred error/retry rendering.
