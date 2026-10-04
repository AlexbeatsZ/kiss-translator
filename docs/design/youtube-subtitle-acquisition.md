# YouTube subtitle acquisition

## Contract

Subtitle acquisition starts after local settings/blacklist validation and before
site-exclusion synchronization or page translation setup. The provider registers
its message receiver before the page-world interceptor starts. Native CC remains
the display switch; subtitle translation does not force-enable it.

The interceptor observes both XHR and fetch on the same-origin `/api/timedtext`
endpoint. Fetch responses are cloned, leaving the player's promise and body
unchanged. Reused XHR objects have one current load listener. Installation is
idempotent. HTTP status and Retry-After accompany the response body.

Because the userscript runs at document-end, the interceptor can replay at most
one already observed current-video timedtext resource when no new caption request
has been observed since installation. It preserves the exact signed URL and PO
token. It does not manufacture URLs or poll the endpoint.

A healthy original JSON3 response is sufficient to start subtitle processing.
Do not download the watch page merely to rediscover the same selected track.
Watch-page metadata is needed only when recovering an original-language track
from a YouTube auto-translated request. Original-track recovery keeps signature,
token, and unrelated request parameters intact.

## Failure and navigation

429 or a YouTube Sorry HTML document is a rate-limit outcome, not an empty track.
Other HTTP failures, empty bodies, and invalid JSON3 are acquisition failures.
Show an actionable player notification and keep native captions available if
no replacement manager is running. Suppress repeated notifications for 30 seconds.
After 429, suppress the script's original-track recovery requests for at least
60 seconds, respecting Retry-After up to 10 minutes. The script does not control
YouTube's own retries. A healthy response can recover immediately after a node
change; failure does not overwrite a working caption manager.

Reset processing when the URL's video ID changes, including when captions arrive
before `yt-navigate-finish`. A finish event for the already current video must not
discard its newly delivered captions. Recreate detached notification nodes after
player replacement. Hide native captions after a replacement manager starts;
ad completion alone must not hide them.

## Verified incident: 2026-10-04

Video `NdVPNLIawFE` exposed English (US), Indonesian, and Korean ASR tracks.
The visible Korean text baked into the video is separate from these tracks.
The installed script repeatedly attempted to JSON.parse Sorry HTML. CC was on,
native caption DOM was empty, and no translated overlay existed.

Mihomo's live connections routed YouTube through `全局 -> 良心云 ->
🇯🇵日本高速07|BGP|CTCU`. A controlled replay of the identical signed player request
produced:

| Existing node | Caption result |
| --- | --- |
| 良心云 日本高速07 BGP CTCU | HTTP 429, 1103-byte Sorry HTML |
| 良心云 日本高速06 BGP CTCU | HTTP 429, 1103-byte Sorry HTML |
| 良心云 英国伦敦01 CTCU 0.1x | HTTP 200, 1302 JSON3 events, 418974 bytes |
| 宝可梦 新加坡01 Vless | TLS/decryption failure; caption status unknown |
| 白嫖机场 台湾家宽1 GPT | TLS connection failure; caption status unknown |

Opening the same video in Chrome through the successful UK node restored native
Korean captions and the installed script's Chinese translations. Test selections
were restored to their original values. This confirms egress-dependent blocking;
it does not establish Google's private rate-limit threshold or that the script
caused the initial restriction. Persistent node/routing settings were not changed.

## Verification

Run interceptor, caption-track, provider lifecycle, player UI, subtitle manager,
and common-startup tests. Provider tests cover successful processing without watch
metadata, rate-limit recovery, and navigation ordering. Build and publish the
userscript; source push and a Chrome build alone do not deliver the repair.
