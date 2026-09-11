# No-auto-translate site synchronization

Read this document before changing Translator synchronization, the no-auto-translate website list, its storage representation, or the local sync transport.

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

## Transport and server

The browser always talks to `http://127.0.0.1:17892`. It never contains a Tailnet hostname, GitHub token, or remote-service credential.

ROG is the authoritative sync host. A small self-hosted service listens only on ROG loopback port `17892`. OMEN and Mac expose the same loopback port locally through persistent SSH local-forward tunnels that connect to ROG over Tailscale. The server is therefore unreachable from the public network and does not require a public listener or Tailscale Funnel/Serve rule.

The server stores only the synchronization document and encrypts it at rest with AES-256-GCM using a random 32-byte key stored locally on ROG. The transport between OMEN/Mac and ROG is protected by SSH over the Tailnet. Browser storage contains no GitHub PAT or shared encryption passphrase.

The server data and key are operational state and must not be committed to a repository. Logs must not contain synced domain lists or encryption keys.

## Merge model

The document is a versioned map keyed by domain pattern. Every entry stores an included/excluded boolean, `updatedAt`, and `deviceId`. A false entry is a deletion tombstone.

Merge is last-writer-wins per domain. `updatedAt` is primary and `deviceId` is the deterministic tie-breaker. Unique entries from either device are retained. Tombstones prevent an offline device from resurrecting an older deletion.

When applying the merged list locally:

- the global `*` rule is never changed;
- an existing site rule keeps all unrelated fields and only receives `transOpen: "false"`;
- removing an exclusion deletes a simple exclusion-only rule;
- if a legacy rule contains other custom fields, it is preserved and its `transOpen` falls back to `"*"`.

## Migration from GitHub Gist

Existing local sync state may contain a GitHub token, Gist id, encryption passphrase, and last merged document from versions before 2.0.33. The new state normalizer intentionally retains only `deviceId`, the last merged document, timestamps, and dirty state. The first successful write therefore removes old Gist credentials from browser storage without needing to read or log them.

The current local rule list and retained last-merged document seed the new ROG document. The old Gist is not deleted automatically and remains an external rollback source until the user chooses to remove it.

## Scheduling and UI

The visible sync card sits immediately after the no-auto-translate website list. It states the narrow data scope and the Tailscale/ROG topology. There are no PAT, Gist id, or passphrase fields. Manual sync always bypasses the 24-hour pull interval.

Local list edits mark synchronization dirty. The next scheduled attempt uploads them, and every top-level userscript page checks for unrecorded list changes before applying the 24-hour pull interval.

## Acceptance

- Pure tests prove that only `pattern + transOpen=false` entries are extracted.
- Applying remote data preserves global settings, translation profiles, unrelated rules, and unrelated rule fields.
- Tests cover per-domain merge and deletion tombstones.
- The ROG service accepts only loopback connections, encrypts its data file at rest, and survives restart.
- OMEN and Mac local port `17892` reach the ROG health endpoint only through persistent SSH tunnels over Tailscale.
- Production userscript build succeeds and contains only the loopback sync endpoint.
- The published settings page visibly exposes the Tailscale sync card immediately below the website list.
