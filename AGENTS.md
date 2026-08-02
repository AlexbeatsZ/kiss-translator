# Project Goal

- Fork `fishjar/kiss-translator`, add independent settings switches for the floating ball and context menu option, submit a PR, then respond to AI review feedback.

# Lessons Learned

- Current workspace initially had no git repository and no project log.
- The repository's CRA tooling expects a hoisted `node_modules`; with pnpm, local validation needed `pnpm install --frozen-lockfile --ignore-scripts --shamefully-hoist`.
- `pnpm test --findRelatedTests src/views/Options/Setting.js` currently reaches `src/views/Options/index.test.js`, whose `../../libs/log` mock omits `LogLevel` and fails before exercising this change.
- Copilot review caught two issues: disabling/re-enabling context menus should preserve the selected menu type, and the old `handleChange` `contextMenuType` branch became dead code. Fixed by adding `contextMenusEnabled` and keeping `contextMenuType` as the persisted type.

# Task Board

- [completed] Fork and clone upstream repository.
- [completed] Locate floating ball and context menu configuration paths.
- [completed] Add settings switches and wire behavior.
- [completed] Run project validation.
- [completed] Commit, push, open PR, and handle AI review feedback.
- [completed] Build installable Chrome extension and userscript artifacts for local trial.
