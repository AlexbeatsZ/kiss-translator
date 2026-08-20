# No-auto-translate site synchronization

Read this document before changing Translator cloud synchronization, the no-auto-translate website list, its storage representation, or GitHub credential handling.

## Scope boundary

The only Translator business data allowed into remote synchronization is the set of non-global rule patterns whose `transOpen` value is exactly `"false"`.

The following data is explicitly local-only and must never be included in the remote document:

- source or target language;
- translation engine/profile selection;
- provider URLs, models, API keys, authorization headers, or prompts;
- page display order, translation-only mode, tuning, diagnostics, or shortcuts;
- subtitle configuration;
- selectors, injected code, custom styles, subscribed rules, or any other website-rule field.

The sync implementation derives a sorted domain-pattern list from the rule store. It does not serialize the full rule store or global settings.

## Remote storage and credentials

Translator and Dark Model can use the same GitHub Secret Gist, with separate files. Translator writes `translator-site-exclusions_v1.json`; Dark Model writes `dark-model-config_v1.json`.

A Secret Gist is unlisted, not access-controlled. The document body is therefore encrypted with AES-256-GCM using PBKDF2-HMAC-SHA-256, 100,000 iterations, a fresh 16-byte salt, and a fresh 12-byte IV for every upload.

Each device stores the following only in its local extension/userscript storage:

- a dedicated classic GitHub PAT with only the `gist` scope;
- an independent encryption passphrase of at least six characters;
- the Gist id, a random device id, the last merged document, and scheduling metadata.

Credentials must never appear in logs, exports, repository files, Issues, or documentation examples using real values. A decryption error is a hard stop and must not trigger an upload.

## Merge model

The decrypted document is a versioned map keyed by domain pattern. Every entry stores an included/excluded boolean, `updatedAt`, and `deviceId`. A false entry is a deletion tombstone.

Merge is last-writer-wins per domain. `updatedAt` is primary and `deviceId` is the deterministic tie-breaker. Unique entries from either device are retained. Tombstones prevent an offline device from resurrecting an older deletion.

When applying the merged list locally:

- the global `*` rule is never changed;
- an existing site rule keeps all unrelated fields and only receives `transOpen: "false"`;
- removing an exclusion deletes a simple exclusion-only rule;
- if a legacy rule contains other custom fields, it is preserved and its `transOpen` falls back to `"*"`.

## Scheduling and UI

The visible sync card sits immediately after the no-auto-translate website list. It states the narrow data scope, accepts the dedicated PAT and passphrase directly, and supports optional Gist id override, manual sync, and local credential removal.

Local list edits mark synchronization dirty. The next scheduled attempt uploads them, and every top-level userscript page checks for unrecorded list changes before applying the 24-hour pull interval. Manual sync always bypasses the interval.

## Acceptance

- Pure tests prove that only `pattern + transOpen=false` entries are extracted.
- Applying remote data preserves global settings, translation profiles, unrelated rules, and unrelated rule fields.
- Tests cover per-domain merge, deletion tombstones, encrypted round trips, and wrong-passphrase refusal.
- Production userscript and Chrome builds succeed.
- The published settings page visibly exposes the sync card immediately below the website list.
