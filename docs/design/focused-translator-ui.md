# Focused Translator UX

Read this document before changing the Options shell, Popup, or shared visual tokens.

## Product job

KISS Translator has two outcomes: translate the page being read and translate the subtitles being watched. The settings experience must help a reader reach either outcome without first understanding providers, rules, request batching, selectors, or storage.

The default path answers four questions in this order:

1. Which translation engine should do the work?
2. What should be translated: page or subtitles?
3. From which language to which language?
4. How should the source and translation be shown?

Everything else is troubleshooting, tuning, or site-specific customization and must be progressively disclosed.

## Interaction model

### Translation options

The first navigation destination and landing view is the engine list and selected editor. Search and Add belong to the list. The selected engine can be made the page default from its own header.

### Page translation

The page translation view contains only the default source language, target language, engine, automatic-start choice, bilingual/translation-only presentation, and the no-auto-translate website list. Advanced tuning, shortcuts, diagnostics, and backup remain collapsed accordions. The old website-rule editor with CSS selectors, hooks, and page-scope fields is removed rather than hidden.

### Subtitles

The first section contains enable/disable, engine, target language, bilingual mode, and display order. Sentence flow is a second task. Timing thresholds, notifications, and compatibility switches live in an advanced accordion. Appearance has a live preview.

### Translation engines

The engine list and selected editor appear immediately in the first viewport. Search and Add belong to the list. The selected engine can be made the page default from its own header. Connection, translation behavior, and advanced maintenance are separate editor modes. Bulk operations and explanatory alerts do not precede the editor.

On a narrow viewport, the engine list and editor are separate views with an explicit Back action; they are not two long panels stacked on one page.

### Saving

Global page and subtitle choices save immediately. Engine and site-rule editors use an explicit Save/Discard draft. Leaving or switching while a draft is dirty must ask once and preserve the current editor when cancelled.

## Aesthetic direction

**Nocturne reading console**: a compact dark workspace inspired by the focus of an e-reader at night and the directional flow of parallel translation. It is an application surface, not an editorial poster or an infrastructure dashboard.

Dark is the default for new installations. Light and system modes remain available.

### Color tokens

- `canvas` — `#0B0D12`: the uninterrupted night-reading background;
- `rail` — `#0F131B`: navigation and fixed controls;
- `surface` — `#151A24`: primary editable panels;
- `surfaceRaised` — `#1B2230`: hover, selected, and nested controls;
- `ink` — `#F2F4F8`: primary text;
- `muted` — `#98A2B3`: explanations and inactive text;
- `source` — `#D6A96F`: source-language state;
- `translation` — `#7C9CFF`: translation state, focus, and primary actions;
- `success` — `#5DD6A3`: connected or ready state;
- `danger` — `#FF7A90`: destructive actions and failures;
- `rule` — `#293142`: borders and dividers.

Avoid green-on-green surfaces, dotted paper textures, purple gradients, oversized white cards, and decorative colors that do not represent source, translation, readiness, or failure.

### Type roles

- Display and body: `Segoe UI Variable`, `Aptos`, `Noto Sans SC`, sans-serif. Product titles use a tighter display cut rather than a serif headline.
- Utility: `JetBrains Mono`, `Cascadia Mono`, monospace. Use for model names, URLs, and compact state labels only.

### Layout

Desktop is a compact application shell:

```text
┌ navigation ─────┬ route / status ──────────────────────────────┐
│ Page setup      │ source  →  engine  →  target                │
│ Website rules   ├──────────────────────────────────────────────┤
│ Subtitles       │ primary task                                │
│ Engines         │                                              │
│                 │ secondary task / advanced disclosure         │
│ version/status  │                                              │
└─────────────────┴──────────────────────────────────────────────┘
```

At 390px, navigation becomes a fixed four-destination bottom bar. Content is one column, primary actions stay visible, and no horizontally scrolling navigation strip is used.

### Signature

The memorable element is the **translation flow**: source, engine, and target are shown as one connected directional control. It is real configuration and doubles as orientation; it is not duplicated as a decorative preview.

Motion is limited to view transitions, save status, and the active flow. Respect `prefers-reduced-motion`, visible keyboard focus, and 44px touch targets.

## Why the previous direction was rejected

The previous “translation proof desk” changed colors, typography, and card styling while preserving the old interaction structure. Oversized headers, a decorative bilingual preview, a global version alert, stacked explanation cards, and dense four-column forms pushed the actual task below the first viewport. The engine page displayed no engine or editor until the user scrolled.

This revision removes those layers, defaults to a deliberate dark console, and treats viewport space, click count, disclosure, and mobile navigation as product behavior rather than decoration.

## Copy

- Use the reader's task: “Page setup”, “Subtitles”, “Use for page translation”, “Test connection”.
- Do not expose `apiSlug`, message channels, storage keys, or adapter terminology in ordinary copy.
- Labels are short; helper text appears only when it changes a decision.
- Errors name the failed action and the next step.
