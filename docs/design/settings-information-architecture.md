# Focused Translator Information Architecture

## Purpose

Make the extension read as one bilingual reading tool, not a collection of unrelated translation utilities. Every visible route must serve page translation or subtitle translation.

## Navigation

The settings shell has four primary destinations:

- `/`: page translation defaults, language direction, appearance, performance, cache, and essential shortcuts;
- `/rules`: website scope and per-site page behaviour;
- `/subtitle`: caption acquisition, segmentation, translation, and bilingual rendering;
- `/apis`: translation engines, credentials, models, request behaviour, and local CLI bridge status.

Project/version information lives in the shell footer instead of a separate About destination. Removed routes do not remain as empty compatibility pages.

## Responsibilities

### Page translation

- The global `*` website rule remains the persisted default for page languages, profile, display mode, and scanning behaviour.
- General settings own only cross-site runtime controls such as cache, limits, logging, and the small set of retained shortcuts.
- Website rules never edit credentials or model configuration.

### Subtitle translation

- Subtitle settings select the translation, segmentation, and context profiles by stable `apiSlug`.
- The subtitle module owns caption acquisition, segmentation, translation, synchronized bilingual rendering, list display, and download.
- Word lookup, vocabulary collection, vocabulary tabs, and vocabulary export are not subtitle responsibilities.

### Translation engines

- `transApis[]` remains the compatible persisted representation of translation profiles.
- `/apis` owns profile creation, duplication, ordering, enabling, credentials, model discovery, test requests, and advanced request behaviour.
- Profile deletion and disabling must enforce references from global/site rules and the retained subtitle roles.
- HTTP providers and the Agy/Codex local bridge are adapters behind the shared translation execution seam.

## Removed slices

Remove routes, runtime initialization, messages, shortcuts, storage/sync work, permissions, prompts, request handlers, UI, and tests that exist only for:

- selection and standalone text translation;
- ordinary and AI dictionaries;
- vocabulary saving, highlighting, lookup, and export;
- input-field translation;
- mouse-hover translation;
- cloud synchronization;
- the translation playground.

Removing only navigation is not sufficient acceptance.

## Compatibility

- Preserve `apiSlug` and every retained `transApis[]` field.
- Preserve the global `*` rule and existing site-rule inheritance.
- Preserve retained subtitle profile references and custom styles.
- Do not proactively delete removed-feature keys from an existing user's browser storage; ignore them so downgrade or manual recovery remains possible.
- New installations do not initialize removed-feature defaults or storage.

## Interaction contract

- The shell always shows the current page language direction and active translation engine.
- Frequent controls precede advanced controls.
- Mobile uses a fixed four-destination bottom bar; the engine list and editor are separate narrow-screen views with an explicit Back action.
- Saving, discarding, route changes, browser Back/Forward, profile switching, and rule switching cannot silently discard a draft.
- Model discovery reports working, empty, offline, authentication, and malformed-response states explicitly.
- A local CLI engine explains that the bridge must be running and provides a direct connection test.
- Desktop and 390px layouts keep primary actions visible and keyboard reachable.

## Acceptance

- No visible selection, dictionary, vocabulary, input translation, hover translation, sync, standalone translator, or playground entry remains.
- Removed slices are absent from content startup and production bundles except inert legacy-key compatibility code.
- A first-time user can configure page translation, a site rule, subtitles, and a translation engine without learning storage terminology.
- Page and subtitle translation continue to use stable profiles and existing stored core configuration.
- Agy and Codex use the local bridge and the same normalized translation result path as HTTP adapters. Acceptance separates bridge/adapter correctness from an upstream CLI account or region rejection.
- The Chrome extension build passes and the actual options and popup pages are visually verified at desktop and narrow widths.

## Verification snapshot (2026-08-16)

- Chrome and web production builds completed successfully.
- All 32 Jest suites (218 tests) and all 5 local-bridge unit tests passed.
- The actual Options UI was inspected on desktop and at 390x844. Page setup, editable website defaults, subtitle essentials and advanced disclosure, and both engine list/editor views had no horizontal overflow. Mobile uses a fixed four-item bottom bar rather than a scrolling destination strip.
- The LocalCodex form exposed the expected loopback URL, bearer token, model endpoint, and `gpt-5.6-sol` model. A real Codex completion returned the requested marker.
- LocalAgy executable detection and live model discovery succeeded. A completion reached the CLI but the current Agy account/network was rejected upstream because its location is unsupported; this is reported as a provider error rather than bridge availability.
