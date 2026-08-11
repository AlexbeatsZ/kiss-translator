# Goal

Improve the settings experience so translation scope rules, translation services, and models have clear responsibilities and predictable management paths, while preserving existing stored configuration and extension behavior.

# Current State

- Version: `2.0.28`
- Branch: `feat/settings-menu-switches`
- Baseline commit: `daa82b6`
- UI stack: React 18, Material UI 5, React Router 6.
- Settings UI lives under `src/views/Options/`; runtime configuration lives under `src/config/` and `src/hooks/`.
- Settings navigation is grouped by user goal and uses responsive page headers, cards, and a mobile drawer.
- `/apis` is the canonical translation-service/model manager; `/rules` owns website scope and optional per-site service overrides. Existing storage fields and `apiSlug` references are unchanged.
- Settings routes mount only after their required setting/rule/word syncs finish, and sync tasks that share `syncMeta` run sequentially.
- Known test-infrastructure issue: `src/libs/storage.test.js` cannot be collected by Jest 27 because `@streamparser/json` exposes an ESM entry that the current transform ignores. The other 44 suites/299 tests pass.
- Settings information architecture: `docs/design/settings-information-architecture.md` (read before changing Options navigation, Rules, Apis, or their persisted responsibilities).

# Active Work

- [x] Audit the current settings information architecture and persisted data flow.
- [x] Define and document the responsibilities of translation settings, services/models, and site rules.
- [x] Implement the redesigned settings navigation and interactions.
- [x] Add or update targeted tests for compatibility and key interactions.
- [x] Build and visually verify the actual settings page on desktop and a 390px viewport.

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
- A translation service can be referenced by website rules, input translation, selection/dictionary translation, and three subtitle roles; disabling or deleting a profile must account for every consumer without silently rewriting them.
- Options storage hooks must mount after the route's required sync data is current. The sync functions share a read-modify-write `syncMeta`, so concurrent startup syncs can lose metadata.
- Unsaved settings drafts need route-level protection, including hash-history Back/Forward, not only click handlers on the visible navigation.
