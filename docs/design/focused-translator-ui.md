# Focused Translator UI

Read this document before changing the Options shell, Popup, or shared visual tokens.

## Subject and single job

The subject is bilingual reading: a person is moving between source text and translated text while staying on the original page or video. The settings shell's single job is to decide what is translated and which translation engine performs it.

## Aesthetic direction

**Translation proof desk**: a cool, precise reading surface inspired by parallel-text editions and editorial proof marks. It is neither a generic administration dashboard nor an “AI” neon interface.

### Color tokens

- `ink` — `#17211D`: primary copy and strong surfaces;
- `paper` — `#EEF3F1`: cool mineral canvas;
- `sheet` — `#F9FBFA`: editable reading surface;
- `source` — `#425B6B`: source-language labels and secondary text;
- `translation` — `#08775C`: translated state, focus, and primary action;
- `proof` — `#D7694E`: destructive/error proof mark only;
- `rule` — `#BECBC5`: structural dividers and inactive rails.

Do not introduce a purple gradient, evenly distributed rainbow palette, or decorative color that does not encode source, translation, success, or failure.

### Type roles

- Display: `Newsreader` when bundled, then `Iowan Old Style`, `Palatino Linotype`, `Noto Serif SC`, serif. Use only for route titles and the paired-text signature.
- Body: `Noto Sans SC` when bundled, then `Microsoft YaHei UI`, `Aptos`, sans-serif.
- Utility: `IBM Plex Mono` when bundled, then `Cascadia Mono`, monospace. Use for URLs, models, profile identifiers, and compact status labels.

### Layout

Desktop uses a narrow translation rail and a reading sheet rather than a dashboard grid:

```text
┌─ product / status rail ─┬─ source → translation signature ───────────┐
│ Page                    │ Page title              primary action     │
│ Sites                   ├─────────────────────────────────────────────┤
│ Subtitles               │ frequent controls       live context       │
│ Engines                 │                                             │
│                         │ advanced details / editor                    │
└─ version / diagnostics ─┴─────────────────────────────────────────────┘
```

At 390px the rail becomes a compact header plus a horizontal destination strip; content becomes one reading column and sticky actions remain visible.

### Signature

One **paired-text rail** appears at the top of the shell: a source-language line and translated-language line share a baseline with a small direction marker and the active engine. It uses real current settings, not decorative placeholder statistics. It may reveal once on page load; all other motion stays restrained.

Respect `prefers-reduced-motion`, visible keyboard focus, and 44px touch targets.

## Self-critique and revision

The first concept used a warm paper background, large serif headings, numbered navigation, and hairline newspaper columns. That matched a common generated editorial default rather than this product. The revised direction uses a cool mineral canvas, serif only as a restrained source/translation cue, unnumbered destinations, and a paired rail whose structure directly represents bilingual reading.

The visual risk is the paired-text rail. No second signature decoration should compete with it; cards, shadows, icons, and animations remain quiet.

## Copy

- Name controls by what the reader changes: “Translate this page”, “Target language”, “Translation engine”.
- Do not expose “provider adapter”, `apiSlug`, message channels, or storage keys in ordinary copy.
- Errors state the failed action and next step: “Local bridge is offline. Start it, then test again.”
- Empty states invite the relevant action: “Add a translation engine to translate this page.”
