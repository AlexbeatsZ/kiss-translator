import { createHashRouter, RouterProvider } from "react-router-dom";
import Rules from "./Rules";
import Setting from "./Setting";
import Layout from "./Layout";
import { SettingProvider } from "../../hooks/Setting";
import ThemeProvider from "../../hooks/Theme";
import { useEffect, useMemo, useState } from "react";
import { isGm } from "../../libs/client";
import { sleep } from "../../libs/utils";
import { AlertProvider } from "../../hooks/Alert";
import { ConfirmProvider } from "../../hooks/Confirm";
import Link from "@mui/material/Link";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import { adaptScript } from "../../libs/gm";
import Alert from "@mui/material/Alert";
import Apis from "./Apis";
import SubtitleSetting from "./Subtitle";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import { runDataMigration } from "../../libs/storage";
import { OPTIONS_THEME_OPTIONS } from "./optionsTheme";

function OptionsRouter() {
  const router = useMemo(
    () =>
      createHashRouter([
        {
          path: "/",
          element: <Layout />,
          children: [
            { index: true, element: <Setting /> },
            { path: "rules", element: <Rules /> },
            { path: "subtitle", element: <SubtitleSetting /> },
            { path: "apis", element: <Apis /> },
          ],
        },
      ]),
    []
  );

  useEffect(() => () => router.dispose(), [router]);

  return <RouterProvider router={router} />;
}

/**
 * 选项设置中心 (Options) 根入口组件
 */
export default function Options() {
  const [error, setError] = useState("");
  const [gmBridgeReady, setGmBridgeReady] = useState(!isGm); // 是否已建立油猴 GM 桥接，若是则允许页面其他部分访问 GM 接口
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // 检查油猴脚本版本与内置扩展打包版本的前两位主次版本号是否匹配
    const isValidVersion = (v1Str, v2Str) => {
      if (!v1Str || !v2Str) {
        return false;
      }

      const v1 = v1Str.split(".");
      const v2 = v2Str.split(".");

      return v1[0] === v2[0] && v1[1] === v2[1];
    };

    (async () => {
      if (isGm) {
        // 油猴脚本环境运行：轮询等待 GM_info 与 window.APP_INFO 被成功注入并初始化完毕
        let i = 0;
        for (;;) {
          if (window?.APP_INFO?.name === process.env.REACT_APP_NAME) {
            const { version, eventName } = window.APP_INFO;

            // 检查油猴端脚本版本是否需要更新升级
            if (!isValidVersion(version, process.env.REACT_APP_VERSION)) {
              setError(
                `The version of the local script(v${version}) is not the latest version(v${process.env.REACT_APP_VERSION}). 本地脚本之版本(v${version})非最新版(v${process.env.REACT_APP_VERSION})。`
              );
              return;
            }

            if (eventName) {
              // 绑定跨作用域油猴 GM 通信接口方法
              adaptScript(eventName);
            }

            // GM 桥接准备就绪，允许页面其他部分开始正常访问 GM 接口
            setGmBridgeReady(true);

            break;
          }

          // 循环轮询 8 次 (共 8 秒) 后判定为连接油猴后台超时
          if (++i > 8) {
            setError(
              "Time out. Please confirm whether to install or enable KISS Translator GreaseMonkey script? 连接超时，请检查是否安装或启用简约翻译油猴脚本。"
            );
            return;
          }

          await sleep(1000);
        }
      }

      await runDataMigration();
      setInitializing(false);
    })();
  }, []);

  // 展示版本不匹配或连接超时时的致命错误提示引导区
  if (error) {
    return (
      <center>
        <Divider>
          <Link
            href={process.env.REACT_APP_HOMEPAGE}
          >{`KISS Translator v${process.env.REACT_APP_VERSION}`}</Link>
        </Divider>
        <Alert severity="error">{error}</Alert>
        <Stack spacing={2}>
          <Link href={process.env.REACT_APP_USERSCRIPT_DOWNLOADURL}>
            Install/Update Userscript for Tampermonkey/Violentmonkey
          </Link>
          <Link href={process.env.REACT_APP_USERSCRIPT_IOS_DOWNLOADURL}>
            Install/Update Userscript for iOS Safari
          </Link>
        </Stack>
      </center>
    );
  }

  if (!gmBridgeReady || initializing) {
    return (
      <Backdrop
        data-testid="options-sync-backdrop"
        aria-label="preparing settings"
        open
        sx={(theme) => ({
          color: "#fff",
          zIndex: theme.zIndex.modal + 1,
        })}
      >
        <CircularProgress color="inherit" size={72} />
      </Backdrop>
    );
  }

  return (
    <SettingProvider context="options">
      <ThemeProvider options={OPTIONS_THEME_OPTIONS}>
        <AlertProvider>
          <ConfirmProvider>
            {/* Data router keeps hash-based extension URLs while allowing
                route-level protection for unsaved settings drafts. */}
            <OptionsRouter />
          </ConfirmProvider>
        </AlertProvider>
      </ThemeProvider>
    </SettingProvider>
  );
}
