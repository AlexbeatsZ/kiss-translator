import { checkRules, matchRule, toggleSiteExclusion } from "./rules";
import { getDisabledSubRules, getRulesWithDefault, setRules } from "./storage";
import { loadOrFetchSubRules } from "./subRules";

jest.mock("./storage", () => ({
  getRulesWithDefault: jest.fn(),
  setRules: jest.fn(),
  getDisabledSubRules: jest.fn(),
}));

jest.mock("./subRules", () => ({
  loadOrFetchSubRules: jest.fn(),
}));

jest.mock("./log", () => ({
  kissLog: jest.fn(),
  LogLevel: {
    INFO: { value: 3 },
  },
}));

describe("rules enabled state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getDisabledSubRules.mockResolvedValue([]);
    loadOrFetchSubRules.mockResolvedValue([]);
  });

  test("matches legacy personal rules without enabled field", async () => {
    getRulesWithDefault.mockResolvedValue([
      {
        pattern: "example.com",
        selector: "article",
      },
      {
        pattern: "*",
        selector: "p",
        transOpen: "false",
      },
    ]);

    const rule = await matchRule("https://example.com/post", {
      injectRules: false,
      subrulesList: [],
    });

    expect(rule.pattern).toBe("example.com");
    expect(rule.selector).toBe("article");
  });

  test("skips disabled personal rules and falls back to subscription rules", async () => {
    getRulesWithDefault.mockResolvedValue([
      {
        pattern: "example.com",
        enabled: false,
        selector: "article",
      },
      {
        pattern: "*",
        selector: "p",
        transOpen: "false",
      },
    ]);
    loadOrFetchSubRules.mockResolvedValue([
      {
        pattern: "example.com",
        selector: ".sub-rule",
      },
    ]);

    const rule = await matchRule("https://example.com/post", {
      injectRules: true,
      subrulesList: [
        { url: "https://rules.example/main.json", selected: true },
      ],
    });

    expect(rule.pattern).toBe("example.com");
    expect(rule.selector).toBe(".sub-rule");
  });

  test("skips disabled personal rules and falls back to global rules", async () => {
    getRulesWithDefault.mockResolvedValue([
      {
        pattern: "example.com",
        enabled: false,
        selector: "article",
      },
      {
        pattern: "*",
        selector: "p",
        transOpen: "false",
      },
    ]);

    const rule = await matchRule("https://example.com/post", {
      injectRules: false,
      subrulesList: [],
    });

    expect(rule.pattern).toBe("*");
    expect(rule.selector).toBe("p");
  });

  test("normalizes enabled field when checking imported rules", () => {
    const rules = checkRules([
      {
        pattern: "disabled.example",
        enabled: false,
      },
      {
        pattern: "invalid.example",
        enabled: "false",
      },
      {
        pattern: "legacy.example",
      },
    ]);

    expect(rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          pattern: "disabled.example",
          enabled: false,
        }),
        expect.objectContaining({
          pattern: "invalid.example",
          enabled: true,
        }),
        expect.objectContaining({
          pattern: "legacy.example",
          enabled: true,
        }),
      ])
    );
  });
});

describe("toggleSiteExclusion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("adds a site to never-translate when not in list", async () => {
    getRulesWithDefault.mockResolvedValue([
      { pattern: "*", selector: "p" },
    ]);

    const result = await toggleSiteExclusion("github.com");

    expect(result.isNeverTranslate).toBe(true);
    expect(result.pattern).toBe("github.com");
    expect(setRules).toHaveBeenCalledWith([
      expect.objectContaining({
        pattern: "github.com",
        transOpen: "false",
      }),
      expect.objectContaining({ pattern: "*" }),
    ]);
  });

  test("removes a site from never-translate when currently excluded", async () => {
    getRulesWithDefault.mockResolvedValue([
      { pattern: "github.com", transOpen: "false" },
      { pattern: "*", selector: "p" },
    ]);

    const result = await toggleSiteExclusion("https://github.com/repo");

    expect(result.isNeverTranslate).toBe(false);
    expect(result.pattern).toBe("github.com");
    expect(setRules).toHaveBeenCalledWith([
      expect.objectContaining({ pattern: "*" }),
    ]);
  });
});
