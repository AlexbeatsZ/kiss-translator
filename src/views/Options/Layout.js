import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useBlocker, useLocation, useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Link from "@mui/material/Link";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { useI18n } from "../../hooks/I18n";
import { useSetting } from "../../hooks/Setting";
import { useRules } from "../../hooks/Rules";
import {
  GLOBAL_KEY,
  GLOBLA_RULE,
  OPT_LANGS_FROM_REVERSED,
  OPT_LANGS_TO_REVERSED,
} from "../../config";
import Header from "./Header";
import Navigator from "./Navigator";
import { SettingsPageHeader } from "./SettingsSurface";
import { getSettingsPageMeta } from "./settingsNavigation";

const NAV_WIDTH = 236;

function languageName(code, languages) {
  const match = languages.find(([value]) => value === code);
  return match ? match[1].split(" - ")[0] : code || "—";
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const i18n = useI18n();
  const { setting } = useSetting();
  const rules = useRules();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [latestVersion, setLatestVersion] = useState("");
  const navigationGuardRef = useRef(null);
  const pendingNavigationDecisionRef = useRef(null);
  const shouldBlockNavigation = useCallback(
    ({ currentLocation, nextLocation }) => {
      const registeredGuard = navigationGuardRef.current;
      const changesLocation =
        currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search ||
        currentLocation.hash !== nextLocation.hash;
      if (!registeredGuard || !changesLocation) return false;

      // Start the custom confirmation during the navigation callback. A POP
      // can change the address bar before a passive effect runs, while the
      // form must remain mounted until the user decides what to do.
      if (!pendingNavigationDecisionRef.current) {
        let decision;
        try {
          decision = Promise.resolve(registeredGuard.confirm());
        } catch {
          decision = Promise.resolve(false);
        }
        pendingNavigationDecisionRef.current = {
          currentLocation,
          nextLocation,
          decision,
        };
      }

      return true;
    },
    []
  );
  const blocker = useBlocker(shouldBlockNavigation);
  const blockerRef = useRef(blocker);
  blockerRef.current = blocker;
  const pageMeta = getSettingsPageMeta(location.pathname, i18n);
  const globalRule =
    rules.list.find((rule) => rule.pattern === GLOBAL_KEY) || GLOBLA_RULE;
  const activeProfile = setting.transApis?.find(
    (profile) => profile.apiSlug === globalRule.apiSlug
  );
  const readingContext = {
    source: languageName(globalRule.fromLang, OPT_LANGS_FROM_REVERSED),
    target: languageName(globalRule.toLang, OPT_LANGS_TO_REVERSED),
    engine:
      activeProfile?.apiName ||
      activeProfile?.model ||
      activeProfile?.apiType ||
      globalRule.apiSlug,
  };
  const registerNavigationGuard = useCallback((guard) => {
    navigationGuardRef.current =
      typeof guard === "function" ? { confirm: guard } : null;
  }, []);
  const handleNavigate = useCallback(
    async (path) => {
      const registeredGuard = navigationGuardRef.current;
      if (registeredGuard && !(await registeredGuard.confirm())) {
        return;
      }

      navigationGuardRef.current = null;
      navigate(path);
    },
    [navigate]
  );
  const outletContext = useMemo(
    () => ({ registerNavigationGuard, navigateWithGuard: handleNavigate }),
    [handleNavigate, registerNavigationGuard]
  );

  useEffect(() => {
    if (blocker.state !== "blocked") return undefined;

    const pendingNavigation = pendingNavigationDecisionRef.current;
    if (!pendingNavigation) {
      blocker.reset();
      return undefined;
    }

    pendingNavigation.decision
      .then((shouldProceed) => {
        if (pendingNavigationDecisionRef.current !== pendingNavigation) return;

        pendingNavigationDecisionRef.current = null;
        const currentBlocker = blockerRef.current;

        if (shouldProceed) {
          navigationGuardRef.current = null;
          if (currentBlocker.state === "blocked") {
            currentBlocker.proceed();
          } else {
            const { pathname, search, hash } = pendingNavigation.nextLocation;
            navigate(`${pathname}${search}${hash}`);
          }
        } else {
          if (currentBlocker.state === "blocked") {
            currentBlocker.reset();
          }

          const { pathname, search, hash } = pendingNavigation.currentLocation;
          window.history.replaceState(
            window.history.state,
            "",
            `#${pathname}${search}${hash}`
          );
        }
      })
      .catch(() => {
        if (pendingNavigationDecisionRef.current !== pendingNavigation) return;
        pendingNavigationDecisionRef.current = null;
        if (blockerRef.current.state === "blocked") {
          blockerRef.current.reset();
        }
      });

    return undefined;
  }, [blocker, navigate]);

  useEffect(() => {
    let active = true;

    fetch(`${process.env.REACT_APP_VERSION_URL}?t=${Date.now()}`)
      .then((res) => res.text())
      .then((text) => {
        if (!active) return;

        const nextVersion = text.trim();
        const currentVersion = process.env.REACT_APP_VERSION;
        if (nextVersion && currentVersion && nextVersion !== currentVersion) {
          setLatestVersion(nextVersion);
        }
      })
      .catch((err) => console.error("fetch version error:", err));

    return () => {
      active = false;
    };
  }, []);

  return (
    <Box
      sx={(currentTheme) => ({
        minHeight: "100vh",
        "@supports (height: 100dvh)": {
          minHeight: "100dvh",
        },
        backgroundColor: "background.default",
      })}
    >
      <CssBaseline />
      <Header />

      {!isDesktop && (
        <Navigator
          variant="mobile-strip"
          onNavigate={handleNavigate}
          activePath={location.pathname}
        />
      )}

      <Box sx={{ display: "flex" }}>
        {isDesktop && (
          <Box component="nav" sx={{ width: NAV_WIDTH, flexShrink: 0 }}>
            <Navigator
              drawerWidth={NAV_WIDTH}
              variant="permanent"
              onNavigate={handleNavigate}
              activePath={location.pathname}
            />
          </Box>
        )}

        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: {
              xs: "calc(100dvh - 112px)",
              md: "calc(100dvh - 64px)",
            },
            px: { xs: 1.5, sm: 3, lg: 4.5 },
            py: { xs: 2.25, sm: 3, lg: 4.5 },
          }}
        >
          <Box sx={{ width: "100%", maxWidth: 1180, mx: "auto" }}>
            <SettingsPageHeader
              eyebrow={pageMeta.groupLabel}
              title={pageMeta.title}
              description={pageMeta.description}
              readingContext={readingContext}
            />

            {latestVersion && (
              <Alert severity="warning" variant="outlined" sx={{ mb: 3 }}>
                {i18n("version_warning")
                  .replace("{0}", process.env.REACT_APP_VERSION)
                  .replace("{1}", latestVersion)}{" "}
                <Link
                  href={process.env.REACT_APP_RELEASES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ fontWeight: 700 }}
                >
                  {i18n("download_update")}
                </Link>
              </Alert>
            )}

            <Outlet context={outletContext} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
