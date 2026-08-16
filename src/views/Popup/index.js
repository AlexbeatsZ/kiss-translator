import { useCallback, useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import SubtitlesRoundedIcon from "@mui/icons-material/SubtitlesRounded";
import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";
import { useI18n } from "../../hooks/I18n";
import { useSetting } from "../../hooks/Setting";
import { browser } from "../../libs/browser";
import { sendTabMsg } from "../../libs/msg";
import { kissLog } from "../../libs/log";
import {
  MSG_TRANS_GETRULE,
  MSG_TRANS_PUTRULE,
  MSG_TRANS_TOGGLE,
  OPT_LANGS_FROM,
  OPT_LANGS_TO,
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

function languageName(code, options) {
  return options.find(([value]) => value === code)?.[1] || code || "—";
}

export default function Popup() {
  const i18n = useI18n();
  const { setting, updateSetting } = useSetting();
  const [rule, setRule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCurrentRule = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await sendTabMsg(MSG_TRANS_GETRULE);
      if (!response || response.error || !response.rule) {
        throw new Error(
          i18n(
            "page_translation_unavailable",
            "Page translation is unavailable in this tab."
          )
        );
      }
      setRule(response.rule);
    } catch (requestError) {
      kissLog("query current page rule", requestError);
      setError(
        requestError?.message ||
          i18n(
            "page_translation_unavailable",
            "Page translation is unavailable in this tab."
          )
      );
    } finally {
      setLoading(false);
    }
  }, [i18n]);

  useEffect(() => {
    loadCurrentRule();
  }, [loadCurrentRule]);

  const engine = useMemo(
    () =>
      (setting?.transApis || []).find(
        (profile) => profile.apiSlug === rule?.apiSlug
      ),
    [rule?.apiSlug, setting?.transApis]
  );

  const updateRule = useCallback(async (patch) => {
    await sendTabMsg(MSG_TRANS_PUTRULE, patch);
    setRule((current) => ({ ...current, ...patch }));
  }, []);

  const togglePage = useCallback(async () => {
    await sendTabMsg(MSG_TRANS_TOGGLE);
    setRule((current) => ({
      ...current,
      transOpen: current?.transOpen === "true" ? "false" : "true",
    }));
  }, []);

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

  const sourceName = languageName(rule?.fromLang, OPT_LANGS_FROM);
  const targetName = languageName(rule?.toLang, OPT_LANGS_TO);
  const pageEnabled = rule?.transOpen === "true";
  const subtitleEnabled = setting?.subtitleSetting?.enabled !== false;

  return (
    <Box
      sx={{
        width: 380,
        minHeight: 430,
        bgcolor: TOKENS.paper,
        color: TOKENS.ink,
        fontFamily: bodyFont,
        p: 2.25,
        boxSizing: "border-box",
        "@keyframes railReveal": {
          from: { opacity: 0, transform: "translateY(6px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      }}
    >
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
              sx={{ fontFamily: displayFont, fontSize: 20, lineHeight: 1.05 }}
            >
              KISS Translator
            </Typography>
            <Typography
              sx={{
                mt: 0.4,
                color: TOKENS.source,
                fontFamily: utilityFont,
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {engine?.apiName ||
                i18n("translation_engine", "Translation engine")}
            </Typography>
          </Box>
        </Stack>
        <IconButton
          onClick={openOptions}
          aria-label={i18n("open_setting", "Open settings")}
          sx={{ color: TOKENS.ink }}
        >
          <SettingsRoundedIcon />
        </IconButton>
      </Stack>

      <Box
        sx={{
          mt: 2.25,
          p: 2,
          border: `1px solid ${TOKENS.rule}`,
          borderRadius: 2.5,
          bgcolor: TOKENS.sheet,
          animation: "railReveal 360ms ease-out both",
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }}
      >
        <Typography sx={{ color: TOKENS.source, fontSize: 11, mb: 0.5 }}>
          {i18n("from_lang", "Source")}
        </Typography>
        <Stack direction="row" alignItems="baseline" spacing={1.2}>
          <Typography
            sx={{ fontFamily: displayFont, fontSize: 23, color: TOKENS.source }}
          >
            {sourceName}
          </Typography>
          <ArrowForwardRoundedIcon sx={{ color: TOKENS.rule, fontSize: 18 }} />
          <Typography
            sx={{
              fontFamily: displayFont,
              fontSize: 23,
              color: TOKENS.translation,
              fontWeight: 600,
            }}
          >
            {targetName}
          </Typography>
        </Stack>
        <Typography
          sx={{
            mt: 1,
            color: TOKENS.source,
            fontFamily: utilityFont,
            fontSize: 10,
          }}
        >
          {engine?.model || engine?.apiType || "—"}
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ minHeight: 220, display: "grid", placeItems: "center" }}>
          <CircularProgress size={28} sx={{ color: TOKENS.translation }} />
        </Box>
      ) : error ? (
        <Box sx={{ py: 5 }}>
          <Typography sx={{ color: TOKENS.proof, fontWeight: 650 }}>
            {error}
          </Typography>
          <Button
            onClick={loadCurrentRule}
            sx={{ mt: 2, color: TOKENS.translation }}
          >
            {i18n("retry", "Try again")}
          </Button>
        </Box>
      ) : (
        <Stack spacing={1.75} sx={{ mt: 2 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={togglePage}
            startIcon={<TranslateRoundedIcon />}
            sx={{
              minHeight: 48,
              borderRadius: 2,
              bgcolor: pageEnabled ? TOKENS.raised : TOKENS.translation,
              color: pageEnabled ? TOKENS.ink : TOKENS.paper,
              border: `1px solid ${
                pageEnabled ? TOKENS.rule : TOKENS.translation
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
            {pageEnabled
              ? i18n("stop_page_translation", "Stop translating this page")
              : i18n("translate_this_page", "Translate this page")}
          </Button>

          <Stack direction="row" spacing={1.25}>
            <TextField
              select
              size="small"
              fullWidth
              label={i18n("from_lang", "Source language")}
              value={rule?.fromLang || "auto"}
              onChange={(event) => updateRule({ fromLang: event.target.value })}
              SelectProps={{ MenuProps: { disablePortal: true } }}
            >
              {OPT_LANGS_FROM.map(([code, name]) => (
                <MenuItem key={code} value={code}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              fullWidth
              label={i18n("to_lang", "Target language")}
              value={rule?.toLang || "zh-CN"}
              onChange={(event) => updateRule({ toLang: event.target.value })}
              SelectProps={{ MenuProps: { disablePortal: true } }}
            >
              {OPT_LANGS_TO.map(([code, name]) => (
                <MenuItem key={code} value={code}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Chip
              clickable
              label={i18n("bilingual", "Bilingual")}
              color={rule?.transOnly === "true" ? "default" : "success"}
              onClick={() =>
                updateRule({
                  transOnly: rule?.transOnly === "true" ? "false" : "true",
                })
              }
              sx={{ flex: 1, minHeight: 38, borderRadius: 1.5 }}
            />
            <FormControlLabel
              sx={{
                flex: 1,
                m: 0,
                minHeight: 38,
                px: 1.25,
                border: `1px solid ${TOKENS.rule}`,
                borderRadius: 1.5,
                bgcolor: TOKENS.sheet,
              }}
              control={
                <Switch
                  size="small"
                  checked={subtitleEnabled}
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
                    {i18n("subtitle_translate", "Subtitles")}
                  </Typography>
                </Stack>
              }
            />
          </Stack>
        </Stack>
      )}

      <Stack
        direction="row"
        justifyContent="space-between"
        sx={{ mt: 2.25, pt: 1.5, borderTop: `1px solid ${TOKENS.rule}` }}
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
          }}
        >
          {i18n("open_setting", "Open settings")}
        </Button>
      </Stack>
    </Box>
  );
}
