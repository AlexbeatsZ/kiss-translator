/**
 * @file detect.js
 * @description 语言检测服务模块。整合了本地浏览器端检测与各大厂商（谷歌、微软、腾讯、百度等）的远程 API 检测服务，为划词和整页翻译提供基础语言代码匹配。
 */

import {
  OPT_TRANS_GOOGLE,
  OPT_TRANS_MICROSOFT,
  OPT_TRANS_BAIDU,
  OPT_TRANS_TENCENT,
  OPT_LANGS_TO_CODE,
  OPT_LANGS_MAP,
  OPT_TRANS_BUILTINAI,
  OPT_LANGDETECTOR_MAP,
} from "../config";
import { browser } from "./browser";
import {
  apiGoogleLangdetect,
  apiMicrosoftLangdetect,
  apiBaiduLangdetect,
  apiTencentLangdetect,
  apiBuiltinAIDetect,
} from "../apis";
import { kissLog } from "./log";

// 各个平台的语言检测函数映射表
const langdetectFns = {
  [OPT_TRANS_GOOGLE]: apiGoogleLangdetect,
  [OPT_TRANS_MICROSOFT]: apiMicrosoftLangdetect,
  [OPT_TRANS_BAIDU]: apiBaiduLangdetect,
  [OPT_TRANS_TENCENT]: apiTencentLangdetect,
  [OPT_TRANS_BUILTINAI]: apiBuiltinAIDetect,
};

const countMatches = (text, pattern) =>
  (String(text || "").match(pattern) || []).length;

/**
 * 使用文字系统做保守的目标语言预判。
 *
 * 这里只处理中文、日文和韩文：这些语言可以在不请求翻译服务的情况下，
 * 通过 Unicode 文字系统较可靠地识别。拉丁字母无法区分英语、法语、德语等，
 * 因此故意不在这里猜测，继续交给浏览器或用户配置的检测器。
 *
 * @param {string} text 待判断文本
 * @param {string} targetLang 目标语言代码
 * @returns {boolean} 文本是否已明显以目标语言为主
 */
export const isLikelyTargetLanguageText = (text, targetLang) => {
  const clean = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  const target = String(targetLang || "").toLowerCase();
  if (!clean || !target) return false;

  const han = countMatches(clean, /[\u3400-\u9fff\uf900-\ufaff]/g);
  const kana = countMatches(clean, /[\u3040-\u30ff]/g);
  const hangul = countMatches(clean, /[\uac00-\ud7af]/g);
  const latin = countMatches(clean, /[A-Za-z]/g);
  const scriptTotal = han + kana + hangul + latin;
  const isDominant = (count, minimum, ratio = 0.35) =>
    count >= minimum && count / Math.max(1, scriptTotal) >= ratio;

  if (target.startsWith("zh")) {
    // 有假名的文本优先视为日文，避免把日文汉字误判成中文。
    return kana < 2 && hangul < 2 && isDominant(han, 4);
  }

  if (target.startsWith("ja")) {
    return isDominant(kana + han, 4) && kana >= 2;
  }

  if (target.startsWith("ko")) {
    return isDominant(hangul, 4);
  }

  return false;
};

/**
 * 尝试检测给定文本的源语言代码
 * @param {string} text 待检测的文本内容
 * @param {string} [langDetector="-"] 选择的检测算法/接口类型 ("-" 表示仅使用本地检测)
 * @returns {Promise<string>} 语言代码（如 "en", "zh-CN", 若检测失败返回空字符串 ""）
 *
 * REVIEW:
 * 在第 52 行调用的 `browser?.i18n?.detectLanguage` 接口，仅在标准的 WebExtension 扩展环境中有效。
 * 在油猴脚本（Tampermonkey等）环境中，由于无法直接访问完整的 WebExtension 级 API，本地检测必然会报错并进入 catch 分支。
 * 针对油猴客户端，检测工作基本完全依赖远程语言识别服务。因此这套兜底设计是非常合理且必要的。
 */
export const tryDetectLang = async (text, langDetector = "-") => {
  let deLang = "";

  // 1. 如果配置了特定的远程/内置 AI 语言检测服务，则首选该服务进行识别
  if (OPT_LANGDETECTOR_MAP.has(langDetector)) {
    try {
      const lang = await langdetectFns[langDetector](text);
      if (lang) {
        // 转换成翻译器统一的语言代码格式
        deLang = OPT_LANGS_TO_CODE[langDetector].get(lang) || "";
      }
    } catch (err) {
      kissLog("detect lang remote", err);
    }
  }

  // 2. 如果远程识别没有得出结果，采用浏览器的 i18n API 执行本地原生识别作为兜底
  if (!deLang) {
    try {
      const res = await browser?.i18n?.detectLanguage(text);
      const lang = res?.languages?.[0]?.language;
      // 仅当识别置信度高 (isReliable) 且被当前插件支持时采纳
      if (res?.isReliable && lang && OPT_LANGS_MAP.has(lang)) {
        deLang = lang;
      } else if (lang?.startsWith("zh")) {
        deLang = "zh-CN";
      }
    } catch (err) {
      kissLog("detect lang local", err);
    }
  }

  return deLang;
};
