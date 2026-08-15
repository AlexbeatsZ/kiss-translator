import TranslateIcon from "@mui/icons-material/Translate";
import LanguageIcon from "@mui/icons-material/Language";
import SubtitlesIcon from "@mui/icons-material/Subtitles";
import HubIcon from "@mui/icons-material/Hub";

/** One focused navigation model shared by the desktop rail and mobile strip. */
export function getSettingsNavigation(i18n) {
  return [
    {
      id: "reading",
      label: i18n("settings_group_reading", "Bilingual reading"),
      items: [
        {
          id: "page_translation",
          title: i18n("page_translation", "Page translation"),
          description: i18n(
            "page_translation_description",
            "Choose the default languages, presentation, and page behaviour."
          ),
          url: "/",
          icon: TranslateIcon,
        },
        {
          id: "website_rules",
          title: i18n("website_translation_rules", "Website rules"),
          description: i18n(
            "website_translation_rules_description",
            "Decide which websites and page regions are translated."
          ),
          url: "/rules",
          icon: LanguageIcon,
        },
        {
          id: "subtitle_translate",
          title: i18n("subtitle_translate", "Subtitles"),
          description: i18n(
            "subtitle_translate_description",
            "Translate and present synchronized bilingual video captions."
          ),
          url: "/subtitle",
          icon: SubtitlesIcon,
        },
        {
          id: "translation_engines",
          title: i18n("translation_engines", "Translation engines"),
          description: i18n(
            "translation_engines_description",
            "Connect providers, local CLIs, and the model used for translation."
          ),
          url: "/apis",
          icon: HubIcon,
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
    if (item) return { ...item, groupLabel: group.label };
  }

  return {
    title: i18n("settings", "Settings"),
    description: i18n(
      "settings_description",
      "Configure page and subtitle translation."
    ),
    groupLabel: i18n("settings_group_reading", "Bilingual reading"),
  };
}
