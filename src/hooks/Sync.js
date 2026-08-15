import { useCallback, useMemo } from "react";
import { STOKEY_SYNC, DEFAULT_SYNC } from "../config";
import { useStorage } from "./Storage";

/** Local metadata for downloadable site-rule subscriptions. */
export function useSync() {
  const { data, update, reload } = useStorage(STOKEY_SYNC, DEFAULT_SYNC);
  return { sync: data, updateSync: update, reloadSync: reload };
}

/**
 * Track when a subscribed rule source was last cached locally.
 * @returns
 */
export function useSyncCaches() {
  const { sync, updateSync, reloadSync } = useSync();

  // 将特定网页 URL 的最新同步缓存时间记录为当前时间戳
  const updateDataCache = useCallback(
    (url) => {
      updateSync((prevSync) => ({
        dataCaches: {
          ...(prevSync?.dataCaches || {}),
          [url]: Date.now(),
        },
      }));
    },
    [updateSync]
  );

  // 删除特定网页 URL 的同步缓存记录
  const deleteDataCache = useCallback(
    (url) => {
      updateSync((prevSync) => {
        const newDataCaches = { ...(prevSync?.dataCaches || {}) };
        delete newDataCaches[url];
        return { dataCaches: newDataCaches };
      });
    },
    [updateSync]
  );

  // 对 dataCaches 缓存映射对象进行缓存优化
  const dataCaches = useMemo(() => sync?.dataCaches || {}, [sync?.dataCaches]);

  return {
    dataCaches,
    updateDataCache,
    deleteDataCache,
    reloadSync,
  };
}
