import { useEffect, useState } from "react";
import IconButton from "@mui/material/IconButton";
import EditIcon from "@mui/icons-material/Edit";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Link from "@mui/material/Link";
import Switch from "@mui/material/Switch";
import { useSetting } from "../../hooks/Setting";
import { useI18n } from "../../hooks/I18n";
import { useAlert } from "../../hooks/Alert";
import { isExt } from "../../libs/client";
import { browser } from "../../libs/browser";
import {
  UI_LANGS,
  TRANS_NEWLINE_LENGTH,
  CACHE_NAME,
  OPT_LANGDETECTOR_ALL,
  OPT_SHORTCUT_TRANSLATE,
  OPT_SHORTCUT_TRANSONLY,
  OPT_SHORTCUT_STYLE,
  OPT_SHORTCUT_POPUP,
  OPT_SHORTCUT_SETTING,
  DEFAULT_BLACKLIST,
  DEFAULT_CSPLIST,
  DEFAULT_ORILIST,
  MSG_CONTEXT_MENUS,
  MSG_UPDATE_CSP,
  DEFAULT_HTTP_TIMEOUT,
  OPT_LANGS_TO_REVERSED as OPT_LANGS_TO,
} from "../../config";
import { useShortcut } from "../../hooks/Shortcut";
import ShortcutInput from "./ShortcutInput";
import { useFab } from "../../hooks/Fab";
import { sendBgMsg } from "../../libs/msg";
import { kissLog, LogLevel } from "../../libs/log";
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
    if (browser?.commands?.getAll) {
      browser.commands
        .getAll()
        .then((items) => {
          if (items) {
            setCommands(items.filter((item) => item.description));
          }
        })
        .catch((err) => {
          console.error("fetch commands error:", err);
        });
    }
  }, []);

  if (!commands || commands.length === 0) return null;

  const handleEdit = () => {
    let url = "chrome://extensions/shortcuts";
    const ua = navigator.userAgent;
    if (ua.includes("Edg/")) {
      url = "edge://extensions/shortcuts";
    } else if (ua.includes("Firefox/")) {
      url = "about:addons";
    } else if (ua.includes("OPR/")) {
      url = "opera://extensions/shortcuts";
    } else if (ua.includes("Brave/")) {
      url = "brave://extensions/shortcuts";
    }

    if (browser?.tabs?.create) {
      browser.tabs.create({ url });
    } else {
      window.open(url, "_blank");
    }
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
  const alert = useAlert();
  const { fab, updateFab } = useFab();

  const handleChange = (event) => {
    event.preventDefault();
    const { name, value } = event.target;

    switch (name) {
      case "csplist":
        isExt && sendBgMsg(MSG_UPDATE_CSP, { csplist: value });
        break;
      case "orilist":
        isExt && sendBgMsg(MSG_UPDATE_CSP, { orilist: value });
        break;
      default:
    }

    updateSetting({
      [name]: value,
    });
  };

  const updateContextMenus = ({ enabled, type } = {}) => {
    const nextEnabled =
      typeof enabled === "boolean" ? enabled : isContextMenuEnabled;
    const nextContextMenuType = Number(type ?? contextMenuDisplayType);
    isExt &&
      sendBgMsg(MSG_CONTEXT_MENUS, nextEnabled ? nextContextMenuType : 0);
    updateSetting({
      contextMenusEnabled: nextEnabled,
      contextMenuType: nextContextMenuType,
    });
  };

  const handleClearCache = () => {
    try {
      caches.delete(CACHE_NAME);
      alert.success(i18n("clear_success"));
    } catch (err) {
      kissLog("clear cache", err);
    }
  };

  const handleImport = async (data) => {
    try {
      updateSetting(JSON.parse(data));
    } catch (err) {
      kissLog("import setting", err);
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
    contextMenuType = 1,
    touchModes = [2],
    blacklist = DEFAULT_BLACKLIST.join(",\n"),
    csplist = DEFAULT_CSPLIST.join(",\n"),
    orilist = DEFAULT_ORILIST.join(",\n"),
    transInterval = 100,
    langDetector = "-",
    logLevel = 1,
    preInit = true,
    skipLangs = [],
  } = setting;
  const { isHide = false, fabClickAction = 0 } = fab || {};
  const isFabHidden = isHide === true || isHide === "true";
  const normalizedContextMenuType = Number(contextMenuType);
  const hasContextMenuType = [1, 2].includes(normalizedContextMenuType);
  const isContextMenuEnabled =
    contextMenusEnabled !== false && hasContextMenuType;
  const contextMenuDisplayType = hasContextMenuType
    ? normalizedContextMenuType
    : 1;

  return (
    <Stack spacing={3}>
      <SettingsSection
        title={i18n("settings_interface_section", "Interface & startup")}
        description={i18n(
          "settings_interface_section_description",
          "Choose how the settings interface opens and how page controls appear. Changes are saved automatically."
        )}
      >
        <SettingsGrid>
          <TextField
            select
            fullWidth
            size="small"
            name="uiLang"
            value={uiLang}
            label={i18n("ui_lang")}
            onChange={handleChange}
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
            onChange={handleChange}
          >
            <MenuItem value={true}>{i18n("enable")}</MenuItem>
            <MenuItem value={false}>{i18n("disable")}</MenuItem>
          </TextField>

          <SettingsToggle
            label={i18n("show_fab_button")}
            description={i18n(
              "show_fab_button_description",
              "Show the page control used to start translation or open its menu."
            )}
            control={
              <Switch
                name="isHide"
                checked={!isFabHidden}
                onChange={(event) => {
                  updateFab({ isHide: !event.target.checked });
                }}
              />
            }
          />

          <TextField
            select
            fullWidth
            size="small"
            name="fabClickAction"
            value={fabClickAction}
            label={i18n("fab_click_action")}
            onChange={(event) =>
              updateFab({ fabClickAction: event.target.value })
            }
            disabled={isFabHidden}
          >
            <MenuItem value={0}>{i18n("fab_click_menu")}</MenuItem>
            <MenuItem value={1}>{i18n("fab_click_translate")}</MenuItem>
          </TextField>
        </SettingsGrid>
      </SettingsSection>

      <SettingsSection
        title={i18n(
          "settings_page_translation_section",
          "Page translation behavior"
        )}
        description={i18n(
          "settings_page_translation_section_description",
          "Control which text is translated and which languages or sites should be skipped."
        )}
      >
        <Stack spacing={2.5}>
          <SettingsGrid>
            <ValidationInput
              fullWidth
              size="small"
              label={i18n("min_translate_length")}
              type="number"
              name="minLength"
              value={minLength}
              onChange={handleChange}
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
              onChange={handleChange}
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
              onChange={handleChange}
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
              onChange={handleChange}
            >
              <MenuItem value="-">{i18n("disable")}</MenuItem>
              {OPT_LANGDETECTOR_ALL.map((item) => (
                <MenuItem value={item} key={item}>
                  {item}
                </MenuItem>
              ))}
            </TextField>
          </SettingsGrid>

          <TextField
            select
            fullWidth
            size="small"
            label={i18n("skip_langs")}
            helperText={i18n("skip_langs_helper")}
            name="skipLangs"
            value={skipLangs}
            onChange={handleChange}
            SelectProps={{ multiple: true }}
          >
            {OPT_LANGS_TO.map(([langKey, langName]) => (
              <MenuItem key={langKey} value={langKey}>
                {langName}
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
            onChange={handleChange}
            minRows={3}
            maxRows={10}
            multiline
          />
        </Stack>
      </SettingsSection>

      <SettingsSection
        title={i18n("settings_interaction_section", "Browser interactions")}
        description={i18n(
          "settings_interaction_section_description",
          "Configure touch gestures and the browser context menu."
        )}
      >
        <SettingsGrid>
          <TextField
            select
            fullWidth
            size="small"
            name="touchModes"
            value={touchModes}
            label={i18n("touch_translate_shortcut")}
            onChange={handleChange}
            SelectProps={{ multiple: true }}
          >
            {[0, 2, 3, 4, 5, 6, 7].map((item) => (
              <MenuItem key={item} value={item}>
                {i18n(`touch_tap_${item}`)}
              </MenuItem>
            ))}
          </TextField>

          <SettingsToggle
            label={i18n("context_menus")}
            description={i18n(
              "context_menus_description",
              "Add translation actions to the browser right-click menu."
            )}
            control={
              <Switch
                name="contextMenuEnabled"
                checked={isContextMenuEnabled}
                onChange={(event) =>
                  updateContextMenus({ enabled: event.target.checked })
                }
              />
            }
          />

          <TextField
            select
            fullWidth
            size="small"
            name="contextMenuType"
            value={contextMenuDisplayType}
            label={i18n("context_menu_type")}
            onChange={(event) =>
              updateContextMenus({ enabled: true, type: event.target.value })
            }
            disabled={!isContextMenuEnabled}
          >
            <MenuItem value={1}>{i18n("simple_context_menus")}</MenuItem>
            <MenuItem value={2}>{i18n("secondary_context_menus")}</MenuItem>
          </TextField>
        </SettingsGrid>
      </SettingsSection>

      <SettingsSection
        title={i18n("settings_network_section", "Network & performance")}
        description={i18n(
          "settings_network_section_description",
          "Tune request timing and local translation cache behavior."
        )}
      >
        <SettingsGrid>
          <ValidationInput
            fullWidth
            size="small"
            label={i18n("translate_interval")}
            type="number"
            name="transInterval"
            value={transInterval}
            onChange={handleChange}
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
            onChange={handleChange}
            min={1}
            max={600}
          />

          {isExt && (
            <TextField
              select
              fullWidth
              size="small"
              name="clearCache"
              value={clearCache}
              label={i18n("if_clear_cache")}
              onChange={handleChange}
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
      </SettingsSection>

      <SettingsSection
        title={i18n("settings_shortcuts_section", "Keyboard shortcuts")}
        description={
          isExt
            ? i18n(
                "settings_shortcuts_extension_description",
                "Browser extension shortcuts are managed by your browser."
              )
            : i18n(
                "settings_shortcuts_userscript_description",
                "Choose the key combinations used by the userscript."
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
              action={OPT_SHORTCUT_POPUP}
              label={i18n("toggle_popup_shortcut")}
            />
            <ShortcutItem
              action={OPT_SHORTCUT_SETTING}
              label={i18n("open_setting_shortcut")}
            />
          </SettingsGrid>
        )}
      </SettingsSection>

      <SettingsAccordionSection
        title={i18n(
          "settings_advanced_section",
          "Advanced browser integration"
        )}
        description={i18n(
          "settings_advanced_section_description",
          "Diagnostics and compatibility controls for advanced users."
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
              onChange={handleChange}
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
                onChange={handleChange}
                minRows={2}
                multiline
              />
              <TextField
                fullWidth
                size="small"
                label={i18n("disabled_csplist")}
                helperText={`${i18n("pattern_helper")} ${i18n(
                  "disabled_csplist_helper"
                )}`}
                name="csplist"
                value={csplist}
                onChange={handleChange}
                minRows={2}
                multiline
              />
            </>
          )}
        </Stack>
      </SettingsAccordionSection>

      <SettingsSection
        title={i18n("settings_backup_section", "Settings backup")}
        description={i18n(
          "settings_backup_section_description",
          "Export a local copy of your settings or restore a compatible backup."
        )}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          flexWrap="wrap"
          useFlexGap
        >
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
