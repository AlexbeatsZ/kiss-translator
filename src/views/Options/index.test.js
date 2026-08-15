import { act } from "react";
import { createRoot } from "react-dom/client";
import Options from "./index";
import { createHashRouter } from "react-router-dom";
import { runDataMigration } from "../../libs/storage";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockRouter = { dispose: jest.fn() };

jest.mock("react-router-dom", () => ({
  createHashRouter: jest.fn(() => mockRouter),
  RouterProvider: () => <div data-testid="focused-router" />,
}));

jest.mock("./Layout", () => () => <div />);
jest.mock("./Setting", () => () => <div />);
jest.mock("./Rules", () => () => <div />);
jest.mock("./Subtitle", () => () => <div />);
jest.mock("./Apis", () => () => <div />);
jest.mock("../../hooks/Setting", () => ({
  SettingProvider: ({ children }) => children,
}));
jest.mock("../../hooks/Theme", () => ({
  __esModule: true,
  default: ({ children }) => children,
}));
jest.mock("../../hooks/Alert", () => ({
  AlertProvider: ({ children }) => children,
}));
jest.mock("../../hooks/Confirm", () => ({
  ConfirmProvider: ({ children }) => children,
}));
jest.mock("../../libs/client", () => ({ isGm: false }));
jest.mock("../../libs/gm", () => ({ adaptScript: jest.fn() }));
jest.mock("../../libs/utils", () => ({ sleep: jest.fn() }));
jest.mock("../../libs/storage", () => ({
  runDataMigration: jest.fn(() => Promise.resolve()),
}));

function deferred() {
  let resolve;
  const promise = new Promise((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

async function renderOptions() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(<Options />));
  return { container, root };
}

describe("focused options startup", () => {
  beforeEach(() => {
    createHashRouter.mockReturnValue(mockRouter);
    runDataMigration.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = "";
  });

  test("keeps the app behind a loading gate until local migration finishes", async () => {
    const migration = deferred();
    runDataMigration.mockReturnValueOnce(migration.promise);
    const { container, root } = await renderOptions();

    expect(
      container.querySelector("[data-testid='options-sync-backdrop']")
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='focused-router']")
    ).toBeNull();

    await act(async () => migration.resolve());
    expect(
      container.querySelector("[data-testid='focused-router']")
    ).not.toBeNull();
    await act(async () => root.unmount());
  });

  test("exposes only page translation, site rules, subtitles, and services", async () => {
    const { root } = await renderOptions();
    await act(async () => Promise.resolve());

    const routes = createHashRouter.mock.calls[0][0][0].children;
    expect(routes.map((route) => route.path || "index")).toEqual([
      "index",
      "rules",
      "subtitle",
      "apis",
    ]);
    await act(async () => root.unmount());
  });

  test("runs migration exactly once before mounting the focused router", async () => {
    const { container, root } = await renderOptions();
    await act(async () => Promise.resolve());

    expect(runDataMigration).toHaveBeenCalledTimes(1);
    expect(
      container.querySelector("[data-testid='focused-router']")
    ).not.toBeNull();
    await act(async () => root.unmount());
  });
});
