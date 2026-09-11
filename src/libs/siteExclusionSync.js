import {
  DEFAULT_RULE,
  GLOBAL_KEY,
  STOKEY_SITE_EXCLUSION_SYNC,
} from "../config";
import { fetchPatcher } from "./request";
import { getRulesWithDefault, setRules, storage } from "./storage";
import {
  applySiteExclusions,
  createSiteExclusionDocument,
  decryptSiteExclusionDocument,
  encryptSiteExclusionDocument,
  extractSiteExclusions,
  materializeSiteExclusions,
  mergeSiteExclusionDocuments,
  normalizeSiteExclusionDocument,
  recordSiteExclusionChanges,
  siteExclusionDocumentUpdatedAt,
} from "./siteExclusionSyncCore";

const GIST_DESCRIPTION = "kiss translator sync files";
const GIST_FILENAME = "translator-site-exclusions_v1.json";
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

let syncInFlight = null;
let syncTimer = null;

const stableStringify = (value) => {
  const sortValue = (item) => {
    if (Array.isArray(item)) return item.map(sortValue);
    if (!item || typeof item !== "object") return item;
    return Object.fromEntries(
      Object.keys(item)
        .sort()
        .map((key) => [key, sortValue(item[key])])
    );
  };
  return JSON.stringify(sortValue(value));
};

const normalizeGistId = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const parts = new URL(text).pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  } catch {
    return text;
  }
};

const normalizeState = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  return {
    gistId: normalizeGistId(raw.gistId),
    githubToken: String(raw.githubToken || ""),
    encryptionKey: String(raw.encryptionKey || ""),
    deviceId: String(raw.deviceId || ""),
    document: raw.document
      ? normalizeSiteExclusionDocument(raw.document)
      : null,
    lastSyncAt: Number(raw.lastSyncAt || 0),
    dirty: raw.dirty === true,
  };
};

const readState = async () =>
  normalizeState(await storage.getObj(STOKEY_SITE_EXCLUSION_SYNC));

const writeState = async (state) => {
  await storage.setObj(STOKEY_SITE_EXCLUSION_SYNC, state);
  return state;
};

const isConfigured = (state) =>
  Boolean(state?.githubToken && state?.encryptionKey);

const ensureDeviceId = (state) => {
  if (state.deviceId) return state.deviceId;
  if (typeof crypto.randomUUID === "function") {
    state.deviceId = crypto.randomUUID();
  } else {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    state.deviceId = Array.from(bytes, (value) =>
      value.toString(16).padStart(2, "0")
    ).join("");
  }
  return state.deviceId;
};

const githubRequest = async (method, path, token, body) => {
  const response = await fetchPatcher(`https://api.github.com${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!response.ok) {
    const error = new Error(
      data?.message || `GitHub API 请求失败（${response.status}）`
    );
    error.status = response.status;
    throw error;
  }
  return data;
};

const findSyncGist = async (state) => {
  if (state.gistId) {
    try {
      return await githubRequest(
        "GET",
        `/gists/${encodeURIComponent(state.gistId)}`,
        state.githubToken
      );
    } catch (error) {
      if (error.status !== 404) throw error;
      state.gistId = "";
    }
  }

  const gists = await githubRequest(
    "GET",
    "/gists?per_page=100",
    state.githubToken
  );
  const matched = (Array.isArray(gists) ? gists : [])
    .filter((gist) => gist.description === GIST_DESCRIPTION)
    .sort(
      (left, right) =>
        Date.parse(right.updated_at || right.created_at || 0) -
        Date.parse(left.updated_at || left.created_at || 0)
    )[0];
  if (matched?.id) state.gistId = matched.id;
  return matched || null;
};

const readRemoteDocument = async (gist, encryptionKey) => {
  const file = gist?.files?.[GIST_FILENAME];
  if (!file) return null;
  if (file.truncated) {
    throw new Error("远端网站列表异常大，已拒绝覆盖本机数据");
  }

  let rawContent = file.content;
  let content;
  try {
    content = JSON.parse(rawContent);
  } catch {
    if (!file.raw_url) {
      throw new Error("远端网站同步文件损坏");
    }

    const response = await fetchPatcher(file.raw_url, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github.raw+json",
      },
    });
    if (!response.ok) {
      throw new Error(`GitHub Gist 原始文件读取失败（${response.status}）`);
    }
    rawContent = await response.text();
    try {
      content = JSON.parse(rawContent);
    } catch {
      throw new Error("远端网站同步文件损坏");
    }
  }

  return decryptSiteExclusionDocument(content?.value || rawContent, encryptionKey);
};

const uploadDocument = async (state, gist, document) => {
  const encrypted = await encryptSiteExclusionDocument(
    document,
    state.encryptionKey
  );
  const content = JSON.stringify(
    {
      key: GIST_FILENAME,
      value: encrypted,
      updateAt: siteExclusionDocumentUpdatedAt(document),
    },
    null,
    2
  );

  if (!gist) {
    const created = await githubRequest("POST", "/gists", state.githubToken, {
      description: GIST_DESCRIPTION,
      public: false,
      files: { [GIST_FILENAME]: { content } },
    });
    state.gistId = created.id;
    return;
  }

  await githubRequest(
    "PATCH",
    `/gists/${encodeURIComponent(gist.id)}`,
    state.githubToken,
    { files: { [GIST_FILENAME]: { content } } }
  );
  state.gistId = gist.id;
};

const performSync = async (force = false) => {
  const state = await readState();
  if (!isConfigured(state)) {
    if (force) throw new Error("请先填写 GitHub Gist 令牌和加密口令");
    return { skipped: true };
  }

  const rules = await getRulesWithDefault();
  const currentPatterns = extractSiteExclusions(rules, GLOBAL_KEY);
  const deviceId = ensureDeviceId(state);
  const now = Date.now();

  if (state.document) {
    const recordedPatterns = materializeSiteExclusions(state.document);
    if (
      stableStringify(recordedPatterns) !== stableStringify(currentPatterns)
    ) {
      state.document = recordSiteExclusionChanges(
        state.document,
        recordedPatterns,
        currentPatterns,
        now,
        deviceId
      );
      state.dirty = true;
    }
  }

  if (
    !force &&
    !state.dirty &&
    Date.now() - state.lastSyncAt < SYNC_INTERVAL_MS
  ) {
    await writeState(state);
    return { skipped: true };
  }

  const gist = await findSyncGist(state);
  const remoteDocument = await readRemoteDocument(gist, state.encryptionKey);
  const localDocument =
    state.document ||
    createSiteExclusionDocument(
      currentPatterns,
      remoteDocument ? 0 : now,
      deviceId
    );
  const merged = remoteDocument
    ? mergeSiteExclusionDocuments(localDocument, remoteDocument)
    : normalizeSiteExclusionDocument(localDocument);
  const remoteChanged =
    !remoteDocument ||
    stableStringify(remoteDocument) !== stableStringify(merged);

  if (remoteChanged) {
    await uploadDocument(state, gist, merged);
  }

  const mergedPatterns = materializeSiteExclusions(merged);
  if (stableStringify(mergedPatterns) !== stableStringify(currentPatterns)) {
    await setRules(
      applySiteExclusions(rules, mergedPatterns, DEFAULT_RULE, GLOBAL_KEY)
    );
  }

  state.document = merged;
  state.lastSyncAt = Date.now();
  state.dirty = false;
  await writeState(state);
  return {
    skipped: false,
    uploaded: remoteChanged,
    gistId: state.gistId,
    patterns: mergedPatterns,
  };
};

export const syncSiteExclusionsNow = (force = true) => {
  if (!syncInFlight) {
    syncInFlight = performSync(force).finally(() => {
      syncInFlight = null;
    });
  }
  return syncInFlight;
};

const scheduleSync = (delay = 2500) => {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncSiteExclusionsNow(false).catch((error) =>
      console.warn("[翻译] 不自动翻译网站同步失败：", error.message)
    );
  }, delay);
};

export const configureSiteExclusionSync = async ({
  githubToken,
  encryptionKey,
  gistId,
}) => {
  const previous = (await readState()) || {};
  const nextToken = String(githubToken || previous.githubToken || "").trim();
  const nextEncryptionKey = String(
    encryptionKey || previous.encryptionKey || ""
  );
  if (!nextToken) throw new Error("GitHub Gist 令牌不能为空");
  if (nextEncryptionKey.length < 6) {
    throw new Error("同步加密口令至少需要 6 个字符");
  }

  const credentialsChanged =
    nextToken !== previous.githubToken ||
    nextEncryptionKey !== previous.encryptionKey ||
    (gistId && normalizeGistId(gistId) !== previous.gistId);
  const state = {
    ...previous,
    gistId: normalizeGistId(gistId) || previous.gistId || "",
    githubToken: nextToken,
    encryptionKey: nextEncryptionKey,
    deviceId: previous.deviceId || "",
    document: credentialsChanged ? null : previous.document || null,
    lastSyncAt: credentialsChanged ? 0 : Number(previous.lastSyncAt || 0),
    dirty: true,
  };
  ensureDeviceId(state);
  await writeState(state);
  return state;
};

export const markSiteExclusionSyncDirty = async () => {
  const state = await readState();
  if (!isConfigured(state)) return;
  state.dirty = true;
  await writeState(state);
  scheduleSync();
};

export const disconnectSiteExclusionSync = async () => {
  clearTimeout(syncTimer);
  await storage.del(STOKEY_SITE_EXCLUSION_SYNC);
};

export const getSiteExclusionSyncSummary = async () => {
  const state = await readState();
  if (!isConfigured(state)) return "未连接 GitHub Gist";
  const gist = state.gistId
    ? `${state.gistId.slice(0, 8)}…`
    : "等待首次创建或发现";
  const lastSync = state.lastSyncAt
    ? new Date(state.lastSyncAt).toLocaleString()
    : "尚未同步";
  return `已连接 · Gist ${gist} · 上次同步 ${lastSync}${
    state.dirty ? " · 有待上传更改" : ""
  }`;
};

export const trySyncSiteExclusions = async () => {
  try {
    return await syncSiteExclusionsNow(false);
  } catch (error) {
    console.warn("[翻译] 不自动翻译网站同步失败：", error.message);
    return { skipped: true, error };
  }
};
