import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  createMemoryRouter,
  RouterProvider,
  useOutletContext,
} from "react-router-dom";
import Layout from "./Layout";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("../../hooks/I18n", () => ({
  useI18n: () => (key, fallback) => fallback || key,
}));

jest.mock("./Header", () => {
  return function MockHeader() {
    return <div data-testid="header" />;
  };
});

jest.mock("./Navigator", () => {
  return function MockNavigator() {
    return <div data-testid="navigator" />;
  };
});

jest.mock("./SettingsSurface", () => ({
  SettingsPageHeader: () => <div data-testid="page-header" />,
}));

jest.mock("./settingsNavigation", () => ({
  getSettingsPageMeta: () => ({
    groupLabel: "Settings",
    title: "Settings",
    description: "Settings",
  }),
}));

function DraftPage({ guard }) {
  const { registerNavigationGuard } = useOutletContext();

  useEffect(() => {
    registerNavigationGuard(guard);
    return () => registerNavigationGuard(null);
  }, [guard, registerNavigationGuard]);

  return <div data-testid="draft-page">Draft</div>;
}

function createTestRouter(guard) {
  return createMemoryRouter(
    [
      {
        path: "/",
        element: <Layout />,
        children: [
          { path: "draft", element: <DraftPage guard={guard} /> },
          { path: "target", element: <div data-testid="target-page" /> },
        ],
      },
    ],
    {
      initialEntries: ["/target", "/draft"],
      initialIndex: 1,
    }
  );
}

describe("Options Layout navigation guard", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      text: jest.fn().mockResolvedValue(process.env.REACT_APP_VERSION || ""),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    document.body.innerHTML = "";
  });

  test("guards browser-style back navigation until the draft is discarded", async () => {
    const guard = jest
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const router = createTestRouter(guard);
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<RouterProvider router={router} />);
    });

    await act(async () => {
      await router.navigate(-1);
      await Promise.resolve();
    });
    expect(guard).toHaveBeenCalledTimes(1);
    expect(
      container.querySelector("[data-testid='draft-page']")
    ).not.toBeNull();
    expect(container.querySelector("[data-testid='target-page']")).toBeNull();

    await act(async () => {
      await router.navigate(-1);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(guard).toHaveBeenCalledTimes(2);
    expect(
      container.querySelector("[data-testid='target-page']")
    ).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
    router.dispose();
    container.remove();
  });
});
