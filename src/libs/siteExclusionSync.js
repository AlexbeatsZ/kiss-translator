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
  extractSiteExclusions,
  materializeSiteExclusions,
  mergeSiteExclusionDocuments,
  normalizeSiteExclusionDocument,
  recordSiteExclusionChanges,
} from "./siteExclusionSyncCore";

const LOCAL_SYNC_ENDPOINT = "http://127.0.0.1:17892";
const SYNC_INTERVAL_MS = 60 * 60 * 1000;

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

const normalizeState = (raw) => {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    deviceId: String(source.deviceId || ""),
    document: source.document
      ? normalizeSiteExclusionDocument(source.document)
      : null,
    lastSyncAt: Number(source.lastSyncAt || 0),
    dirty: source.dirty === true,
  };
};

const readState = async () =>
  normalizeState(await storage.getObj(STOKEY_SITE_EXCLUSION_SYNC));

const writeState = async (state) => {
  await storage.setObj(STOKEY_SITE_EXCLUSION_SYNC, state);
  return state;
};

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

const localSyncRequest = async (method, path, body) => {
  const response = await fetchPatcher(`${LOCAL_SYNC_ENDPOINT}${path}`, {
    method,
    headers: {
      Accept: "application/json",
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
      data?.message || `本地同步代理请求失败（${response.status}）`
    );
    error.status = response.status;
    throw error;
  }
  return data;
};

const readRemoteDocument = async () => {
  const data = await localSyncRequest("GET", "/v1/site-exclusions");
  if (!data?.document) return null;
  return normalizeSiteExclusionDocument(data.document);
};

const uploadDocument = async (document) => {
  await localSyncRequest("PUT", "/v1/site-exclusions", {
    document: normalizeSiteExclusionDocument(document),
  });
};

const performSync = async (force = false) => {
  const state = await readState();
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

  const remoteDocument = await readRemoteDocument();
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
    await uploadDocument(merged);
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
    backend: "tailscale-loopback",
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

export const configureSiteExclusionSync = async () => {
  await localSyncRequest("GET", "/health");
  const state = await readState();
  state.dirty = true;
  ensureDeviceId(state);
  await writeState(state);
  return state;
};

export const markSiteExclusionSyncDirty = async () => {
  const state = await readState();
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
  try {
    await localSyncRequest("GET", "/health");
  } catch (error) {
    return `Tailscale 同步代理未连接：${error.message}`;
  }
  const lastSync = state.lastSyncAt
    ? new Date(state.lastSyncAt).toLocaleString()
    : "尚未同步";
  return `已连接 · Tailscale 私网代理 · 上次同步 ${lastSync}${
    state.dirty ? " · 有待上传修改" : ""
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
