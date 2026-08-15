import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import EditIcon from "@mui/icons-material/Edit";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import { alpha } from "@mui/material/styles";
import { useSetting } from "../../hooks/Setting";
import { useRules } from "../../hooks/Rules";
import { useI18n } from "../../hooks/I18n";
import { useAlert } from "../../hooks/Alert";
import { useShortcut } from "../../hooks/Shortcut";
import { useFab } from "../../hooks/Fab";
import { useAllTextStyles } from "../../hooks/CustomStyles";
import { isExt } from "../../libs/client";
import { browser } from "../../libs/browser";
import { sendBgMsg } from "../../libs/msg";
import { kissLog, LogLevel } from "../../libs/log";
import {
  CACHE_NAME,
  DEFAULT_BLACKLIST,
  DEFAULT_CSPLIST,
  DEFAULT_HTTP_TIMEOUT,
  DEFAULT_ORILIST,
  GLOBLA_RULE,
  GLOBAL_KEY,
  MSG_CONTEXT_MENUS,
  MSG_UPDATE_CSP,
  OPT_LANGDETECTOR_ALL,
  OPT_LANGS_FROM_REVERSED as OPT_LANGS_FROM,
  OPT_LANGS_TO_REVERSED as OPT_LANGS_TO,
  OPT_SHORTCUT_SETTING,
  OPT_SHORTCUT_STYLE,
  OPT_SHORTCUT_TRANSLATE,
  OPT_SHORTCUT_TRANSONLY,
  TRANS_NEWLINE_LENGTH,
  UI_LANGS,
} from "../../config";
import ShortcutInput from "./ShortcutInput";
import UploadButton from "./UploadButton";
import DownloadButton from "./DownloadButton";
import ValidationInput from "../../hooks/ValidationInput";
import {
  SettingsAccordionSection,
  SettingsGrid,
  SettingsSection,
  SettingsToggle,
} from "./SettingsSurface";

function ShortcutItem({ action, label }) {
  const { shortcut, setShortcut } = useShortcut(action);
  return (
    <ShortcutInput value={shortcut} onChange={setShortcut} label={label} />
  );
}

function ExtCommands() {
  const i18n = useI18n();
  const [commands, setCommands] = useState([]);

  useEffect(() => {
    browser?.commands
      ?.getAll?.()
      .then((items) =>
        setCommands((items || []).filter((item) => item.description))
      )
      .catch((error) => console.error("fetch commands error:", error));
  }, []);

  if (commands.length === 0) return null;

  const handleEdit = () => {
    const userAgent = navigator.userAgent;
    let url = "chrome://extensions/shortcuts";
    if (userAgent.includes("Edg/")) url = "edge://extensions/shortcuts";
    if (userAgent.includes("Firefox/")) url = "about:addons";
    if (userAgent.includes("OPR/")) url = "opera://extensions/shortcuts";
    if (userAgent.includes("Brave/")) url = "brave://extensions/shortcuts";
    browser?.tabs?.create
      ? browser.tabs.create({ url })
      : window.open(url, "_blank");
  };

  return (
    <SettingsGrid>
      {commands.map((command) => (
        <Stack direction="row" alignItems="flex-start" key={command.name}>
          <TextField
            size="small"
            label={command.description}
            value={command.shortcut || ""}
            fullWidth
            disabled
          />
          <IconButton
            onClick={handleEdit}
            aria-label={i18n("edit_shortcut", "Edit shortcut")}
          >
            <EditIcon />
          </IconButton>
        </Stack>
      ))}
    </SettingsGrid>
  );
}

export default function Settings() {
  const i18n = useI18n();
  const { setting, updateSetting } = useSetting();
  const rules = useRules();
  const alert = useAlert();
  const { fab, updateFab } = useFab();
  const { allTextStyles } = useAllTextStyles();
  const globalRule =
    rules.list.find((rule) => rule.pattern === GLOBAL_KEY) || GLOBLA_RULE;
  const enabledProfiles = (setting.transApis || []).filter(
    (profile) => !profile.isDisabled
  );

  const handleSettingChange = (event) => {
    event.preventDefault();
    const { name, value } = event.target;
    if (name === "csplist" || name === "orilist") {
      isExt && sendBgMsg(MSG_UPDATE_CSP, { [name]: value });
    }
    updateSetting({ [name]: value });
  };

  const updateGlobalRule = (event) => {
    const { name, value } = event.target;
    rules.put(GLOBAL_KEY, { [name]: value });
  };

  const updateRuleToggle = (name) => (event) => {
    rules.put(GLOBAL_KEY, { [name]: String(event.target.checked) });
  };

  const handleClearCache = () => {
    try {
      caches.delete(CACHE_NAME);
      alert.success(i18n("clear_success"));
    } catch (error) {
      kissLog("clear cache", error);
    }
  };

  const handleImport = async (data) => {
    try {
      updateSetting(JSON.parse(data));
    } catch (error) {
      kissLog("import setting", error);
    }
  };

  const {
    uiLang,
    minLength,
    maxLength,
    clearCache,
    newlineLength = TRANS_NEWLINE_LENGTH,
    httpTimeout = DEFAULT_HTTP_TIMEOUT,
    contextMenusEnabled = true,
    blacklist = DEFAULT_BLACKLIST.join(",\n"),
    csplist = DEFAULT_CSPLIST.join(",\n"),
    orilist = DEFAULT_ORILIST.join(",\n"),
    transInterval = 100,
    langDetector = "-",
    logLevel = 1,
    preInit = true,
    skipLangs = [],
  } = setting;
  const { isHide = false } = fab || {};
  const isFabHidden = isHide === true || isHide === "true";

  return (
    <Stack spacing={3}>
      <SettingsSection
        title={i18n("default_translation_pass", "Default translation pass")}
        description={i18n(
          "default_translation_pass_description",
          "The languages, engine, and reading layout used when a website has no override."
        )}
      >
        <Stack spacing={2.5}>
          <Box
            sx={(theme) => ({
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr auto 1fr" },
              alignItems: "stretch",
              gap: { xs: 1, md: 0 },
              overflow: "hidden",
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 1,
              backgroundColor: alpha(theme.palette.background.default, 0.45),
            })}
          >
            <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Typography variant="overline" color="secondary.main">
                {i18n("source_text", "Source")}
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.8 }}>
                The page keeps its voice.
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.8 }}
              >
                {i18n(
                  "source_preview",
                  "Original paragraphs stay beside their translation."
                )}
              </Typography>
            </Box>
            <Box
              aria-hidden="true"
              sx={(theme) => ({
                width: { xs: "100%", md: 1 },
                height: { xs: 1, md: "100%" },
                backgroundColor: theme.palette.divider,
              })}
            />
            <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Typography variant="overline" color="primary.main">
                {i18n("translation", "Translation")}
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.8, color: "primary.main" }}>
                页面保留原来的语气。
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.8 }}
              >
                {i18n(
                  "translation_preview",
                  "A clean bilingual reading pass, without study tools."
                )}
              </Typography>
            </Box>
          </Box>

          <SettingsGrid minColumnWidth={250}>
            <TextField
              select
              fullWidth
              size="small"
              name="fromLang"
              value={globalRule.fromLang}
              label={i18n("from_lang")}
              onChange={updateGlobalRule}
            >
              {OPT_LANGS_FROM.map(([code, name]) => (
                <MenuItem key={code} value={code}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              size="small"
              name="toLang"
              value={globalRule.toLang}
              label={i18n("to_lang")}
              onChange={updateGlobalRule}
            >
              {OPT_LANGS_TO.map(([code, name]) => (
                <MenuItem key={code} value={code}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              size="small"
              name="apiSlug"
              value={globalRule.apiSlug}
              label={i18n("translation_engine", "Translation engine")}
              onChange={updateGlobalRule}
            >
              {!enabledProfiles.some(
                ({ apiSlug }) => apiSlug === globalRule.apiSlug
              ) && (
                <MenuItem value={globalRule.apiSlug} disabled>
                  {globalRule.apiSlug}
                </MenuItem>
              )}
              {enabledProfiles.map((profile) => (
                <MenuItem key={profile.apiSlug} value={profile.apiSlug}>
                  {profile.apiName || profile.apiType}
                  {profile.model ? ` · ${profile.model}` : ""}
                </MenuItem>
              ))}
            </TextField>
          </SettingsGrid>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            alignItems={{ sm: "center" }}
          >
            <Button
              component={Link}
              href="#/apis"
              variant="outlined"
              startIcon={<HubOutlinedIcon />}
            >
              {i18n("manage_translation_engines", "Manage translation engines")}
            </Button>
            <Typography variant="caption" color="text.secondary">
              {i18n("saved_automatically", "Changes are saved automatically.")}
            </Typography>
          </Stack>
        </Stack>
      </SettingsSection>

      <SettingsSection
        title={i18n("reading_layout", "Reading layout")}
        description={i18n(
          "reading_layout_description",
          "Choose what the translated page shows and how it starts."
        )}
      >
        <SettingsGrid>
          <SettingsToggle
            label={i18n(
              "auto_translate_pages",
              "Translate pages automatically"
            )}
            description={i18n(
              "auto_translate_pages_description",
              "Start translation as soon as a matching page is ready."
            )}
            control={
              <Switch
                checked={globalRule.transOpen === "true"}
                onChange={updateRuleToggle("transOpen")}
              />
            }
          />
          <SettingsToggle
            label={i18n("bilingual_reading", "Bilingual reading")}
            description={i18n(
              "bilingual_reading_description",
              "Keep the source text visible with its translation."
            )}
            control={
              <Switch
                checked={globalRule.transOnly !== "true"}
                onChange={(event) =>
                  rules.put(GLOBAL_KEY, {
                    transOnly: String(!event.target.checked),
                  })
                }
              />
            }
          />
          <SettingsToggle
            label={i18n("translate_page_title")}
            description={i18n(
              "translate_page_title_description",
              "Translate the browser tab title as well as page content."
            )}
            control={
              <Switch
                checked={globalRule.transTitle === "true"}
                onChange={updateRuleToggle("transTitle")}
              />
            }
          />
          <TextField
            select
            fullWidth
            size="small"
            name="transOrder"
            value={globalRule.transOrder}
            label={i18n("trans_order")}
            onChange={updateGlobalRule}
            disabled={globalRule.transOnly === "true"}
          >
            <MenuItem value="original-first">{i18n("original_first")}</MenuItem>
            <MenuItem value="translation-first">
              {i18n("translation_first")}
            </MenuItem>
          </TextField>
          <TextField
            select
            fullWidth
            size="small"
            name="textStyle"
            value={globalRule.textStyle}
            label={i18n("text_style")}
            onChange={updateGlobalRule}
          >
            {allTextStyles.map((style) => (
              <MenuItem key={style.styleSlug} value={style.styleSlug}>
                {style.styleName}
              </MenuItem>
            ))}
          </TextField>
          <SettingsToggle
            label={i18n("show_fab_button")}
            description={i18n(
              "show_fab_button_description",
              "Show the small page control for translation actions."
            )}
            control={
              <Switch
                checked={!isFabHidden}
                onChange={(event) =>
                  updateFab({ isHide: !event.target.checked })
                }
              />
            }
          />
        </SettingsGrid>
      </SettingsSection>

      <SettingsAccordionSection
        title={i18n("page_translation_tuning", "Page translation tuning")}
        description={i18n(
          "page_translation_tuning_description",
          "Language detection, text limits, request timing, and excluded websites."
        )}
      >
        <Stack spacing={2.5}>
          <SettingsGrid>
            <TextField
              select
              fullWidth
              size="small"
              name="uiLang"
              value={uiLang}
              label={i18n("ui_lang")}
              onChange={handleSettingChange}
            >
              {UI_LANGS.map(([lang, name]) => (
                <MenuItem key={lang} value={lang}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              size="small"
              name="preInit"
              value={preInit}
              label={i18n("if_pre_init")}
              onChange={handleSettingChange}
            >
              <MenuItem value={true}>{i18n("enable")}</MenuItem>
              <MenuItem value={false}>{i18n("disable")}</MenuItem>
            </TextField>
            <ValidationInput
              fullWidth
              size="small"
              label={i18n("min_translate_length")}
              type="number"
              name="minLength"
              value={minLength}
              onChange={handleSettingChange}
              min={1}
              max={100}
            />
            <ValidationInput
              fullWidth
              size="small"
              label={i18n("max_translate_length")}
              type="number"
              name="maxLength"
              value={maxLength}
              onChange={handleSettingChange}
              min={100}
              max={100000}
            />
            <ValidationInput
              fullWidth
              size="small"
              label={i18n("num_of_newline_characters")}
              type="number"
              name="newlineLength"
              value={newlineLength}
              onChange={handleSettingChange}
              min={1}
              max={1000}
            />
            <TextField
              select
              fullWidth
              size="small"
              name="langDetector"
              value={langDetector}
              label={i18n("detected_lang")}
              onChange={handleSettingChange}
            >
              <MenuItem value="-">{i18n("disable")}</MenuItem>
              {OPT_LANGDETECTOR_ALL.map((item) => (
                <MenuItem value={item} key={item}>
                  {item}
                </MenuItem>
              ))}
            </TextField>
            <ValidationInput
              fullWidth
              size="small"
              label={i18n("translate_interval")}
              type="number"
              name="transInterval"
              value={transInterval}
              onChange={handleSettingChange}
              min={1}
              max={2000}
            />
            <ValidationInput
              fullWidth
              size="small"
              label={i18n("http_timeout")}
              type="number"
              name="httpTimeout"
              value={httpTimeout}
              onChange={handleSettingChange}
              min={1}
              max={600}
            />
            <SettingsToggle
              label={i18n("context_menus")}
              description={i18n(
                "context_menus_description",
                "Add page translation actions to the browser right-click menu."
              )}
              control={
                <Switch
                  checked={contextMenusEnabled !== false}
                  onChange={(event) => {
                    const enabled = event.target.checked;
                    isExt && sendBgMsg(MSG_CONTEXT_MENUS, enabled ? 1 : 0);
                    updateSetting({
                      contextMenusEnabled: enabled,
                      contextMenuType: 1,
                    });
                  }}
                />
              }
            />
            {isExt && (
              <TextField
                select
                fullWidth
                size="small"
                name="clearCache"
                value={clearCache}
                label={i18n("if_clear_cache")}
                onChange={handleSettingChange}
                helperText={
                  <Link component="button" onClick={handleClearCache}>
                    {i18n("clear_all_cache_now")}
                  </Link>
                }
              >
                <MenuItem value={false}>{i18n("clear_cache_never")}</MenuItem>
                <MenuItem value={true}>{i18n("clear_cache_restart")}</MenuItem>
              </TextField>
            )}
          </SettingsGrid>
          <TextField
            select
            fullWidth
            size="small"
            label={i18n("skip_langs")}
            helperText={i18n("skip_langs_helper")}
            name="skipLangs"
            value={skipLangs}
            onChange={handleSettingChange}
            SelectProps={{ multiple: true }}
          >
            {OPT_LANGS_TO.map(([code, name]) => (
              <MenuItem key={code} value={code}>
                {name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            size="small"
            label={i18n("translate_blacklist")}
            helperText={i18n("pattern_helper")}
            name="blacklist"
            value={blacklist}
            onChange={handleSettingChange}
            minRows={3}
            maxRows={10}
            multiline
          />
        </Stack>
      </SettingsAccordionSection>

      <SettingsAccordionSection
        title={i18n("settings_shortcuts_section", "Keyboard shortcuts")}
        description={
          isExt
            ? i18n(
                "settings_shortcuts_extension_description",
                "Browser extension shortcuts are managed by your browser."
              )
            : i18n(
                "settings_shortcuts_userscript_description",
                "Choose the userscript key combinations for page translation."
              )
        }
      >
        {isExt ? (
          <ExtCommands />
        ) : (
          <SettingsGrid>
            <ShortcutItem
              action={OPT_SHORTCUT_TRANSLATE}
              label={i18n("toggle_translate_shortcut")}
            />
            <ShortcutItem
              action={OPT_SHORTCUT_TRANSONLY}
              label={i18n("toggle_transonly_shortcut")}
            />
            <ShortcutItem
              action={OPT_SHORTCUT_STYLE}
              label={i18n("toggle_style_shortcut")}
            />
            <ShortcutItem
              action={OPT_SHORTCUT_SETTING}
              label={i18n("open_setting_shortcut")}
            />
          </SettingsGrid>
        )}
      </SettingsAccordionSection>

      <SettingsAccordionSection
        title={i18n("settings_advanced_section", "Diagnostics & compatibility")}
        description={i18n(
          "settings_advanced_section_description",
          "Browser request workarounds and diagnostic logging."
        )}
      >
        <Stack spacing={2.5}>
          <SettingsGrid>
            <TextField
              select
              fullWidth
              size="small"
              name="logLevel"
              value={logLevel}
              label={i18n("log_level")}
              onChange={handleSettingChange}
            >
              {Object.values(LogLevel).map(({ value, name }) => (
                <MenuItem value={value} key={value}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
          </SettingsGrid>
          {isExt && (
            <>
              <TextField
                fullWidth
                size="small"
                label={i18n("disabled_orilist")}
                helperText={i18n("pattern_helper")}
                name="orilist"
                value={orilist}
                onChange={handleSettingChange}
                minRows={2}
                multiline
              />
              <TextField
                fullWidth
                size="small"
                label={i18n("disabled_csplist")}
                helperText={`${i18n("pattern_helper")} ${i18n("disabled_csplist_helper")}`}
                name="csplist"
                value={csplist}
                onChange={handleSettingChange}
                minRows={2}
                multiline
              />
            </>
          )}
        </Stack>
      </SettingsAccordionSection>

      <SettingsSection
        title={i18n("settings_backup_section", "Local settings backup")}
        description={i18n(
          "settings_backup_section_description",
          "Export a local copy or restore a compatible settings file. No cloud account is required."
        )}
      >
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <UploadButton text={i18n("import")} handleImport={handleImport} />
          <DownloadButton
            handleData={() => JSON.stringify(setting, null, 2)}
            text={i18n("export")}
            fileName={`kiss-setting_v2_${Date.now()}.json`}
          />
        </Stack>
      </SettingsSection>
    </Stack>
  );
}
