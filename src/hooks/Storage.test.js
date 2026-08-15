import { act } from "react";
import { createRoot } from "react-dom/client";
import { useStorage } from "./Storage";
import { storage } from "../libs/storage";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("../libs/storage", () => ({
  storage: {
    getObj: jest.fn(),
    setObj: jest.fn(() => Promise.resolve()),
    del: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock("../libs/log", () => ({ kissLog: jest.fn() }));

function createHookHost() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const hookResult = {};

  function TestComponent() {
    Object.assign(hookResult, useStorage("local-setting", { local: true }));
    return null;
  }

  return {
    hookResult,
    render: () => act(() => root.render(<TestComponent />)),
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function waitForLoaded(hookResult) {
  for (let i = 0; i < 5 && hookResult.isLoading !== false; i += 1) {
    await flushEffects();
  }
}

describe("useStorage local persistence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storage.getObj.mockResolvedValue({ local: true });
    storage.setObj.mockResolvedValue(undefined);
    storage.del.mockResolvedValue(undefined);
  });

  test("loads existing local data and persists user saves", async () => {
    const host = createHookHost();
    host.render();
    await waitForLoaded(host.hookResult);

    expect(host.hookResult.data).toEqual({ local: true });
    await act(async () => host.hookResult.save({ changed: true }));
    await flushEffects();

    expect(storage.setObj).toHaveBeenCalledWith("local-setting", {
      changed: true,
    });
    host.unmount();
  });

  test("writes the default when no local value exists", async () => {
    storage.getObj.mockResolvedValue(undefined);
    const host = createHookHost();
    host.render();
    await waitForLoaded(host.hookResult);

    expect(storage.setObj).toHaveBeenCalledWith("local-setting", {
      local: true,
    });
    host.unmount();
  });

  test("reloads changed data without rewriting an equivalent value", async () => {
    const host = createHookHost();
    host.render();
    await waitForLoaded(host.hookResult);
    storage.setObj.mockClear();

    storage.getObj.mockResolvedValueOnce({ local: true });
    await act(async () => host.hookResult.reload());
    await flushEffects();
    expect(storage.setObj).not.toHaveBeenCalled();

    storage.getObj.mockResolvedValue({ reloaded: true });
    await act(async () => host.hookResult.reload());
    await flushEffects();
    expect(host.hookResult.data).toEqual({ reloaded: true });
    host.unmount();
  });
});
