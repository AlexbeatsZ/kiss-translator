# Goal

Rebuild 翻译 (formerly KISS Translator) as a focused browser tool for page translation and subtitle translation. Remove unrelated dictionary, vocabulary, selection, input, hover, standalone-text, playground, and general cloud-sync slices; preserve retained stored configuration; synchronize only the no-auto-translate website list; add local Agy and Codex adapters through a controlled companion; and ship a distinctive bilingual-reading UI based on Anthropic's official `frontend-design` skill.

# Current State

- Version: `2.0.30`
- Branch: `feat/settings-menu-switches`
- Baseline commit: `daa82b6`
- UI stack: React 18, Material UI 5, React Router 6.
- Settings UI lives under `src/views/Options/`; runtime configuration lives under `src/config/` and `src/hooks/`.
- Settings uses the default-dark Nocturne reading console: a compact desktop rail, fixed three-item mobile bar, source-to-engine-to-output context, and progressive disclosure for advanced controls.
- `/apis` is the canonical translation-service/model manager and the first settings destination; `/page` owns page translation defaults plus a simple no-auto-translate website list; `/rules` now redirects to `/page`. The full website-rule editor (`Rules.js`) has been removed rather than hidden. Retained storage fields and `apiSlug` references are unchanged.
- `/page` now has a visible encrypted GitHub Gist sync card immediately below the no-auto-translate website list. Only patterns with `transOpen: "false"` are synchronized; all languages, engines, credentials, shortcuts, tuning, subtitles, and unrelated rule fields remain local-only.
- Microsoft page translation and language detection use Edge's current no-token `translate/translatetext` endpoint; the retired `translate/auth` JWT flow and its auth module are removed.
- Google `gtx` translation and detection fall back to the built-in Google2 batch endpoint only after explicit 429 or Google `/sorry` evidence, then keep a ten-minute cooldown; ordinary network failures remain visible. Chrome BuiltinAI same-language results are treated as a skipped translation rather than an exception.
- The visible product has three settings routes: translation options, page translation, and subtitles. Popup and content startup expose only page translation controls plus subtitle runtime support.
- Local Agy and Codex profiles call the standalone loopback service `cli2api` (`C:/Users/Meta/Project/Workspaces/cli2api`, default `http://127.0.0.1:17891`, auth disabled by default); browser code never launches a process itself.
- Completely removed browser right-click context menus (`contextMenus` permission, background listener/methods, `MSG_CONTEXT_MENUS`, and settings toggle) and floating action button (`ContentFab.js`, `Draggable.js`, `fabManager.js`, `Fab.js`, `STOKEY_FAB`, and runtime hooks).
- Removed YouTube subtitle sidebar list (`YouTubeSubtitleList.js`, `modes.js`), on-player toggle button injection, and floating quick menu (`Menus.js`).
- Subtitle configuration now presents AI sentence breaking (`segSlug`), AI prompt template (`segPromptSlug`), and AI enhanced context (`aiContextSlug`) directly in the main Subtitle options settings page.
- Native YouTube subtitles are reliably hidden using injected `!important` `<style>` sheet and inline offset; CC observer re-binds across SPA navigation without injecting player buttons.
- Global UI defaults and fallbacks are strictly simplified to Chinese (`zh` / `zh_CN`).
- Verification: 32 Jest suites/226 tests pass; Chrome and Web/userscript production builds pass. Both outputs contain v2.0.30 and the current Microsoft endpoint, with no retired auth endpoint.

# Active Work

- [x] Remove non-core feature slices and move the local Agy/Codex bridge out to the standalone `cli2api` service.
- [x] Audit the rejected proof-desk UI against the actual first viewport and task paths.
- [x] Replace the UI contract with the default-dark Nocturne reading console and progressive-disclosure interaction model.
- [x] Rewrite the shell, page setup, rules, subtitles, engines, and Popup around task completion rather than long settings forms.
- [x] Delete the website-rule editor route and merge its only retained job (no-auto-translate site list) into page translation.
- [x] Reorder settings navigation to translation options -> page translation -> subtitles; rename the product to 翻译 and replace extension icons with the translate glyph.
- [x] Fix Popup UI display issues: clean single-line language cards, proper context labels, fallback for unsupported tabs, and anti-overflow dimensions.
- [x] Fix Popup never-translate switch responsiveness and storage reactive sync: resolve message bounce/double-toggle, reload rule state, listen to storage onChanged, and make whole card clickable.
- [x] Wire up LocalAgy streaming translation end-to-end (stream delta parser, default options, SSE pipeline).
- [x] Add permanent never-translate shortcut option (default `Alt+Shift+T`) to toggle sites in/out of the no-auto-translate list.
- [x] Remove right-click context menu and floating ball components, permissions, options, and runtime logic.
- [x] Completely remove YouTube subtitle sidebar list (`YouTubeSubtitleList.js`), floating menu popup (`Menus.js`), and on-player injected buttons.
- [x] Expose AI smart segmentation and AI enhanced context directly in the main Subtitle options settings page.
- [x] Enforce Chinese-only default UI language and fallbacks across manifest, settings, popup, and components.
- [x] Strengthen YouTube native caption hiding via injected style sheet and fix CC observer re-binding across page navigation.
- [x] Fix settings page tab favicon to use local extension icon assets instead of remote upstream URL.
- [x] Run full test suite and rebuild Chrome extension.
- [x] Complete and publish v2.0.29 narrow no-auto-translate website synchronization.
- [x] Repair Microsoft translation/detection after the Edge auth endpoint retirement, handle BuiltinAI same-language skips, and add bounded Google 429 verification-page fallback.
- [x] Add `public/version.txt` to the version synchronization path so force-publishing GitHub Pages preserves update detection.

# Build / Run / Test

- Install dependencies locally: `pnpm install`
- Development web client: `pnpm start`
- Unit tests: `pnpm test -- --watchAll=false`
- Web build: `pnpm build:web`
- Chrome extension build: `pnpm build:chrome`
- Full build for all targets: `pnpm build`
- Archive / Zip release packages: `pnpm zip` (generates `build/chrome.zip`, `build/edge.zip`, `build/firefox.zip`, `build/thunderbird.zip`, `build/userscript.zip`)
- Focused settings tests can be run directly with the project runtime: `node node_modules/react-scripts/bin/react-scripts.js test --watchAll=false --runInBand src/views/Options/index.test.js src/views/Options/Layout.test.js src/views/Options/Apis.test.js src/views/Options/ReusableAutocomplete.test.js src/libs/modelList.test.js`
- Focused provider resilience tests: `node node_modules/react-scripts/bin/react-scripts.js test --watchAll=false --runInBand src/apis/index.test.js src/apis/trans.translate.test.js`
- If the active pnpm wrapper is not the repository-pinned version, run local binaries directly rather than rewriting workspace/package-manager configuration.

# Durable Lessons

- Treat a successful build as an implementation check, not UI acceptance; verify the exact settings route and its visible interactions.
- Route changes and mobile list-to-editor transitions must reset the document scroll position; otherwise a newly selected task can open below its own primary controls.
- `transApis[]` entries are complete translation profiles (provider connection plus one model and request behavior), not independent Provider and Model entities.
- Translator cloud synchronization is intentionally limited to the no-auto-translate domain set. Read `docs/design/site-exclusion-sync.md` before changing its UI, merge, encryption, scheduling, or storage boundary.
- A translation service can be referenced by website rules and three subtitle roles; disabling or deleting a profile must account for every retained consumer without silently rewriting it.
- Options storage hooks must mount after the route's required setting and rule data is current.
- Unsaved settings drafts need route-level protection, including hash-history Back/Forward, not only click handlers on the visible navigation.
- Hiding a route is not feature removal. A removed slice must also leave runtime composition, messages, storage/sync work, prompts, permissions, and production bundles.
- Browser code cannot spawn Agy or Codex directly. Keep process execution, argv construction, timeouts, cancellation, output limits, and error classification in a loopback-only local companion.
- A successful `cli2api` health/model response proves executable discovery, not provider-account viability. Classify CLI upstream errors separately; the current Agy account can enumerate models but is region-blocked at completion time.
- When LocalAgy reports “无法链接”, check `cli2api` first: nothing listening on `127.0.0.1:17891` means the service is not running. Start it with `uv run cli2api.py` in `C:/Users/Meta/Project/Workspaces/cli2api`, or use the installed Startup-folder VBS for silent auto-start. Auth is disabled by default; a 401 means cli2api was started with a token that is not saved in the extension profile.
- Windows build tasks must invoke the repository-local `react-app-rewired` entrypoint rather than assuming its shim is globally available on `PATH`.
- In MV3 Service Workers (`background.js`), `window` does not exist. Modules shared between Web/Userscript and Extension contexts (`storage.js`, `client.js`, `iframe.js`, `gm.js`, `utils.js`, `request.js`) must never access `window` or `window.localStorage` directly without guarding `typeof window !== "undefined"` and checking extension runtime `browser.storage.local`.
- Unauthenticated vendor web endpoints are drift-prone: verify the exact live request contract before patching. Microsoft now accepts raw string arrays at `edge.microsoft.com/translate/translatetext` without a JWT; Google's legacy `gtx` endpoint may return 429 or a `/sorry` page for a shared proxy exit, so only those explicit signals may activate Google2 fallback and cooldown.

