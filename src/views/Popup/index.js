import { useCallback, useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import SubtitlesRoundedIcon from "@mui/icons-material/SubtitlesRounded";
import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";
import { useI18n } from "../../hooks/I18n";
import { useSetting } from "../../hooks/Setting";
import { useRules } from "../../hooks/Rules";
import { browser } from "../../libs/browser";
import { getCurTab, sendBgMsg, sendTabMsg } from "../../libs/msg";
import { isMatch } from "../../libs/utils";
import { kissLog } from "../../libs/log";
import {
  GLOBAL_KEY,
  GLOBLA_RULE,
  MSG_TOGGLE_NEVER_TRANSLATE,
  MSG_TRANS_GETRULE,
  MSG_TRANS_PUTRULE,
  MSG_TRANS_TOGGLE,
  MSG_TRANS_TOGGLE_NEVER_TRANSLATE,
  OPT_LANGS_FROM_REVERSED,
  OPT_LANGS_TO_REVERSED,
} from "../../config";

const TOKENS = {
  ink: "#F2F4F8",
  paper: "#0B0D12",
  sheet: "#151A24",
  raised: "#1B2230",
  source: "#D6A96F",
  translation: "#7C9CFF",
  proof: "#FF7A90",
  rule: "#293142",
};

const displayFont =
  '"Segoe UI Variable", Aptos, "Noto Sans SC", "Microsoft YaHei UI", sans-serif';
const bodyFont = displayFont;
const utilityFont = '"IBM Plex Mono", "Cascadia Mono", monospace';

function languageName(code, languages) {
  const match = languages.find(([value]) => value === code);
  return match ? match[1].split(" - ")[0] : code || "—";
}

export default function Popup() {
  const i18n = useI18n();
  const { setting, updateSetting } = useSetting();
  const rules = useRules();
  const [tabRule, setTabRule] = useState(null);
  const [tabAvailable, setTabAvailable] = useState(true);
  const [currentHostname, setCurrentHostname] = useState("");
  const [, setLoading] = useState(true);

  const globalRule = useMemo(
    () => rules.list.find((r) => r.pattern === GLOBAL_KEY) || GLOBLA_RULE,
    [rules.list]
  );

  const activeRule = tabRule || globalRule;

  const loadCurrentRule = useCallback(async () => {
    setLoading(true);
    try {
      const tab = await getCurTab();
      if (
        tab?.url &&
        !tab.url.startsWith("chrome://") &&
        !tab.url.startsWith("edge://") &&
        !tab.url.startsWith("about:")
      ) {
        try {
          const url = new URL(tab.url);
          setCurrentHostname(url.hostname);
        } catch {
          // ignore URL parsing error
        }
      }
      const response = await sendTabMsg(MSG_TRANS_GETRULE);
      if (response?.rule) {
        setTabRule(response.rule);
        setTabAvailable(true);
      } else {
        setTabRule(null);
        setTabAvailable(false);
      }
    } catch (requestError) {
      kissLog("query current page rule", requestError);
      setTabRule(null);
      setTabAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentRule();
  }, [loadCurrentRule]);

  const engine = useMemo(
    () =>
      (setting?.transApis || []).find(
        (profile) => profile.apiSlug === activeRule?.apiSlug
      ) || (setting?.transApis || [])[0],
    [activeRule?.apiSlug, setting?.transApis]
  );

  const isSiteExcluded = useMemo(() => {
    if (!currentHostname) return false;
    const match = (rules.list || []).find(
      (rule) =>
        rule.pattern !== GLOBAL_KEY &&
        (rule.pattern === currentHostname ||
          isMatch(currentHostname, rule.pattern))
    );
    return match ? match.transOpen === "false" : false;
  }, [currentHostname, rules.list]);

  const updateRule = useCallback(
    async (patch) => {
      if (tabAvailable) {
        await sendTabMsg(MSG_TRANS_PUTRULE, patch);
        setTabRule((current) => ({ ...(current || globalRule), ...patch }));
      } else {
        rules.put(GLOBAL_KEY, patch);
      }
    },
    [globalRule, rules, tabAvailable]
  );

  const togglePage = useCallback(async () => {
    if (!tabAvailable) return;
    await sendTabMsg(MSG_TRANS_TOGGLE);
    setTabRule((current) => ({
      ...(current || globalRule),
      transOpen:
        (current || globalRule)?.transOpen === "true" ? "false" : "true",
    }));
  }, [globalRule, tabAvailable]);

  const toggleNeverTranslateSite = useCallback(async () => {
    if (!currentHostname) return;
    try {
      let result;
      if (tabAvailable) {
        result = await sendTabMsg(MSG_TRANS_TOGGLE_NEVER_TRANSLATE);
      } else {
        result = await sendBgMsg(MSG_TOGGLE_NEVER_TRANSLATE, {
          hostname: currentHostname,
        });
      }

      if (rules.reload) {
        await rules.reload();
      }

      if (result?.rule) {
        setTabRule(result.rule);
      } else {
        await loadCurrentRule();
      }
    } catch (err) {
      kissLog("toggle never translate site error", err);
    }
  }, [currentHostname, tabAvailable, rules, loadCurrentRule]);

  const toggleSubtitles = useCallback(() => {
    updateSetting((current) => ({
      ...current,
      subtitleSetting: {
        ...current.subtitleSetting,
        enabled: !current.subtitleSetting?.enabled,
      },
    }));
  }, [updateSetting]);

  const openOptions = useCallback(() => {
    browser.runtime.openOptionsPage();
  }, []);

  const sourceName = languageName(
    activeRule?.fromLang || "auto",
    OPT_LANGS_FROM_REVERSED
  );
  const targetName = languageName(
    activeRule?.toLang || "zh-CN",
    OPT_LANGS_TO_REVERSED
  );
  const pageEnabled = activeRule?.transOpen === "true";
  const subtitleEnabled = setting?.subtitleSetting?.enabled !== false;

  return (
    <Box
      sx={{
        width: 360,
        maxWidth: 360,
        bgcolor: TOKENS.paper,
        color: TOKENS.ink,
        fontFamily: bodyFont,
        p: 2,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 1.75,
        "@keyframes railReveal": {
          from: { opacity: 0, transform: "translateY(6px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      }}
    >
      {/* 顶部标题栏 */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              bgcolor: TOKENS.raised,
              color: TOKENS.translation,
              border: `1px solid ${TOKENS.rule}`,
            }}
          >
            <TranslateRoundedIcon fontSize="small" />
          </Box>
          <Box>
            <Typography
              sx={{
                fontFamily: displayFont,
                fontSize: 18,
                lineHeight: 1.1,
                fontWeight: 700,
              }}
            >
              {i18n("app_name", "翻译")}
            </Typography>
            <Typography
              sx={{
                mt: 0.3,
                color: TOKENS.source,
                fontFamily: utilityFont,
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {engine?.apiName ||
                i18n("translation_engine", "翻译引擎")}
            </Typography>
          </Box>
        </Stack>
        <IconButton
          onClick={openOptions}
          aria-label={i18n("open_setting", "打开设置")}
          sx={{ color: TOKENS.ink }}
          size="small"
        >
          <SettingsRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>

      {/* 语言方向信息卡片 */}
      <Box
        sx={{
          p: 1.75,
          border: `1px solid ${TOKENS.rule}`,
          borderRadius: 2.5,
          bgcolor: TOKENS.sheet,
          animation: "railReveal 360ms ease-out both",
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }}
      >
        <Typography
          sx={{
            color: TOKENS.source,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            mb: 0.5,
          }}
        >
          {i18n("reading_context", "语言方向")}
        </Typography>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          sx={{ minWidth: 0, my: 0.5 }}
        >
          <Typography
            noWrap
            sx={{
              fontFamily: displayFont,
              fontSize: 18,
              fontWeight: 600,
              color: TOKENS.source,
              flexShrink: 1,
            }}
          >
            {sourceName}
          </Typography>
          <ArrowForwardRoundedIcon
            sx={{ color: TOKENS.rule, fontSize: 18, flexShrink: 0 }}
          />
          <Typography
            noWrap
            sx={{
              fontFamily: displayFont,
              fontSize: 18,
              fontWeight: 600,
              color: TOKENS.translation,
              flexShrink: 1,
            }}
          >
            {targetName}
          </Typography>
        </Stack>
        <Typography
          sx={{
            mt: 0.75,
            color: TOKENS.source,
            fontFamily: utilityFont,
            fontSize: 11,
          }}
        >
          {engine?.model || engine?.apiType || "—"}
        </Typography>
      </Box>

      {/* 翻译操作区域 */}
      <Stack spacing={1.5}>
        <Button
          fullWidth
          variant="contained"
          disabled={!tabAvailable}
          onClick={togglePage}
          startIcon={<TranslateRoundedIcon />}
          sx={{
            minHeight: 44,
            borderRadius: 2,
            bgcolor: !tabAvailable
              ? TOKENS.raised
              : pageEnabled
              ? TOKENS.raised
              : TOKENS.translation,
            color: !tabAvailable
              ? "rgba(242, 244, 248, 0.4)"
              : pageEnabled
              ? TOKENS.ink
              : TOKENS.paper,
            border: `1px solid ${
              !tabAvailable
                ? TOKENS.rule
                : pageEnabled
                ? TOKENS.rule
                : TOKENS.translation
            }`,
            boxShadow: "none",
            textTransform: "none",
            fontWeight: 700,
            "&:hover": {
              bgcolor: pageEnabled ? "#222B3A" : "#92AAFF",
              boxShadow: "none",
            },
          }}
        >
          {!tabAvailable
            ? i18n(
                "page_translation_unavailable",
                "当前标签页不支持网页翻译"
              )
            : pageEnabled
            ? i18n("stop_page_translation", "停止翻译此页面")
            : i18n("translate_this_page", "翻译此页面")}
        </Button>

        <Stack direction="row" spacing={1.25}>
          <TextField
            select
            size="small"
            fullWidth
            label={i18n("from_lang", "源语言")}
            value={activeRule?.fromLang || "auto"}
            onChange={(event) => updateRule({ fromLang: event.target.value })}
            SelectProps={{
              MenuProps: { disablePortal: true },
              renderValue: (val) => languageName(val, OPT_LANGS_FROM_REVERSED),
            }}
          >
            {OPT_LANGS_FROM_REVERSED.map(([code, name]) => (
              <MenuItem key={code} value={code}>
                {name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            fullWidth
            label={i18n("to_lang", "目标语言")}
            value={activeRule?.toLang || "zh-CN"}
            onChange={(event) => updateRule({ toLang: event.target.value })}
            SelectProps={{
              MenuProps: { disablePortal: true },
              renderValue: (val) => languageName(val, OPT_LANGS_TO_REVERSED),
            }}
          >
            {OPT_LANGS_TO_REVERSED.map(([code, name]) => (
              <MenuItem key={code} value={code}>
                {name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Chip
            clickable
            label={i18n("bilingual", "双语对照")}
            color={activeRule?.transOnly === "true" ? "default" : "success"}
            onClick={() =>
              updateRule({
                transOnly:
                  activeRule?.transOnly === "true" ? "false" : "true",
              })
            }
            sx={{ flex: 1, minHeight: 36, borderRadius: 1.5 }}
          />
          <FormControlLabel
            sx={{
              flex: 1,
              m: 0,
              minHeight: 36,
              px: 1.25,
              border: `1px solid ${TOKENS.rule}`,
              borderRadius: 1.5,
              bgcolor: TOKENS.sheet,
              justifyContent: "space-between",
            }}
            control={
              <Switch
                size="small"
                checked={Boolean(subtitleEnabled)}
                onChange={toggleSubtitles}
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": {
                    color: TOKENS.translation,
                  },
                }}
              />
            }
            label={
              <Stack direction="row" spacing={0.75} alignItems="center">
                <SubtitlesRoundedIcon
                  sx={{ fontSize: 16, color: TOKENS.source }}
                />
                <Typography sx={{ fontSize: 12 }}>
                  {i18n("subtitle_translate", "字幕翻译")}
                </Typography>
              </Stack>
            }
          />
        </Stack>

        {/* 当前网站不自动翻译排除状态控制卡片 */}
        {currentHostname && (
          <Box
            onClick={toggleNeverTranslateSite}
            sx={{
              p: 1.25,
              border: `1px solid ${
                isSiteExcluded ? "rgba(255, 122, 144, 0.4)" : TOKENS.rule
              }`,
              borderRadius: 2,
              bgcolor: isSiteExcluded
                ? "rgba(255, 122, 144, 0.08)"
                : TOKENS.sheet,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              transition: "all 0.2s ease",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ minWidth: 0, pr: 1 }}
            >
              <BlockRoundedIcon
                sx={{
                  fontSize: 18,
                  color: isSiteExcluded ? TOKENS.proof : TOKENS.source,
                  flexShrink: 0,
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  noWrap
                  sx={{
                    fontSize: 12,
                    fontWeight: isSiteExcluded ? 700 : 500,
                    color: isSiteExcluded ? TOKENS.proof : TOKENS.ink,
                  }}
                >
                  {isSiteExcluded
                    ? i18n("site_excluded_label", "已加入不自动翻译列表")
                    : i18n("never_translate_this_site", "永久不自动翻译此网站")}
                </Typography>
                <Typography
                  noWrap
                  sx={{
                    fontSize: 10,
                    fontFamily: utilityFont,
                    color: isSiteExcluded ? TOKENS.proof : "text.secondary",
                    opacity: 0.8,
                  }}
                >
                  {currentHostname}
                </Typography>
              </Box>
            </Stack>
            <Switch
              size="small"
              checked={isSiteExcluded}
              onChange={toggleNeverTranslateSite}
              onClick={(e) => e.stopPropagation()}
              inputProps={{ "aria-label": "toggle-never-translate" }}
              sx={{
                flexShrink: 0,
                "& .MuiSwitch-switchBase.Mui-checked": {
                  color: TOKENS.proof,
                },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                  backgroundColor: TOKENS.proof,
                },
              }}
            />
          </Box>
        )}
      </Stack>

      {/* 底部信息与设置入口 */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ pt: 1.5, borderTop: `1px solid ${TOKENS.rule}` }}
      >
        <Typography
          sx={{ fontFamily: utilityFont, fontSize: 10, color: TOKENS.source }}
        >
          v{process.env.REACT_APP_VERSION}
        </Typography>
        <Button
          size="small"
          onClick={openOptions}
          sx={{
            color: TOKENS.translation,
            textTransform: "none",
            fontWeight: 650,
            p: 0,
            minWidth: 0,
          }}
        >
          {i18n("open_setting", "打开设置")}
        </Button>
      </Stack>
    </Box>
  );
}
