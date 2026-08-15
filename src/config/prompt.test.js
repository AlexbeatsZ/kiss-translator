import {
  DEFAULT_BATCH_PROMPT_SLUG,
  DEFAULT_NOBATCH_PROMPT_SLUG,
  DEFAULT_SUBTITLE_PROMPT_SLUG,
  PRESET_PROMPTS,
  PROMPT_MODE_FOLLOW_API,
  PROMPT_MODE_GLOBAL,
  PROMPT_TEMPLATE_CATEGORIES,
  SETTINGS_VERSION_V2,
  getPromptDisplayName,
  migrateSettingPromptsToV2,
  normalizeCustomPrompts,
  removeLegacyApiPromptIds,
  removePromptReferences,
  resolveApiPromptSettings,
} from "./prompt";
import {
  API_SPE_TYPES,
  DEFAULT_API_LIST,
  defaultNobatchPrompt,
  defaultNobatchUserPrompt,
  defaultSubtitlePrompt,
  defaultSystemPrompt,
} from "./api";

describe("focused prompt settings", () => {
  test("migrates translation and subtitle prompts without creating dictionary prompts", () => {
    const migrated = migrateSettingPromptsToV2({
      prompts: [],
      transApis: [
        {
          apiSlug: "openai",
          apiName: "OpenAI",
          systemPrompt: "custom batch prompt",
          nobatchPrompt: "custom single prompt",
          nobatchUserPrompt: "custom user prompt",
          subtitlePrompt: "custom subtitle prompt",
          dictPrompt: "legacy dictionary prompt",
        },
      ],
    });
    const api = migrated.transApis[0];

    expect(migrated.version).toBe(SETTINGS_VERSION_V2);
    expect(api.batchPromptSlug).toMatch(/^prompt_migrated_batch_/);
    expect(api.nobatchPromptSlug).toMatch(/^prompt_migrated_nobatch_/);
    expect(api.subtitlePromptSlug).toMatch(/^prompt_migrated_subtitle_/);
    expect(api).not.toHaveProperty("dictPromptSlug");
    expect(migrated.prompts).toHaveLength(3);
  });

  test("resolves the three prompts used by page and subtitle translation", () => {
    const api = DEFAULT_API_LIST.find((item) =>
      API_SPE_TYPES.ai.has(item.apiType)
    );
    const resolved = resolveApiPromptSettings(api);

    expect(resolved).toMatchObject({
      batchPromptSlug: DEFAULT_BATCH_PROMPT_SLUG,
      nobatchPromptSlug: DEFAULT_NOBATCH_PROMPT_SLUG,
      subtitlePromptSlug: DEFAULT_SUBTITLE_PROMPT_SLUG,
      systemPrompt: defaultSystemPrompt,
      nobatchPrompt: defaultNobatchPrompt,
      nobatchUserPrompt: defaultNobatchUserPrompt,
      subtitlePrompt: defaultSubtitlePrompt,
    });
    expect(resolved).not.toHaveProperty("dictPrompt");
  });

  test("cleans page and subtitle prompt references", () => {
    const cleaned = removePromptReferences(
      {
        transApis: [
          {
            batchPromptSlug: "prompt_deleted",
            nobatchPromptSlug: "prompt_deleted",
            subtitlePromptSlug: "prompt_deleted",
            systemPrompt: "batch",
            nobatchPrompt: "single",
            subtitlePrompt: "subtitle",
          },
        ],
        subtitleSetting: {
          segPromptMode: PROMPT_MODE_GLOBAL,
          segPromptSlug: "prompt_deleted",
        },
      },
      "prompt_deleted"
    );

    expect(cleaned.transApis[0]).toMatchObject({
      batchPromptSlug: DEFAULT_BATCH_PROMPT_SLUG,
      nobatchPromptSlug: DEFAULT_NOBATCH_PROMPT_SLUG,
      subtitlePromptSlug: DEFAULT_SUBTITLE_PROMPT_SLUG,
    });
    expect(cleaned.subtitleSetting).toMatchObject({
      segPromptMode: PROMPT_MODE_FOLLOW_API,
      segPromptSlug: DEFAULT_SUBTITLE_PROMPT_SLUG,
    });
  });

  test("removes all legacy prompt id fields, including retired dictionary ids", () => {
    const cleaned = removeLegacyApiPromptIds({
      batchPromptId: "batch",
      nobatchPromptId: "single",
      subtitlePromptId: "subtitle",
      dictPromptId: "dictionary",
    });

    expect(cleaned).not.toHaveProperty("batchPromptId");
    expect(cleaned).not.toHaveProperty("nobatchPromptId");
    expect(cleaned).not.toHaveProperty("subtitlePromptId");
    expect(cleaned).not.toHaveProperty("dictPromptId");
  });

  test("keeps translated preset labels and excludes dictionary categories", () => {
    const preset = PRESET_PROMPTS[0];
    const i18n = jest.fn((key, fallback) => `${key}:${fallback}`);
    const custom = normalizeCustomPrompts([
      {
        slug: "prompt_custom",
        category: "user prompt",
        nameKey: "ignored_for_custom",
        name: "Custom prompt",
        systemPrompt: "system",
        userPrompt: "user",
      },
    ]);

    expect(getPromptDisplayName(preset, i18n)).toBe(
      `${preset.nameKey}:${preset.name}`
    );
    expect(custom[0]).not.toHaveProperty("nameKey");
    expect(PROMPT_TEMPLATE_CATEGORIES).toEqual([
      "user prompt",
      "batch system prompt",
      "subtitle prompt",
    ]);
  });
});
