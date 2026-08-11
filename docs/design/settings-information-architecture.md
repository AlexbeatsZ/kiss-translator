# Settings Information Architecture

## Purpose

Make the settings center understandable without changing the persisted schema or the runtime meaning of existing configuration.

## Domain language

### Translation profile

`setting.transApis[]` does not contain a provider catalog separate from models. Each item is a complete translation profile:

- `apiType`: provider/adapter type.
- `apiSlug`: stable profile identifier referenced elsewhere.
- `apiName`: user-facing profile name.
- `url` and `key`: connection settings.
- `model`: the one model used by this profile.
- request, batching, streaming, context, prompt, and rendering behavior.

The settings UI calls this concept a **translation service** for ordinary users and explains that one AI service profile uses one model. Using multiple models from one provider means duplicating the profile and choosing a different model. Do not introduce a fake standalone model entity without a real data migration and runtime design.

### Website translation rule

A rule defines where and how page translation applies. A rule may reference a translation profile by `apiSlug`:

- The global `*` rule contains the default page-translation profile.
- A site rule can inherit the global value or override it with another profile.
- Rules never edit provider credentials or model configuration.

## Ownership and entry points

### Translation services and models

The `/apis` page is the canonical place to:

- choose the default page-translation service;
- create, duplicate, enable, disable, order, and delete profiles;
- configure endpoint and credentials;
- discover, select, or manually enter the model;
- test and tune request behavior.

The default choice remains persisted as `apiSlug` on the global `*` rule for backward compatibility. No storage schema migration is required.

### Website translation

The `/rules` page owns:

- URL/domain matching;
- translated, ignored, and preserved page regions;
- per-site page scanning and presentation behavior;
- optional per-site translation-service override;
- custom and subscribed site rules.

The global rule does not expose service/model editing. A site override displays the referenced profile and model and links to `/apis` for management.

### General and feature settings

General application behavior, interaction modes, appearance, data tools, and diagnostics remain separate pages. Navigation groups them by user goal instead of presenting one flat list.

## Interaction rules

- Always show page title and a short description.
- Put frequent settings before advanced technical controls.
- Keep primary actions visible; a user must not scroll through a disabled form to find Edit or Save.
- Adding or duplicating a translation profile selects the new profile immediately.
- Switching profiles must not silently discard an unsaved draft.
- Resetting a profile edits the current draft; only Save persists it.
- Unsaved service and rule drafts guard service switches, navigation, browser Back/Forward, rule tabs, accordion collapse, and rule mutations that would replace the edited object.
- Model discovery has an explicit refresh action, reports empty/error states, permits manual entry, and supports keyless local endpoints.
- The service list exposes status and model at a glance and supports search/filtering.
- A service that is referenced by page rules, input translation, selection/dictionary translation, or subtitles cannot be disabled or deleted until those references are changed.
- On narrow screens, navigation becomes a drawer and list/detail layouts avoid hiding the detail editor below a very long list.
- Settings routes do not mount storage consumers until the data required by that route has finished synchronizing.

## Compatibility constraints

- Preserve `apiSlug` values and all existing `transApis[]` fields.
- Preserve rule inheritance via the `"*"` sentinel and `GLOBAL_KEY`.
- Do not rewrite references held by input, selection, subtitle, dictionary, playground, or site-rule settings.
- Disabled profiles remain unavailable as new selector choices but stay stored and remain visible wherever an existing reference must be repaired.
- Existing imported/exported configuration must retain its current shape.

## Acceptance checks

- A first-time user can identify where to manage a provider and its model from navigation and page copy.
- The default page-translation service can be changed from `/apis` and still drives the global rule at runtime.
- A site rule clearly distinguishes page scope from an optional service override.
- A configured model is visible in the service list and editor without hunting through advanced controls.
- Add, duplicate, model refresh, save/discard, service switching, and rule-to-service deep links behave predictably.
- Browser Back/Forward and rule enable/disable actions cannot silently discard a draft.
- Referenced services cannot be disabled or deleted without first updating every affected feature.
- Desktop and narrow-screen settings routes remain usable.
- Targeted tests and the Chrome extension build pass, followed by visual verification of the actual options page.
