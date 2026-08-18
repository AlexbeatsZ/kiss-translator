import TranslateIcon from "@mui/icons-material/Translate";
import SubtitlesIcon from "@mui/icons-material/Subtitles";
import HubIcon from "@mui/icons-material/Hub";

/**
 * One focused navigation model shared by the desktop rail and mobile strip.
 * Order matches the reader's mental model: first choose/configure the
 * translation engine, then set page translation, then subtitle translation.
 */
export function getSettingsNavigation(i18n) {
  return [
    {
      id: "translation",
      label: i18n("settings_group_translation", "翻译"),
      items: [
        {
          id: "translation_options",
          title: i18n("translation_options", "翻译选项"),
          mobileTitle: i18n("translation_options_mobile", "翻译选项"),
          description: i18n(
            "translation_options_description",
            "配置翻译服务、模型和凭据。"
          ),
          url: "/apis",
          icon: HubIcon,
        },
        {
          id: "page_translation",
          title: i18n("page_translation", "网页翻译"),
          mobileTitle: i18n("page_translation_mobile", "网页翻译"),
          description: i18n(
            "page_translation_description",
            "选择翻译语言、引擎和显示方式，并管理不自动翻译的网站。"
          ),
          url: "/page",
          icon: TranslateIcon,
        },
        {
          id: "subtitle_translate",
          title: i18n("subtitle_translate", "字幕翻译"),
          mobileTitle: i18n("subtitle_translate_mobile", "字幕翻译"),
          description: i18n(
            "subtitle_translate_description",
            "翻译并显示同步双语视频字幕。"
          ),
          url: "/subtitle",
          icon: SubtitlesIcon,
        },
      ],
    },
  ];
}

export function getSettingsPageMeta(pathname, i18n) {
  const groups = getSettingsNavigation(i18n);
  const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "");

  for (const group of groups) {
    const item = group.items.find(
      ({ url }) =>
        normalizedPath === url || normalizedPath.startsWith(`${url}/`)
    );
    if (item) return { ...item, groupLabel: group.label };
  }

  return {
    title: i18n("settings", "设置"),
    description: i18n("settings_description", "根据需要配置翻译。"),
    groupLabel: i18n("settings_group_translation", "翻译"),
  };
}
