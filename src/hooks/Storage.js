import { useCallback, useEffect, useState } from "react";
import { storage } from "../libs/storage";
import { kissLog } from "../libs/log";

function isSameStorageValue(a, b) {
  if (Object.is(a, b)) return true;

  if (
    a &&
    b &&
    typeof a === "object" &&
    typeof b === "object" &&
    Array.isArray(a) === Array.isArray(b)
  ) {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch (err) {
      return false;
    }
  }

  return false;
}

/**
 * React hook for locally persisted state.
 *
 * // REVIEW: 1. 多实例数据非同步隐患。
 * //    `useStorage` 在内部通过 React 的 `useState` 管理局部状态，并在副作用中调用 `storage.setObj` 写入存储。
 * //    但是，如果同一个 key 被页面中多个相互隔离的组件组件（例如 Popup、Options 或 Content 中的不同组件实例）同时使用，
 * //    其中一个组件调用了 `save(newVal)` 修改了 Storage，其他组件是无法自动感知这一数据更新的（因为缺乏监听本地存储改变的广播事件）。
 * //    建议通过增加 `chrome.storage.onChanged`（扩展模式下）或 `window.addEventListener('storage')`（网页模式下）的监听器，
 * //    在监听到对应 Key 变化时自动 `setData` 同步刷新局部 React 状态。
 *
 * @param {string} key 用于在 Storage 中存取值的键
 * @param {*} defaultVal 默认值。建议在组件外定义为常量。
 * @returns {{
 * data: *,
 * save: (valueOrFn: any | ((prevData: any) => any)) => void,
 * update: (partialDataOrFn: object | ((prevData: object) => object)) => void,
 * remove: () => Promise<void>,
 * reload: () => Promise<void>,
 * isLoading: boolean
 * }}
 */
export function useStorage(key, defaultVal = null) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(defaultVal);

  // 首次挂载时从本地存储异步加载初始数据
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const storedVal = await storage.getObj(key);
        if (storedVal === undefined || storedVal === null) {
          // 如果存储中没有该值，写入初始默认值
          await storage.setObj(key, defaultVal);
        } else if (isMounted) {
          setData(storedVal);
        }
      } catch (err) {
        kissLog(`storage load error for key: ${key}`, err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [key, defaultVal]);

  // 数据发生改变时仅触发本地写盘。
  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (data === null) {
      return;
    }

    storage.setObj(key, data).catch((err) => {
      kissLog(`storage save error for key: ${key}`, err);
    });
  }, [key, isLoading, data]);

  /**
   * 全量替换状态值并自动触发写盘副作用
   * @param {any | ((prevData: any) => any)} valueOrFn 新的值或一个返回新值的函数。
   */
  const save = useCallback((valueOrFn) => {
    setData((prevData) =>
      typeof valueOrFn === "function" ? valueOrFn(prevData) : valueOrFn
    );
  }, []);

  /**
   * 合并部分对象到当前状态（假设状态是一个对象）。
   * @param {object | ((prevData: object) => object)} partialDataOrFn 要合并的对象或一个返回该对象的函数。
   */
  const update = useCallback((partialDataOrFn) => {
    setData((prevData) => {
      const partialData =
        typeof partialDataOrFn === "function"
          ? partialDataOrFn(prevData)
          : partialDataOrFn;
      // 确保 preData 是一个对象，避免展开 null 或 undefined
      const baseObj =
        typeof prevData === "object" && prevData !== null ? prevData : {};
      return { ...baseObj, ...partialData };
    });
  }, []);

  /**
   * 从 Storage 中删除该值，并将状态重置为 null。
   */
  const remove = useCallback(async () => {
    try {
      await storage.del(key);
      setData(null);
    } catch (err) {
      kissLog(`storage remove error for key: ${key}`, err);
    }
  }, [key]);

  /**
   * 从 Storage 重新加载数据以覆盖当前状态。
   */
  const reload = useCallback(async () => {
    try {
      const storedVal = await storage.getObj(key);
      const nextData = storedVal ?? defaultVal;
      if (isSameStorageValue(data, nextData)) {
        return;
      }
      setData(nextData);
    } catch (err) {
      kissLog(`storage reload error for key: ${key}`, err);
    }
  }, [key, defaultVal, data]);

  return { data, save, update, remove, reload, isLoading };
}
