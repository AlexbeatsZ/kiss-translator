import SettingsIcon from "@mui/icons-material/Settings";
import InfoIcon from "@mui/icons-material/Info";
import DesignServicesIcon from "@mui/icons-material/DesignServices";
import SyncIcon from "@mui/icons-material/Sync";
import ApiIcon from "@mui/icons-material/Api";
import InputIcon from "@mui/icons-material/Input";
import SelectAllIcon from "@mui/icons-material/SelectAll";
import EventNoteIcon from "@mui/icons-material/EventNote";
import MouseIcon from "@mui/icons-material/Mouse";
import SubtitlesIcon from "@mui/icons-material/Subtitles";
import FormatColorTextIcon from "@mui/icons-material/FormatColorText";
import BugReportIcon from "@mui/icons-material/BugReport";
import TextSnippetIcon from "@mui/icons-material/TextSnippet";

/**
 * Build the settings navigation and page metadata from one source of truth.
 * Every new label uses an English fallback until its locale entry is available.
 */
export function getSettingsNavigation(i18n) {
  return [
    {
      id: "general",
      label: i18n("settings_group_general", "General"),
      items: [
        {
          id: "basic_setting",
          title: i18n("general_settings_title", "General settings"),
          description: i18n(
            "general_settings_description",
            "Interface, page translation behavior, shortcuts, and advanced browser controls."
          ),
          url: "/",
          icon: SettingsIcon,
        },
      ],
    },
    {
      id: "translation_setup",
      label: i18n("settings_group_translation", "Translation setup"),
      items: [
        {
          id: "apis_setting",
          title: i18n(
            "translation_services_models",
            "Translation services & models"
          ),
          description: i18n(
            "translation_services_models_description",
            "Configure providers, credentials, and the model used by each translation service."
          ),
          url: "/apis",
          icon: ApiIcon,
        },
        {
          id: "rules_setting",
          title: i18n("website_translation_rules", "Website translation rules"),
          description: i18n(
            "website_translation_rules_description",
            "Choose which sites and page regions are translated, with optional per-site service overrides."
          ),
          url: "/rules",
          icon: DesignServicesIcon,
        },
        {
          id: "prompt_management",
          title: i18n("prompt_management", "Prompt management"),
          description: i18n(
            "prompt_management_description",
            "Manage prompts used by AI translation, subtitles, and the dictionary."
          ),
          url: "/prompts",
          icon: TextSnippetIcon,
        },
      ],
    },
    {
      id: "translation_features",
      label: i18n("settings_group_features", "Translation features"),
      items: [
        {
          id: "input_translate",
          title: i18n("input_translate", "Input translation"),
          description: i18n(
            "input_translate_description",
            "Translate text directly inside editable fields with shortcuts or trigger characters."
          ),
          url: "/input",
          icon: InputIcon,
        },
        {
          id: "selection_translate",
          title: i18n("selection_translate", "Selection translation"),
          description: i18n(
            "selection_translate_description",
            "Control the popup, dictionaries, languages, and services used for selected text."
          ),
          url: "/tranbox",
          icon: SelectAllIcon,
        },
        {
          id: "mousehover_translate",
          title: i18n("mousehover_translate", "Hover translation"),
          description: i18n(
            "mousehover_translate_description",
            "Translate page text while hovering, either inline or in a compact bubble."
          ),
          url: "/mousehover",
          icon: MouseIcon,
        },
        {
          id: "subtitle_translate",
          title: i18n("subtitle_translate", "Video subtitles"),
          description: i18n(
            "subtitle_translate_description",
            "Configure subtitle translation, segmentation, playback behavior, and appearance."
          ),
          url: "/subtitle",
          icon: SubtitlesIcon,
        },
      ],
    },
    {
      id: "personal_data",
      label: i18n("settings_group_personal_data", "Personalization & data"),
      items: [
        {
          id: "styles_setting",
          title: i18n("styles_setting", "Translation styles"),
          description: i18n(
            "styles_setting_description",
            "Create and preview reusable styles for translated page content."
          ),
          url: "/styles",
          icon: FormatColorTextIcon,
        },
        {
          id: "words",
          title: i18n("favorite_words", "Vocabulary"),
          description: i18n(
            "favorite_words_description",
            "Review saved words and export them for study or backup."
          ),
          url: "/words",
          icon: EventNoteIcon,
        },
        {
          id: "sync",
          title: i18n("sync_setting", "Sync & backup"),
          description: i18n(
            "sync_setting_description",
            "Keep settings, rules, and vocabulary synchronized across devices."
          ),
          url: "/sync",
          icon: SyncIcon,
        },
      ],
    },
    {
      id: "tools_help",
      label: i18n("settings_group_tools_help", "Tools & help"),
      items: [
        {
          id: "playground",
          title: i18n("translation_playground", "Translation playground"),
          description: i18n(
            "translation_playground_description",
            "Try the current services, languages, prompts, and selection settings."
          ),
          url: "/playground",
          icon: BugReportIcon,
        },
        {
          id: "about",
          title: i18n("about", "About"),
          description: i18n(
            "about_description",
            "Project information, documentation, and release details."
          ),
          url: "/about",
          icon: InfoIcon,
        },
      ],
    },
  ];
}

export function getSettingsPageMeta(pathname, i18n) {
  const groups = getSettingsNavigation(i18n);
  const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "");

  for (const group of groups) {
    const item = group.items.find(({ url }) =>
      url === "/"
        ? normalizedPath === "/"
        : normalizedPath === url || normalizedPath.startsWith(`${url}/`)
    );

    if (item) {
      return {
        ...item,
        groupLabel: group.label,
      };
    }
  }

  return {
    title: i18n("settings", "Settings"),
    description: i18n(
      "settings_description",
      "Configure how KISS Translator works for you."
    ),
    groupLabel: i18n("settings_group_general", "General"),
  };
}
