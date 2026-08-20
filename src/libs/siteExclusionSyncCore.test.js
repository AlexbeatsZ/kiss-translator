import { webcrypto } from "node:crypto";
import { TextDecoder, TextEncoder } from "node:util";
import {
  applySiteExclusions,
  createSiteExclusionDocument,
  decryptSiteExclusionDocument,
  encryptSiteExclusionDocument,
  extractSiteExclusions,
  materializeSiteExclusions,
  mergeSiteExclusionDocuments,
  recordSiteExclusionChanges,
} from "./siteExclusionSyncCore";

beforeAll(() => {
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: webcrypto,
  });
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
});

test("extracts only non-global rules whose auto translation is disabled", () => {
  expect(
    extractSiteExclusions([
      { pattern: "*", transOpen: "false" },
      { pattern: "chatgpt.com", transOpen: "false", apiSlug: "private" },
      { pattern: "example.com", transOpen: "true" },
      { pattern: "docs.example", transOpen: "*" },
    ])
  ).toEqual(["chatgpt.com"]);
});

test("applies the synced list without replacing unrelated settings or rules", () => {
  const defaultRule = { apiSlug: "*", transOpen: "*", selector: "" };
  const rules = [
    { pattern: "*", transOpen: "true", apiSlug: "microsoft" },
    {
      pattern: "legacy.example",
      transOpen: "false",
      apiSlug: "local-only",
      selector: "article",
    },
    { ...defaultRule, pattern: "remove.example", transOpen: "false" },
    { pattern: "keep.example", transOpen: "true", apiSlug: "custom" },
  ];

  const applied = applySiteExclusions(rules, ["chatgpt.com"], defaultRule);

  expect(applied).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        pattern: "*",
        transOpen: "true",
        apiSlug: "microsoft",
      }),
      expect.objectContaining({
        pattern: "legacy.example",
        transOpen: "*",
        apiSlug: "local-only",
        selector: "article",
      }),
      expect.objectContaining({
        pattern: "keep.example",
        transOpen: "true",
        apiSlug: "custom",
      }),
      expect.objectContaining({
        pattern: "chatgpt.com",
        transOpen: "false",
      }),
    ])
  );
  expect(applied.some(({ pattern }) => pattern === "remove.example")).toBe(
    false
  );
});

test("merges additions and deletion tombstones per website", () => {
  const base = createSiteExclusionDocument(
    ["chatgpt.com", "example.com"],
    10,
    "device-a"
  );
  const local = recordSiteExclusionChanges(
    base,
    ["chatgpt.com", "example.com"],
    ["chatgpt.com"],
    30,
    "device-a"
  );
  const remote = createSiteExclusionDocument(
    ["example.com", "other.example"],
    20,
    "device-b"
  );

  expect(
    materializeSiteExclusions(mergeSiteExclusionDocuments(local, remote))
  ).toEqual(["chatgpt.com", "other.example"]);
});

test("encrypts website patterns and refuses a wrong passphrase", async () => {
  const document = createSiteExclusionDocument(["chatgpt.com"], 10, "device-a");
  const encrypted = await encryptSiteExclusionDocument(
    document,
    "correct horse battery staple"
  );

  expect(encrypted).not.toContain("chatgpt.com");
  await expect(
    decryptSiteExclusionDocument(encrypted, "correct horse battery staple")
  ).resolves.toEqual(document);
  await expect(
    decryptSiteExclusionDocument(encrypted, "wrong passphrase")
  ).rejects.toThrow("无法解密同步数据");
});
