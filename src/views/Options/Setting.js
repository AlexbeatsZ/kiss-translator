import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import { useSetting } from "../../hooks/Setting";
import { useRules } from "../../hooks/Rules";
import { useI18n } from "../../hooks/I18n";
import { useAlert } from "../../hooks/Alert";
import { useShortcut } from "../../hooks/Shortcut";
import { isExt } from "../../libs/client";
import { browser } from "../../libs/browser";
import { sendBgMsg } from "../../libs/msg";
import { kissLog, LogLevel } from "../../libs/log";
import {
  CACHE_NAME,
  DEFAULT_CSPLIST,
  DEFAULT_HTTP_TIMEOUT,
  DEFAULT_ORILIST,
  DEFAULT_RULE,
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
            aria-label={i18n("edit_shortcut", "编辑快捷键")}
          >
            <EditIcon />
          </IconButton>
        </Stack>
      ))}
    </SettingsGrid>
  );
}

function SiteExclusions() {
  const i18n = useI18n();
  const rules = useRules();
  const alert = useAlert();
  const [pattern, setPattern] = useState("");
  const sites = (rules.list || []).filter(
    (rule) => rule.pattern !== GLOBAL_KEY && rule.transOpen === "false"
  );

  const handleAdd = (event) => {
    event.preventDefault();
    const nextPattern = pattern.trim();
    if (!nextPattern) return;

    const exists = (rules.list || []).some(
      (rule) => rule.pattern === nextPattern
    );
    if (exists) {
      alert.error(i18n("website_already_saved", "这个网站已经在列表里了。"));
      return;
    }

    rules.add({ ...DEFAULT_RULE, pattern: nextPattern, transOpen: "false" });
    setPattern("");
  };

  const handleDelete = (sitePattern) => {
    rules.del(sitePattern);
  };

  return (
    <SettingsSection
      title={i18n("no_auto_translate_sites", "不自动翻译的网站")}
      description={i18n(
        "no_auto_translate_sites_description",
        "添加网站后，这些网站不会自动开始翻译；你可以随时移除。"
      )}
    >
      <Stack spacing={2}>
        <Stack
          component="form"
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", sm: "center" }}
          onSubmit={handleAdd}
        >
          <TextField
            size="small"
            fullWidth
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
            placeholder={i18n("website_placeholder", "例如：youtube.com")}
            label={i18n("website", "网站")}
          />
          <Button
            type="submit"
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ minHeight: 40, minWidth: 104 }}
          >
            {i18n("add")}
          </Button>
        </Stack>

        {sites.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {i18n(
              "no_auto_translate_sites_empty",
              "还没有保存任何网站。开启自动翻译后，所有网站都会自动翻译。"
            )}
          </Typography>
        ) : (
          <Stack spacing={1}>
            {sites.map((site) => (
              <Stack
                key={site.pattern}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
                sx={(theme) => ({
                  px: 1.5,
                  py: 0.75,
                  minHeight: 44,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1.25,
                  backgroundColor: theme.translationTokens?.surfaceRaised,
                })}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: "JetBrains Mono, Cascadia Mono, monospace",
                    overflowWrap: "anywhere",
                    minWidth: 0,
                  }}
                >
                  {site.pattern}
                </Typography>
                <IconButton
                  size="small"
                  aria-label={i18n("remove_site", "移除网站")}
                  onClick={() => handleDelete(site.pattern)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        )}
      </Stack>
    </SettingsSection>
  );
}

export default function Settings() {
  const i18n = useI18n();
  const { setting, updateSetting } = useSetting();
  const rules = useRules();
  const alert = useAlert();
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
    csplist = DEFAULT_CSPLIST.join(",\n"),
    orilist = DEFAULT_ORILIST.join(",\n"),
    transInterval = 100,
    langDetector = "-",
    logLevel = 1,
    preInit = true,
    skipLangs = [],
  } = setting;

  return (
    <Stack spacing={3}>
      <SettingsSection
        title={i18n("default_page_flow", "网页翻译")}
        description={i18n(
          "default_translation_pass_description",
          "设置所有网站默认使用的翻译流程。"
        )}
        action={
          <Button
            component={Link}
            href="#/apis"
            variant="text"
            size="small"
            startIcon={<HubOutlinedIcon />}
          >
            {i18n("manage_translation_engines", "管理翻译引擎")}
          </Button>
        }
      >
        <Stack spacing={2}>
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
              label={i18n("translation_engine", "翻译引擎")}
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
          <SettingsGrid minColumnWidth={260}>
            <SettingsToggle
              label={i18n("auto_translate_pages", "自动翻译网页")}
              description={i18n(
                "auto_translate_pages_description",
                "打开网页后自动开始翻译。"
              )}
              control={
                <Switch
                  checked={globalRule.transOpen === "true"}
                  onChange={updateRuleToggle("transOpen")}
                />
              }
            />
            <Box>
              <Typography variant="caption" color="text.secondary">
                {i18n("reading_mode", "阅读模式")}
              </Typography>
              <ToggleButtonGroup
                exclusive
                fullWidth
                size="small"
                value={
                  globalRule.transOnly === "true" ? "translation" : "bilingual"
                }
                onChange={(_event, value) => {
                  if (value) {
                    rules.put(GLOBAL_KEY, {
                      transOnly: String(value === "translation"),
                    });
                  }
                }}
                sx={{ mt: 0.55 }}
              >
                <ToggleButton value="bilingual">
                  {i18n("bilingual", "双语")}
                </ToggleButton>
                <ToggleButton value="translation">
                  {i18n("translation_only", "仅译文")}
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {globalRule.transOnly !== "true" && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {i18n("trans_order", "阅读顺序")}
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  size="small"
                  value={globalRule.transOrder}
                  onChange={(_event, value) =>
                    value && rules.put(GLOBAL_KEY, { transOrder: value })
                  }
                  sx={{ mt: 0.55 }}
                >
                  <ToggleButton value="original-first">
                    {i18n("original_first")}
                  </ToggleButton>
                  <ToggleButton value="translation-first">
                    {i18n("translation_first")}
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            )}
          </SettingsGrid>
          <Typography variant="caption" color="text.secondary">
            {i18n("saved_automatically", "已自动保存")}
          </Typography>
        </Stack>
      </SettingsSection>

      <SiteExclusions />

      <SettingsAccordionSection
        title={i18n("page_translation_tuning", "翻译调优")}
        description={i18n(
          "page_translation_tuning_description",
          "语言检测、文本长度、请求节奏和右键菜单。"
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
                "在浏览器右键菜单中加入翻译操作。"
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
        </Stack>
      </SettingsAccordionSection>

      <SettingsAccordionSection
        title={i18n("settings_shortcuts_section", "键盘快捷键")}
        description={
          isExt
            ? i18n(
                "settings_shortcuts_extension_description",
                "浏览器扩展快捷键由浏览器管理。"
              )
            : i18n(
                "settings_shortcuts_userscript_description",
                "选择油猴脚本使用的按键组合。"
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
        title={i18n("settings_advanced_section", "诊断与兼容")}
        description={i18n(
          "settings_advanced_section_description",
          "浏览器请求兼容和诊断日志。"
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

      <SettingsAccordionSection
        title={i18n("settings_backup_section", "设置备份")}
        description={i18n(
          "settings_backup_section_description",
          "导出本地设置副本，或恢复兼容的备份。"
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
      </SettingsAccordionSection>
    </Stack>
  );
}
