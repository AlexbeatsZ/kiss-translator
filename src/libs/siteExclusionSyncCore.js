const SCHEMA_VERSION = 1;
const CRYPTO_VERSION = 1;
const CRYPTO_ALGORITHM = "AES-GCM";
const CRYPTO_KDF = "PBKDF2-SHA-256";
const CRYPTO_ITERATIONS = 100000;

const encodeText = (value) => new TextEncoder().encode(value);
const decodeText = (value) => new TextDecoder().decode(value);

const clone = (value) =>
  value === undefined ? undefined : JSON.parse(JSON.stringify(value));

const normalizePattern = (value) => String(value || "").trim();

const normalizePatterns = (patterns) =>
  [...new Set((Array.isArray(patterns) ? patterns : []).map(normalizePattern))]
    .filter(Boolean)
    .sort();

const normalizeEntry = (entry) => {
  if (!entry || typeof entry !== "object") return null;
  return {
    value: entry.value === true,
    updatedAt: Number.isFinite(Number(entry.updatedAt))
      ? Number(entry.updatedAt)
      : 0,
    deviceId: String(entry.deviceId || ""),
  };
};

export const normalizeSiteExclusionDocument = (raw) => {
  const source = raw && typeof raw === "object" ? raw : {};
  const sites = {};
  if (source.sites && typeof source.sites === "object") {
    for (const [pattern, rawEntry] of Object.entries(source.sites)) {
      const key = normalizePattern(pattern);
      const entry = normalizeEntry(rawEntry);
      if (key && entry) sites[key] = entry;
    }
  }
  return { schema: SCHEMA_VERSION, sites };
};

export const createSiteExclusionDocument = (patterns, updatedAt, deviceId) => {
  const timestamp = Number.isFinite(Number(updatedAt)) ? Number(updatedAt) : 0;
  const id = String(deviceId || "");
  const sites = {};
  for (const pattern of normalizePatterns(patterns)) {
    sites[pattern] = { value: true, updatedAt: timestamp, deviceId: id };
  }
  return { schema: SCHEMA_VERSION, sites };
};

const entryWins = (candidate, current) => {
  if (!current) return true;
  if (candidate.updatedAt !== current.updatedAt) {
    return candidate.updatedAt > current.updatedAt;
  }
  if (candidate.deviceId !== current.deviceId) {
    return candidate.deviceId > current.deviceId;
  }
  return Number(candidate.value) > Number(current.value);
};

export const mergeSiteExclusionDocuments = (left, right) => {
  const result = normalizeSiteExclusionDocument(left);
  const incoming = normalizeSiteExclusionDocument(right);
  for (const [pattern, entry] of Object.entries(incoming.sites)) {
    if (entryWins(entry, result.sites[pattern])) {
      result.sites[pattern] = clone(entry);
    }
  }
  return normalizeSiteExclusionDocument(result);
};

export const recordSiteExclusionChanges = (
  document,
  previousPatterns,
  nextPatterns,
  updatedAt,
  deviceId
) => {
  const result = normalizeSiteExclusionDocument(document);
  const previous = new Set(normalizePatterns(previousPatterns));
  const next = new Set(normalizePatterns(nextPatterns));
  const timestamp = Number(updatedAt);
  const id = String(deviceId || "");
  const patterns = new Set([...previous, ...next]);

  for (const pattern of patterns) {
    if (previous.has(pattern) !== next.has(pattern)) {
      result.sites[pattern] = {
        value: next.has(pattern),
        updatedAt: timestamp,
        deviceId: id,
      };
    }
  }
  return normalizeSiteExclusionDocument(result);
};

export const materializeSiteExclusions = (document) =>
  Object.entries(normalizeSiteExclusionDocument(document).sites)
    .filter(([, entry]) => entry.value)
    .map(([pattern]) => pattern)
    .sort();

export const siteExclusionDocumentUpdatedAt = (document) =>
  Math.max(
    ...Object.values(normalizeSiteExclusionDocument(document).sites).map(
      (entry) => entry.updatedAt
    ),
    0
  );

export const extractSiteExclusions = (rules, globalPattern = "*") =>
  normalizePatterns(
    (Array.isArray(rules) ? rules : [])
      .filter(
        (rule) => rule?.pattern !== globalPattern && rule?.transOpen === "false"
      )
      .map((rule) => rule.pattern)
  );

const isExclusionOnlyRule = (rule, defaultRule) =>
  Object.entries(rule || {}).every(([key, value]) => {
    if (key === "pattern" || key === "transOpen") return true;
    return value === defaultRule?.[key];
  });

export const applySiteExclusions = (
  rules,
  patterns,
  defaultRule,
  globalPattern = "*"
) => {
  const desired = new Set(normalizePatterns(patterns));
  const seen = new Set();
  const nextRules = [];

  for (const rawRule of Array.isArray(rules) ? rules : []) {
    const rule = clone(rawRule);
    const pattern = normalizePattern(rule?.pattern);
    if (!pattern || seen.has(pattern)) continue;
    seen.add(pattern);

    if (pattern === globalPattern) {
      nextRules.push(rule);
      continue;
    }

    if (desired.has(pattern)) {
      nextRules.push({ ...rule, transOpen: "false" });
      desired.delete(pattern);
      continue;
    }

    if (rule.transOpen === "false") {
      if (!isExclusionOnlyRule(rule, defaultRule)) {
        nextRules.push({ ...rule, transOpen: globalPattern });
      }
      continue;
    }

    nextRules.push(rule);
  }

  const additions = [...desired].map((pattern) => ({
    ...clone(defaultRule),
    pattern,
    transOpen: "false",
  }));
  return [...additions, ...nextRules];
};

const bytesToBase64 = (bytes) => {
  let binary = "";
  for (const value of bytes) binary += String.fromCharCode(value);
  return btoa(binary);
};

const base64ToBytes = (value) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const deriveKey = async (passphrase, salt) => {
  if (String(passphrase || "").length < 6) {
    throw new Error("同步加密口令至少需要 6 个字符");
  }
  const material = await crypto.subtle.importKey(
    "raw",
    encodeText(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: CRYPTO_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    { name: CRYPTO_ALGORITHM, length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

export const encryptSiteExclusionDocument = async (document, passphrase) => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: CRYPTO_ALGORITHM, iv },
    key,
    encodeText(JSON.stringify(normalizeSiteExclusionDocument(document)))
  );
  return JSON.stringify({
    encrypted: true,
    version: CRYPTO_VERSION,
    alg: CRYPTO_ALGORITHM,
    kdf: CRYPTO_KDF,
    iterations: CRYPTO_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(ciphertext)),
  });
};

export const decryptSiteExclusionDocument = async (value, passphrase) => {
  let envelope;
  try {
    envelope = JSON.parse(value);
  } catch {
    throw new Error("远端同步文件不是有效 JSON");
  }
  if (!envelope?.encrypted) {
    return normalizeSiteExclusionDocument(envelope);
  }
  if (
    envelope.version !== CRYPTO_VERSION ||
    envelope.alg !== CRYPTO_ALGORITHM ||
    envelope.kdf !== CRYPTO_KDF ||
    envelope.iterations !== CRYPTO_ITERATIONS
  ) {
    throw new Error("不支持的同步加密格式");
  }

  const key = await deriveKey(passphrase, base64ToBytes(envelope.salt));
  let plaintext;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: CRYPTO_ALGORITHM, iv: base64ToBytes(envelope.iv) },
      key,
      base64ToBytes(envelope.data)
    );
  } catch {
    throw new Error("无法解密同步数据，请检查加密口令");
  }
  return normalizeSiteExclusionDocument(JSON.parse(decodeText(plaintext)));
};
