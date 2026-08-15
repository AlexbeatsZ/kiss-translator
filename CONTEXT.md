# Domain Context

## Product

KISS Translator is a focused browser translation tool for people reading foreign-language web pages and video subtitles. Its product surface has two outcomes: translate a page in place and display translated subtitles.

## Terms

### Page translation

Scanning readable DOM text, sending source segments through a translation profile, and rendering original and translated text together on the page.

### Subtitle translation

Acquiring a supported video's caption track, segmenting it when requested, translating it through a translation profile, and rendering synchronized bilingual captions.

### Translation profile

One persisted `transApis[]` item containing a provider adapter type, stable `apiSlug`, display name, connection details, one model, and request behaviour. A translation profile is not a standalone provider record plus a separate model record.

### Website rule

A persisted rule describing where page translation applies and how translated page content is scanned and presented. The global `*` rule owns the default page translation profile; a site rule may inherit it or override it by `apiSlug`.

### Translation engine

The user-facing name for the configured translation profiles. The settings route remains `/apis` for compatibility, while UI copy uses “Translation engines”.

### Local CLI bridge

A loopback-only companion process that runs an authenticated local Agy or Codex CLI without exposing process execution to browser content. The extension sees it as another translation adapter.

## Product boundaries

The focused product includes page translation, website rules, subtitle translation, translation engines, essential appearance, cache clearing, logging, and core shortcuts.

It does not include selection translation, dictionaries, AI dictionary, vocabulary collection or highlighting, input-field translation, hover translation, standalone text translation, a playground, cloud sync, subtitle word lookup, or vocabulary export.

Legacy stored fields belonging to removed features are ignored rather than actively erased. Core `apiSlug`, `transApis[]`, website rules, subtitle settings, and custom page styles remain compatible.
