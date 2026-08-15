# Goal

Rebuild KISS Translator as a focused browser tool for page translation and subtitle translation. Remove unrelated dictionary, vocabulary, selection, input, hover, standalone-text, playground, and cloud-sync slices; preserve retained stored configuration; add local Agy and Codex adapters through a controlled companion; and ship a distinctive bilingual-reading UI based on Anthropic's official `frontend-design` skill.

# Current State

- Version: `2.0.28`
- Branch: `feat/settings-menu-switches`
- Baseline commit: `daa82b6`
- UI stack: React 18, Material UI 5, React Router 6.
- Settings UI lives under `src/views/Options/`; runtime configuration lives under `src/config/` and `src/hooks/`.
- Settings navigation is grouped by user goal and uses responsive page headers, cards, and a mobile drawer.
- `/apis` is the canonical translation-service/model manager; `/rules` owns website scope and optional per-site service overrides. Retained storage fields and `apiSlug` references are unchanged.
- The visible product has four settings routes: page translation, website rules, subtitles, and translation engines. Popup and content startup expose only page translation controls plus subtitle runtime support.
- Local Agy and Codex profiles use the authenticated loopback companion under `tools/local-bridge/`; browser code never launches a process itself.
- Verification on 2026-08-16: 32 Jest suites/218 tests and 5 bridge tests pass; Chrome and web builds pass; Options was visually checked on desktop and a 390px viewport with no current-page console errors.
- Live bridge verification on 2026-08-16: Codex completed a real request; Agy executable/model discovery succeeded, while completion reached Agy and was rejected upstream with `FAILED_PRECONDITION: User location is not supported for API use` for the current account/network region.
- Settings information architecture: `docs/design/settings-information-architecture.md` (read before changing Options navigation, Rules, Apis, or their persisted responsibilities).
- Product/domain vocabulary: `CONTEXT.md`.
- Focused UI contract: `docs/design/focused-translator-ui.md` (read before changing Options, Popup, or shared visual tokens).

# Active Work

- [x] Audit feature slices, persisted data flow, runtime composition, subtitle internals, and local CLI feasibility.
- [x] Define the focused product scope, domain vocabulary, and visual direction.
- [x] Remove non-core feature slices end to end.
- [x] Deepen translation adapter and profile lifecycle modules.
- [x] Implement and verify the local Agy/Codex bridge.
- [x] Rebuild Options and Popup with the focused bilingual-reading UI.
- [x] Run full tests and builds, and visually inspect the real settings routes at desktop and mobile widths.

# Build / Run / Test

- Install dependencies locally: `pnpm install`
- Development web client: `pnpm start`
- Unit tests: `pnpm test -- --watchAll=false`
- Web build: `pnpm build:web`
- Chrome extension build: `pnpm build:chrome`
- Focused settings tests can be run directly with the project runtime: `node node_modules/react-scripts/bin/react-scripts.js test --watchAll=false --runInBand src/views/Options/index.test.js src/views/Options/Layout.test.js src/views/Options/Apis.test.js src/views/Options/Rules.test.js src/views/Options/ReusableAutocomplete.test.js src/libs/modelList.test.js`
- If the active pnpm wrapper is not the repository-pinned version, run local binaries directly rather than rewriting workspace/package-manager configuration.

# Durable Lessons

- Treat a successful build as an implementation check, not UI acceptance; verify the exact settings route and its visible interactions.
- `transApis[]` entries are complete translation profiles (provider connection plus one model and request behavior), not independent Provider and Model entities.
- A translation service can be referenced by website rules and three subtitle roles; disabling or deleting a profile must account for every retained consumer without silently rewriting it.
- Options storage hooks must mount after the route's required setting and rule data is current.
- Unsaved settings drafts need route-level protection, including hash-history Back/Forward, not only click handlers on the visible navigation.
- Hiding a route is not feature removal. A removed slice must also leave runtime composition, messages, storage/sync work, prompts, permissions, and production bundles.
- Browser code cannot spawn Agy or Codex directly. Keep process execution, argv construction, timeouts, cancellation, output limits, and error classification in a loopback-only local companion.
- A successful bridge health/model response proves executable discovery, not provider-account viability. Classify CLI upstream errors separately; the current Agy account can enumerate models but is region-blocked at completion time.
- Windows build tasks must invoke the repository-local `react-app-rewired` entrypoint rather than assuming its shim is globally available on `PATH`.
