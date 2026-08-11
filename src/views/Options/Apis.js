import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import CodeField from "./CodeField";
import Button from "@mui/material/Button";
import LoadingButton from "@mui/lab/LoadingButton";
import MenuItem from "@mui/material/MenuItem";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Checkbox from "@mui/material/Checkbox";
import { useI18n } from "../../hooks/I18n";
import Typography from "@mui/material/Typography";
import StarIcon from "@mui/icons-material/Star";
import AddIcon from "@mui/icons-material/Add";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import PushPinIcon from "@mui/icons-material/PushPin";
import DeleteIcon from "@mui/icons-material/Delete";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import Alert from "@mui/material/Alert";
import Menu from "@mui/material/Menu";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import Tooltip from "@mui/material/Tooltip";
import Grid from "@mui/material/Grid";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import ApiIcon from "@mui/icons-material/Api";
import Link from "@mui/material/Link";
import { useOutletContext } from "react-router-dom";
import { useSetting } from "../../hooks/Setting";
import { useAlert } from "../../hooks/Alert";
import { useApiList, useApiItem } from "../../hooks/Api";
import { useConfirm } from "../../hooks/Confirm";
import { useRules } from "../../hooks/Rules";
import { resolveApiPromptSettings } from "../../config/prompt";
import { apiTranslate } from "../../apis";
import { fetchModelList } from "../../libs/modelList";
import Box from "@mui/material/Box";
import ReusableAutocomplete from "./ReusableAutocomplete";
import ShowMoreButton from "./ShowMoreButton";
import {
  OPT_TRANS_DEEPLX,
  // OPT_TRANS_OLLAMA,
  OPT_TRANS_CUSTOMIZE,
  OPT_TRANS_EPHONEAI,
  OPT_TRANS_BUILTINAI,
  OPT_TRANS_GOOGLE,
  OPT_TRANS_GOOGLE_2,
  OPT_TRANS_MICROSOFT,
  OPT_TRANS_DEEPSEEK,
  OPT_TRANS_OPENCODEGO,
  OPT_TRANS_SILICONFLOW,
  OPT_TRANS_XIAOMIMIMO,
  OPT_TRANS_ALIYUNBAILIAN,
  OPT_TRANS_CEREBRAS,
  OPT_TRANS_ZAI,
  OPT_TRANS_DEEPL,
  OPT_TRANS_DEEPLFREE,
  OPT_TRANS_BAIDU,
  OPT_TRANS_TENCENT,
  OPT_TRANS_VOLCENGINE,
  OPT_TRANS_OPENAI,
  OPT_TRANS_GEMINI,
  OPT_TRANS_GEMINI_2,
  OPT_TRANS_CLAUDE,
  OPT_TRANS_CLOUDFLAREAI,
  OPT_TRANS_OLLAMA,
  OPT_TRANS_OPENROUTER,
  DEFAULT_FETCH_LIMIT,
  DEFAULT_FETCH_INTERVAL,
  DEFAULT_HTTP_TIMEOUT,
  DEFAULT_BATCH_INTERVAL,
  DEFAULT_BATCH_SIZE,
  DEFAULT_BATCH_LENGTH,
  DEFAULT_CONTEXT_SIZE,
  OPT_ALL_TRANS_TYPES,
  OPT_LANGS_LIST,
  API_SPE_TYPES,
  BUILTIN_STONES,
  BUILTIN_PLACEHOLDERS,
  BUILTIN_PLACETAGS,
  OPT_TRANS_AZUREAI,
  THINKING_PARAM_MAP,
  DEFAULT_NOBATCH_PROMPT_SLUG,
  DEFAULT_BATCH_PROMPT_SLUG,
  DEFAULT_SUBTITLE_PROMPT_SLUG,
  DEFAULT_DICTIONARY_PROMPT_SLUG,
  getBatchPromptOptions,
  getDictionaryPromptOptions,
  getNobatchPromptOptions,
  getPromptDisplayName,
  getSubtitlePromptOptions,
  GLOBAL_KEY,
} from "../../config";
import ValidationInput from "../../hooks/ValidationInput";
import { usePromptList } from "../../hooks/Prompt";

const API_ICON_SIZE = 22;
const API_LIST_CONTROL_SIZE = 24;
const API_LIST_CONTROL_GAP = 0.5;

const editorSectionSx = {
  p: { xs: 2, sm: 2.5 },
  border: 1,
  borderColor: "divider",
  borderRadius: 3,
  boxShadow: "none",
  backgroundImage: "none",
};

const apiListControlSx = {
  width: API_LIST_CONTROL_SIZE,
  height: API_LIST_CONTROL_SIZE,
  flex: `0 0 ${API_LIST_CONTROL_SIZE}px`,
};

const EPHONEAI_MODELS = [
  "gpt-5.4-mini",
  "gpt-5.4-nano",
  "gemini-3.1-flash-lite-preview",
  "grok-4.20-beta-0309-non-reasoning",
];

// Keep icon paths tied to apiType because apiName is user editable.
const API_ICON_FILES = {
  [OPT_TRANS_BUILTINAI]: "BuiltinAI.svg",
  [OPT_TRANS_GOOGLE]: "Google.svg",
  [OPT_TRANS_GOOGLE_2]: "Google.svg",
  [OPT_TRANS_MICROSOFT]: "Microsoft.svg",
  [OPT_TRANS_AZUREAI]: "AzureAI.svg",
  [OPT_TRANS_DEEPSEEK]: "DeepSeek.svg",
  [OPT_TRANS_OPENCODEGO]: "OpenCodeGo.svg",
  [OPT_TRANS_SILICONFLOW]: "SiliconFlow.svg",
  [OPT_TRANS_XIAOMIMIMO]: "XiaomiMimo.svg",
  [OPT_TRANS_ALIYUNBAILIAN]: "AliyunBailian.svg",
  [OPT_TRANS_CEREBRAS]: "Cerebras.svg",
  [OPT_TRANS_ZAI]: "Zai.svg",
  [OPT_TRANS_DEEPL]: "DeepL.svg",
  [OPT_TRANS_DEEPLFREE]: "DeepL.svg",
  [OPT_TRANS_DEEPLX]: "DeepL.svg",
  [OPT_TRANS_BAIDU]: "Baidu.svg",
  [OPT_TRANS_TENCENT]: "Tencent.svg",
  [OPT_TRANS_VOLCENGINE]: "Volcengine.svg",
  [OPT_TRANS_EPHONEAI]: "ePhoneAI.png",
  [OPT_TRANS_OPENAI]: "OpenAI.svg",
  [OPT_TRANS_GEMINI]: "Gemini.svg",
  [OPT_TRANS_GEMINI_2]: "Gemini.svg",
  [OPT_TRANS_CLAUDE]: "Claude.svg",
  [OPT_TRANS_CLOUDFLAREAI]: "CloudflareAI.svg",
  [OPT_TRANS_OLLAMA]: "Ollama.svg",
  [OPT_TRANS_OPENROUTER]: "OpenRouter.svg",
};

function getApiIconSrc(apiType) {
  const iconFile = API_ICON_FILES[apiType];

  if (!iconFile) {
    return "";
  }

  return `${process.env.PUBLIC_URL || "."}/api/${iconFile}`;
}

function ApiProviderIcon({ apiType, disabled = false, sx = {} }) {
  const iconSrc = getApiIconSrc(apiType);

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: API_ICON_SIZE,
        height: API_ICON_SIZE,
        flex: "0 0 auto",
        opacity: disabled ? 0.5 : 1,
        ...sx,
      }}
    >
      {iconSrc ? (
        <Box
          component="img"
          src={iconSrc}
          alt=""
          aria-hidden="true"
          sx={(theme) => ({
            width: API_ICON_SIZE,
            height: API_ICON_SIZE,
            objectFit: "contain",
            display: "block",
            filter:
              theme.palette.mode === "dark" &&
              API_SPE_TYPES.darkIcon.has(apiType)
                ? "invert(100%)"
                : "none",
          })}
        />
      ) : (
        <ApiIcon fontSize="small" color="action" />
      )}
    </Box>
  );
}

function TestButton({ api }) {
  const i18n = useI18n();
  const alert = useAlert();
  const { setting: { prompts, subtitleSetting, uiLang } = {} } = useSetting();
  const [loading, setLoading] = useState(false);
  const handleApiTest = async () => {
    try {
      setLoading(true);
      const text = "The quick brown fox jumps over the lazy dog.";

      const apiSetting = resolveApiPromptSettings(
        { ...api },
        prompts,
        subtitleSetting
      );

      // 测试译文目标语言跟随界面语言；界面语言为英文（与原文相同）时回退到简体中文
      const fromLang = "en";
      const UI_LANG_TO_TRANS = { zh: "zh-CN", zh_TW: "zh-TW" };
      let toLang = UI_LANG_TO_TRANS[uiLang] || uiLang;
      if (!OPT_LANGS_LIST.includes(toLang) || toLang === fromLang) {
        toLang = "zh-CN";
      }

      const { trText } = await apiTranslate({
        text,
        fromLang,
        toLang,
        apiSetting,
        useCache: false,
        usePool: false,
      });
      if (!trText) {
        throw new Error("empty result");
      }
      alert.success(
        <>
          <div>{i18n("test_success")}</div>
          <div>{text}</div>
          <div>{trText}</div>
        </>
      );
    } catch (err) {
      // alert.error(`${i18n("test_failed")}: ${err.message}`);
      let msg = err.message;
      try {
        msg = JSON.stringify(JSON.parse(err.message), null, 2);
      } catch (err) {
        // skip
      }
      alert.error(
        <>
          <div>{i18n("test_failed")}</div>
          {msg === err.message ? <div>{msg}</div> : <pre>{msg}</pre>}
        </>
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoadingButton
      size="small"
      variant="outlined"
      onClick={handleApiTest}
      loading={loading}
    >
      {i18n("click_test")}
    </LoadingButton>
  );
}

/**
 * 敏感文本输入框。
 * 失焦时仅展示圆点，避免 API 密钥在配置页面长期明文暴露；
 * 聚焦编辑时恢复真实值，确保保存、测试和多行密钥逻辑仍使用原始字段值。
 */
function SensitiveTextField({ value = "", onChange, inputProps, ...props }) {
  const [editing, setEditing] = useState(false);
  const displayValue = editing
    ? value
    : String(value)
        .split("\n")
        .map((line) => (line ? "•".repeat(Math.min(line.length, 24)) : ""))
        .join("\n");

  return (
    <TextField
      {...props}
      value={displayValue}
      onFocus={() => setEditing(true)}
      onBlur={() => setEditing(false)}
      onChange={editing ? onChange : undefined}
      inputProps={{
        ...inputProps,
        readOnly: !editing,
      }}
    />
  );
}

function ApiFields({
  apiSlug,
  deleteApi,
  copyApi,
  onCollapse,
  onDirtyChange,
  onCreated,
  isReferenced,
  onReferencedMutation,
}) {
  const { api, update, resetData } = useApiItem(apiSlug);
  const { prompts } = usePromptList();
  const i18n = useI18n();
  const [formData, setFormData] = useState(() => api || {});
  const [showMore, setShowMore] = useState(false);
  const [modelOptions, setModelOptions] = useState([]);
  const [modelListStatus, setModelListStatus] = useState("idle");
  const [modelListError, setModelListError] = useState("");
  const requestedModelListKeyRef = useRef("");
  const modelListRequestIdRef = useRef(0);
  const confirm = useConfirm();

  useLayoutEffect(() => {
    setFormData(api || {});
  }, [api]);

  useLayoutEffect(() => {
    modelListRequestIdRef.current += 1;
    setShowMore(false);
    setModelOptions([]);
    setModelListStatus("idle");
    setModelListError("");
    requestedModelListKeyRef.current = "";
  }, [apiSlug]);

  const activeFormData = useMemo(
    () => (formData?.apiSlug === apiSlug ? formData : api || {}),
    [api, apiSlug, formData]
  );

  const isModified = useMemo(() => {
    if (!api || activeFormData?.apiSlug !== apiSlug) {
      return false;
    }

    return JSON.stringify(api) !== JSON.stringify(activeFormData);
  }, [api, apiSlug, activeFormData]);

  useEffect(() => {
    onDirtyChange?.(isModified);
  }, [isModified, onDirtyChange]);

  useEffect(() => {
    if (!isModified) {
      return;
    }

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isModified]);

  const handleChange = (e) => {
    e?.preventDefault();
    let { name, value, type, checked } = e.target;

    if (type === "checkbox" || type === "switch") {
      value = checked;
    }

    setFormData((prevData) => {
      const baseData = prevData?.apiSlug === apiSlug ? prevData : api || {};
      const newData = {
        ...baseData,
        [name]: value,
      };

      if (name === "useStream" && value === false) {
        newData.streamRenderMode = "disabled";
      }

      if (name === "isDisabled") {
        newData.sortOrder = value ? 999 : 0;
      }

      return newData;
    });
  };

  const handlePromptChange = (e) => {
    e?.preventDefault();
    const { name, value } = e.target;
    const prompt = prompts.find((item) => item.slug === value);

    setFormData((prevData) => {
      const baseData = prevData?.apiSlug === apiSlug ? prevData : api || {};
      const newData = {
        ...baseData,
        [name]: value,
      };

      if (name === "batchPromptSlug" && prompt) {
        newData.systemPrompt = prompt.systemPrompt;
      }

      if (name === "nobatchPromptSlug" && prompt) {
        newData.nobatchPrompt = prompt.systemPrompt;
        newData.nobatchUserPrompt = prompt.userPrompt;
      }

      if (name === "subtitlePromptSlug" && prompt) {
        newData.subtitlePrompt = prompt.systemPrompt;
      }

      if (name === "dictPromptSlug" && prompt) {
        newData.dictPrompt = prompt.systemPrompt;
        newData.dictUserPrompt = prompt.userPrompt;
      }

      return newData;
    });
  };

  const handleSave = () => {
    if (isReferenced && !api?.isDisabled && activeFormData.isDisabled) {
      onReferencedMutation?.([apiSlug]);
      return;
    }

    update(activeFormData);
    if (activeFormData.isDisabled || activeFormData.sortOrder === -1) {
      onCollapse?.();
    }
  };

  const handleDiscard = () => {
    setFormData(api || {});
  };

  const handleReset = () => {
    setFormData(resetData || api || {});
  };

  const handleCopy = () => {
    const copiedApi = copyApi(activeFormData);
    if (copiedApi?.apiSlug) {
      onCreated?.(copiedApi.apiSlug);
    }
  };

  const handleDelete = async () => {
    if (isReferenced) {
      onReferencedMutation?.([apiSlug]);
      return;
    }

    const isConfirmed = await confirm({
      confirmText: i18n("delete"),
      cancelText: i18n("cancel"),
    });

    if (isConfirmed) {
      const wasDeleted = deleteApi(apiSlug);
      if (wasDeleted !== false) {
        onDirtyChange?.(false);
      }
    }
  };

  const {
    url = "",
    key = "",
    model = "",
    modelListUrl = "",
    apiType,
    // userPrompt = "",
    customHeader = "",
    customBody = "",
    // think = false,
    // thinkIgnore = "",
    fetchLimit = DEFAULT_FETCH_LIMIT,
    fetchInterval = DEFAULT_FETCH_INTERVAL,
    httpTimeout = DEFAULT_HTTP_TIMEOUT,
    reqHook = "",
    resHook = "",
    temperature = 0,
    maxTokens = 20480,
    apiName = "",
    isDisabled = false,
    useBatchFetch = false,
    useStream = false,
    streamRenderMode = "disabled",
    transAllnow = false,
    rootMargin = 500,
    batchInterval = DEFAULT_BATCH_INTERVAL,
    batchSize = DEFAULT_BATCH_SIZE,
    batchLength = DEFAULT_BATCH_LENGTH,
    useContext = false,
    contextSize = DEFAULT_CONTEXT_SIZE,
    tone = "neutral",
    placeholder = BUILTIN_PLACEHOLDERS[0],
    placetag = BUILTIN_PLACETAGS[0],
    placetagFormat = "compact",
    region = "",
    sortOrder = 0,
    aiTerms = "",
    thinkingMode = "auto",
    thinkingEffort = "_default",
    batchPromptSlug = "",
    nobatchPromptSlug = "",
    subtitlePromptSlug = "",
    dictPromptSlug = "",
  } = activeFormData;

  useLayoutEffect(() => {
    modelListRequestIdRef.current += 1;
    setModelOptions([]);
    setModelListStatus("idle");
    setModelListError("");
    requestedModelListKeyRef.current = "";
  }, [apiType, httpTimeout, key, modelListUrl]);

  useEffect(
    () => () => {
      modelListRequestIdRef.current += 1;
    },
    []
  );

  const thinkingParam = THINKING_PARAM_MAP[apiType];
  const selectedBatchPromptSlug = Object.prototype.hasOwnProperty.call(
    activeFormData,
    "batchPromptSlug"
  )
    ? batchPromptSlug
    : DEFAULT_BATCH_PROMPT_SLUG;
  const selectedNobatchPromptSlug = Object.prototype.hasOwnProperty.call(
    activeFormData,
    "nobatchPromptSlug"
  )
    ? nobatchPromptSlug
    : DEFAULT_NOBATCH_PROMPT_SLUG;
  const selectedSubtitlePromptSlug = Object.prototype.hasOwnProperty.call(
    activeFormData,
    "subtitlePromptSlug"
  )
    ? subtitlePromptSlug
    : DEFAULT_SUBTITLE_PROMPT_SLUG;
  const selectedDictPromptSlug = Object.prototype.hasOwnProperty.call(
    activeFormData,
    "dictPromptSlug"
  )
    ? dictPromptSlug
    : DEFAULT_DICTIONARY_PROMPT_SLUG;
  const nobatchPromptOptions = useMemo(
    () => getNobatchPromptOptions(prompts),
    [prompts]
  );
  const batchPromptOptions = useMemo(
    () => getBatchPromptOptions(prompts),
    [prompts]
  );
  const subtitlePromptOptions = useMemo(
    () => getSubtitlePromptOptions(prompts),
    [prompts]
  );
  const dictionaryPromptOptions = useMemo(
    () => getDictionaryPromptOptions(prompts),
    [prompts]
  );

  const keyHelper = useMemo(
    () => (API_SPE_TYPES.mulkeys.has(apiType) ? i18n("mulkeys_help") : ""),
    [apiType, i18n]
  );

  const allModelOptions = useMemo(() => {
    const baseOptions = apiType === OPT_TRANS_EPHONEAI ? EPHONEAI_MODELS : [];
    return Array.from(new Set([...baseOptions, ...modelOptions]));
  }, [apiType, modelOptions]);

  const modelListHelperText = useMemo(() => {
    if (modelListStatus === "loading") {
      return i18n("model_list_loading");
    }

    if (modelListStatus === "empty") {
      return i18n("model_list_empty");
    }

    if (modelListStatus === "error") {
      return `${i18n("model_list_fetch_failed")}: ${modelListError}`;
    }

    return "";
  }, [i18n, modelListError, modelListStatus]);

  const handleLoadModelList = useCallback(
    async ({ force = false } = {}) => {
      const requestKey = `${apiSlug}|${modelListUrl}|${key}`;
      if (
        !modelListUrl?.trim() ||
        (!force && requestedModelListKeyRef.current === requestKey)
      ) {
        return;
      }

      const requestId = modelListRequestIdRef.current + 1;
      modelListRequestIdRef.current = requestId;
      requestedModelListKeyRef.current = requestKey;
      setModelListStatus("loading");
      setModelListError("");

      try {
        const nextModelOptions = await fetchModelList({
          apiType,
          modelListUrl,
          key,
          httpTimeout,
        });
        if (requestId !== modelListRequestIdRef.current) {
          return;
        }
        setModelOptions(nextModelOptions);
        setModelListStatus(nextModelOptions.length > 0 ? "success" : "empty");
      } catch (err) {
        if (requestId !== modelListRequestIdRef.current) {
          return;
        }
        setModelListStatus("error");
        setModelListError(err?.message || String(err));
      }
    },
    [apiSlug, apiType, httpTimeout, key, modelListUrl]
  );

  const handleRefreshModelList = () => {
    requestedModelListKeyRef.current = "";
    void handleLoadModelList({ force: true });
  };

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        gap={1.5}
        sx={(theme) => ({
          position: "sticky",
          top: { xs: 56, sm: 64, lg: 0 },
          zIndex: 4,
          py: 1.5,
          backgroundColor: theme.palette.background.paper,
          borderBottom: `1px solid ${theme.palette.divider}`,
        })}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6" noWrap>
              {apiName || apiType}
            </Typography>
            <Chip
              size="small"
              color={isDisabled ? "default" : "success"}
              variant="outlined"
              label={i18n(isDisabled ? "disabled" : "enabled")}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary" noWrap>
            {API_SPE_TYPES.ai.has(apiType)
              ? model || i18n("model_not_selected", "No model selected")
              : i18n("model_not_required", "This service does not use a model")}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Button
            size="small"
            variant="contained"
            onClick={handleSave}
            disabled={!isModified}
          >
            {i18n("save")}
          </Button>
          <Button
            size="small"
            variant="text"
            onClick={handleDiscard}
            disabled={!isModified}
          >
            {i18n("discard_changes", "Discard changes")}
          </Button>
          <TestButton api={activeFormData} />
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={editorSectionSx}>
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            {i18n("connection_and_model", "Connection and model")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {i18n(
              "connection_and_model_description",
              "Configure the provider connection and the exact model used by this translation service."
            )}
          </Typography>
        </Stack>
        <Stack spacing={2}>
          <Box>
            <Grid container spacing={2} columns={12}>
              <Grid item xs={12} md={6}>
                <TextField
                  size="small"
                  fullWidth
                  label={i18n("translation_service_name", "Service name")}
                  name="apiName"
                  value={apiName}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>
          </Box>

          {!API_SPE_TYPES.machine.has(apiType) &&
            apiType !== OPT_TRANS_BUILTINAI && (
              <>
                <TextField
                  size="small"
                  label={"URL"}
                  name="url"
                  value={url}
                  onChange={handleChange}
                  multiline={apiType === OPT_TRANS_DEEPLX}
                  maxRows={10}
                  helperText={
                    apiType === OPT_TRANS_DEEPLX ? i18n("mulkeys_help") : ""
                  }
                />
                <SensitiveTextField
                  size="small"
                  label={"Key"}
                  name="key"
                  value={key}
                  onChange={handleChange}
                  multiline={API_SPE_TYPES.mulkeys.has(apiType)}
                  maxRows={10}
                  helperText={keyHelper}
                />
              </>
            )}

          {apiType === OPT_TRANS_AZUREAI && (
            <TextField
              size="small"
              label={"Region"}
              name="region"
              value={region}
              onChange={handleChange}
            />
          )}

          {API_SPE_TYPES.ai.has(apiType) && (
            <>
              <TextField
                size="small"
                fullWidth
                label={i18n("model_list_url")}
                name="modelListUrl"
                value={modelListUrl}
                onChange={handleChange}
              />
              <Box>
                <Grid container spacing={2} columns={12}>
                  <Grid item xs={12} md={8}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <ReusableAutocomplete
                          freeSolo
                          commitOnInputChange
                          size="small"
                          fullWidth
                          options={allModelOptions}
                          name="model"
                          label={i18n("model", "Model")}
                          value={model}
                          onChange={handleChange}
                          onFocus={() => void handleLoadModelList()}
                          loading={modelListStatus === "loading"}
                          loadingText={i18n("model_list_loading")}
                          noOptionsText={i18n("model_list_empty")}
                          textFieldProps={{
                            helperText: modelListHelperText,
                            error: modelListStatus === "error",
                          }}
                        />
                      </Box>
                      <LoadingButton
                        size="small"
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        loading={modelListStatus === "loading"}
                        disabled={!modelListUrl?.trim()}
                        onClick={handleRefreshModelList}
                        sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}
                      >
                        {i18n("refresh_models", "Refresh models")}
                      </LoadingButton>
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <ReusableAutocomplete
                      freeSolo
                      commitOnInputChange
                      size="small"
                      fullWidth
                      options={BUILTIN_STONES}
                      name="tone"
                      label={i18n("translation_style")}
                      value={tone}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <ValidationInput
                      size="small"
                      fullWidth
                      label={"Temperature (0.0-2.0)"}
                      type="number"
                      name="temperature"
                      value={temperature}
                      onChange={handleChange}
                      min={0.0}
                      max={2.0}
                      isFloat={true}
                      inputProps={{
                        step: 0.1,
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <ValidationInput
                      size="small"
                      fullWidth
                      label={"Max Tokens (0-1000000)"}
                      type="number"
                      name="maxTokens"
                      value={maxTokens}
                      onChange={handleChange}
                      min={0}
                      max={1000000}
                    />
                  </Grid>
                </Grid>
              </Box>
            </>
          )}
        </Stack>
      </Paper>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        gap={1}
      >
        <Stack spacing={0.5}>
          <Typography variant="subtitle1" fontWeight={700}>
            {i18n("translation_behavior", "Translation behavior")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {i18n(
              "translation_behavior_description",
              "Tune batching, streaming, prompts, and request performance for this service."
            )}
          </Typography>
        </Stack>
        <ShowMoreButton showMore={showMore} onChange={setShowMore} />
      </Stack>

      <Box>
        <Grid container spacing={2} columns={12}>
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              size="small"
              name="transAllnow"
              value={transAllnow}
              label={i18n("trigger_mode")}
              onChange={handleChange}
            >
              <MenuItem value={false}>{i18n("mk_pagescroll")}</MenuItem>
              <MenuItem value={true}>{i18n("mk_pageopen")}</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <ValidationInput
              fullWidth
              size="small"
              label={i18n("pagescroll_root_margin")}
              type="number"
              name="rootMargin"
              value={rootMargin}
              onChange={handleChange}
              min={0}
              max={10000}
            />
          </Grid>
        </Grid>
      </Box>

      {/* {apiType === OPT_TRANS_OLLAMA && (
        <>
          <TextField
            select
            size="small"
            name="think"
            value={think}
            label={i18n("if_think")}
            onChange={handleChange}
          >
            <MenuItem value={false}>{i18n("nothink")}</MenuItem>
            <MenuItem value={true}>{i18n("think")}</MenuItem>
          </TextField>
          <TextField
            size="small"
            label={i18n("think_ignore")}
            name="thinkIgnore"
            value={thinkIgnore}
            onChange={handleChange}
          />
        </>
      )} */}

      {apiType === OPT_TRANS_CUSTOMIZE && (
        <>
          <CodeField
            size="small"
            label={"Request Hook"}
            name="reqHook"
            value={reqHook}
            onChange={handleChange}
            maxRows={10}
            FormHelperTextProps={{
              component: "div",
            }}
            helperText={
              <Box component="pre" sx={{ overflowX: "auto" }}>
                {i18n("request_hook_helper")}
              </Box>
            }
          />
          <CodeField
            size="small"
            label={"Response Hook"}
            name="resHook"
            value={resHook}
            onChange={handleChange}
            maxRows={10}
            FormHelperTextProps={{
              component: "div",
            }}
            helperText={
              <Box component="pre" sx={{ overflowX: "auto" }}>
                {i18n("response_hook_helper")}
              </Box>
            }
          />
        </>
      )}

      {API_SPE_TYPES.batch.has(apiType) && (
        <Box>
          <Grid container spacing={2} columns={12}>
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <TextField
                select
                fullWidth
                size="small"
                name="useBatchFetch"
                value={useBatchFetch}
                label={i18n("use_batch_fetch")}
                onChange={handleChange}
              >
                <MenuItem value={false}>{i18n("disable")}</MenuItem>
                <MenuItem value={true}>{i18n("enable")}</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <ValidationInput
                size="small"
                fullWidth
                label={i18n("batch_interval")}
                type="number"
                name="batchInterval"
                value={batchInterval}
                onChange={handleChange}
                min={10}
                max={10000}
              />
            </Grid>
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <ValidationInput
                size="small"
                fullWidth
                label={i18n("batch_size")}
                type="number"
                name="batchSize"
                value={batchSize}
                onChange={handleChange}
                min={1}
                max={100}
              />
            </Grid>
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <ValidationInput
                size="small"
                fullWidth
                label={i18n("batch_length")}
                type="number"
                name="batchLength"
                value={batchLength}
                onChange={handleChange}
                min={1000}
                max={100000}
              />
            </Grid>
          </Grid>
        </Box>
      )}

      <Box>
        <Grid container spacing={2} columns={12}>
          {API_SPE_TYPES.stream.has(apiType) && (
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <TextField
                select
                fullWidth
                size="small"
                name="useStream"
                value={useStream}
                label={i18n("use_stream")}
                onChange={handleChange}
              >
                <MenuItem value={false}>{i18n("disable")}</MenuItem>
                <MenuItem value={true}>{i18n("enable")}</MenuItem>
              </TextField>
            </Grid>
          )}

          {API_SPE_TYPES.stream.has(apiType) && useStream && (
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <TextField
                select
                fullWidth
                size="small"
                name="streamRenderMode"
                value={streamRenderMode}
                label={i18n("stream_render_mode")}
                onChange={handleChange}
              >
                <MenuItem value="disabled">{i18n("disable")}</MenuItem>
                <MenuItem value="realtime">
                  {i18n("stream_render_realtime")}
                </MenuItem>
                <MenuItem value="segment">
                  {i18n("stream_render_segment")}
                </MenuItem>
              </TextField>
            </Grid>
          )}

          {API_SPE_TYPES.context.has(apiType) && (
            <>
              <Grid item xs={12} sm={12} md={6} lg={3}>
                {" "}
                <TextField
                  select
                  size="small"
                  fullWidth
                  name="useContext"
                  value={useContext}
                  label={i18n("use_context")}
                  onChange={handleChange}
                >
                  <MenuItem value={false}>{i18n("disable")}</MenuItem>
                  <MenuItem value={true}>{i18n("enable")}</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={12} md={6} lg={3}>
                {" "}
                <TextField
                  size="small"
                  fullWidth
                  label={i18n("context_size")}
                  type="number"
                  name="contextSize"
                  value={contextSize}
                  onChange={handleChange}
                  min={1}
                  max={20}
                />
              </Grid>
            </>
          )}
        </Grid>
      </Box>

      <Box>
        <Grid container spacing={2} columns={12}>
          <Grid item xs={12} sm={12} md={6} lg={3}>
            <ValidationInput
              size="small"
              fullWidth
              label={i18n("fetch_limit")}
              type="number"
              name="fetchLimit"
              value={fetchLimit}
              onChange={handleChange}
              min={1}
              max={100}
            />
          </Grid>
          <Grid item xs={12} sm={12} md={6} lg={3}>
            <ValidationInput
              size="small"
              fullWidth
              label={i18n("fetch_interval")}
              type="number"
              name="fetchInterval"
              value={fetchInterval}
              onChange={handleChange}
              min={0}
              max={5000}
            />
          </Grid>
          <Grid item xs={12} sm={12} md={6} lg={3}>
            <ValidationInput
              size="small"
              fullWidth
              label={i18n("http_timeout")}
              type="number"
              name="httpTimeout"
              value={httpTimeout}
              onChange={handleChange}
              min={1}
              max={600}
            />
          </Grid>
          <Grid item xs={12} sm={12} md={6} lg={3}></Grid>
        </Grid>
      </Box>

      {API_SPE_TYPES.ai.has(apiType) && (
        <Box>
          <Grid container spacing={2} columns={12}>
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <TextField
                select
                fullWidth
                size="small"
                name="nobatchPromptSlug"
                value={selectedNobatchPromptSlug}
                label={i18n("nobatch_prompt", "非聚合翻译提示词")}
                onChange={handlePromptChange}
              >
                {nobatchPromptOptions.map((prompt) => (
                  <MenuItem key={prompt.slug} value={prompt.slug}>
                    {getPromptDisplayName(prompt, i18n)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={12} md={6} lg={3}>
              {/* AI 词典使用独立提示词，避免复用普通翻译提示词时输出格式不可控。 */}
              <TextField
                select
                fullWidth
                size="small"
                name="batchPromptSlug"
                value={selectedBatchPromptSlug}
                label={i18n("batch_prompt", "聚合翻译提示词")}
                onChange={handlePromptChange}
              >
                {batchPromptOptions.map((prompt) => (
                  <MenuItem key={prompt.slug} value={prompt.slug}>
                    {getPromptDisplayName(prompt, i18n)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <TextField
                select
                fullWidth
                size="small"
                name="subtitlePromptSlug"
                value={selectedSubtitlePromptSlug}
                label={i18n("subtitle_prompt", "AI断句提示词")}
                onChange={handlePromptChange}
              >
                {subtitlePromptOptions.map((prompt) => (
                  <MenuItem key={prompt.slug} value={prompt.slug}>
                    {getPromptDisplayName(prompt, i18n)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <TextField
                select
                fullWidth
                size="small"
                name="dictPromptSlug"
                value={selectedDictPromptSlug}
                label={i18n("ai_dict_prompt", "AI词典提示词")}
                onChange={handlePromptChange}
              >
                {dictionaryPromptOptions.map((prompt) => (
                  <MenuItem key={prompt.slug} value={prompt.slug}>
                    {getPromptDisplayName(prompt, i18n)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </Box>
      )}

      {thinkingParam && (
        <Box>
          <Grid container spacing={2} columns={12}>
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <TextField
                select
                fullWidth
                size="small"
                name="thinkingMode"
                value={thinkingMode}
                label={i18n("thinking_mode")}
                onChange={handleChange}
                helperText={i18n("thinking_mode_helper")}
              >
                <MenuItem value="auto">
                  {i18n("thinking_mode_default")}
                </MenuItem>
                <MenuItem value="enabled">
                  {i18n("thinking_mode_enabled")}
                </MenuItem>
                {thinkingParam.disableSupported !== false && (
                  <MenuItem value="disabled">
                    {i18n("thinking_mode_disabled")}
                  </MenuItem>
                )}
              </TextField>
            </Grid>
            {thinkingMode === "enabled" && thinkingParam.efforts && (
              <Grid item xs={12} sm={12} md={6} lg={3}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  name="thinkingEffort"
                  value={thinkingEffort}
                  label={i18n("thinking_effort")}
                  onChange={handleChange}
                >
                  {thinkingParam.efforts.map((e) => (
                    <MenuItem key={e.value} value={e.value}>
                      {e.label}
                    </MenuItem>
                  ))}
                  <MenuItem value="_default">
                    {i18n("thinking_effort_default")}
                  </MenuItem>
                </TextField>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {showMore && (
        <>
          <Box>
            <Grid container spacing={2} columns={12}>
              <Grid item xs={12} sm={12} md={6} lg={3}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  name="placeholder"
                  value={placeholder}
                  label={i18n("api_placeholder")}
                  onChange={handleChange}
                >
                  {BUILTIN_PLACEHOLDERS.map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={12} md={6} lg={3}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  name="placetag"
                  value={placetag}
                  label={i18n("api_placetag")}
                  onChange={handleChange}
                >
                  {BUILTIN_PLACETAGS.map((item) => (
                    <MenuItem key={item} value={item}>
                      {`<${item}>`}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={12} md={6} lg={3}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  name="placetagFormat"
                  value={placetagFormat}
                  label={i18n("placetag_format") || "占位符格式"}
                  onChange={handleChange}
                >
                  <MenuItem value="compact">
                    {i18n("format_compact") || "简洁格式 <a1>"}
                  </MenuItem>
                  <MenuItem value="attribute">
                    {i18n("format_attribute") || "属性格式 <a i=1>"}
                  </MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Box>

          {API_SPE_TYPES.ai.has(apiType) && (
            <TextField
              size="small"
              label={i18n("ai_terms")}
              helperText={i18n("ai_terms_helper")}
              name="aiTerms"
              value={aiTerms}
              onChange={handleChange}
              multiline
              maxRows={10}
            />
          )}

          {apiType !== OPT_TRANS_BUILTINAI && (
            <>
              {" "}
              <CodeField
                size="small"
                label={i18n("custom_header")}
                name="customHeader"
                value={customHeader}
                onChange={handleChange}
                maxRows={10}
                helperText={i18n("custom_header_help")}
              />
              <CodeField
                size="small"
                label={i18n("custom_body")}
                name="customBody"
                value={customBody}
                onChange={handleChange}
                maxRows={10}
                helperText={i18n("custom_body_help")}
              />
            </>
          )}

          {apiType !== OPT_TRANS_CUSTOMIZE &&
            apiType !== OPT_TRANS_BUILTINAI && (
              <>
                <CodeField
                  size="small"
                  label={"Request Hook"}
                  name="reqHook"
                  value={reqHook}
                  onChange={handleChange}
                  maxRows={10}
                  FormHelperTextProps={{
                    component: "div",
                  }}
                  helperText={
                    <Box component="pre" sx={{ overflowX: "auto" }}>
                      {i18n("request_hook_helper")}
                    </Box>
                  }
                />
                <CodeField
                  size="small"
                  label={"Response Hook"}
                  name="resHook"
                  value={resHook}
                  onChange={handleChange}
                  maxRows={10}
                  FormHelperTextProps={{
                    component: "div",
                  }}
                  helperText={
                    <Box component="pre" sx={{ overflowX: "auto" }}>
                      {i18n("response_hook_helper")}
                    </Box>
                  }
                />
              </>
            )}
        </>
      )}

      <Paper
        variant="outlined"
        component={Stack}
        direction="row"
        alignItems="center"
        spacing={2}
        useFlexGap
        flexWrap="wrap"
        sx={{ ...editorSectionSx, p: 2 }}
      >
        <Button size="small" variant="outlined" onClick={handleReset}>
          {i18n("restore_default")}
        </Button>
        <Button size="small" variant="outlined" onClick={handleCopy}>
          {API_SPE_TYPES.ai.has(apiType)
            ? i18n("duplicate_model_profile", "Duplicate for another model")
            : i18n("copy_api")}
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="error"
          onClick={handleDelete}
        >
          {i18n("delete")}
        </Button>

        <FormControlLabel
          control={
            <Switch
              size="small"
              name="isDisabled"
              checked={isDisabled}
              onChange={handleChange}
            />
          }
          label={i18n("is_disabled")}
        />

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={sortOrder === -1}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...(prev?.apiSlug === apiSlug ? prev : api || {}),
                  sortOrder: e.target.checked ? -1 : 0,
                }));
              }}
              disabled={isDisabled}
            />
          }
          label={i18n("is_pinned")}
        />
      </Paper>

      {/* {apiType === OPT_TRANS_CUSTOMIZE && <pre>{i18n("custom_api_help")}</pre>} */}
    </Stack>
  );
}

function ApiListItem({
  api,
  selected,
  bulkMode,
  checked,
  dragging,
  dragOver,
  reorderEnabled,
  onSelect,
  onCheck,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) {
  const i18n = useI18n();
  const handleContentClick = (event) => {
    if (bulkMode) {
      onCheck(event, api.apiSlug);
      return;
    }

    onSelect();
  };

  return (
    <ListItem
      disablePadding
      onDragOver={reorderEnabled ? onDragOver : undefined}
      onDragEnter={reorderEnabled ? onDragOver : undefined}
      onDrop={reorderEnabled ? onDrop : undefined}
      sx={(theme) => ({
        display: "grid",
        gridTemplateColumns: bulkMode
          ? `${API_LIST_CONTROL_SIZE}px minmax(0, 1fr)`
          : "minmax(0, 1fr)",
        columnGap: API_LIST_CONTROL_GAP,
        alignItems: "center",
        minHeight: 44,
        px: 1,
        opacity: dragging ? 0.45 : 1,
        borderTop: dragOver
          ? `2px solid ${theme.palette.primary.main}`
          : "2px solid transparent",
      })}
    >
      {bulkMode && (
        <Checkbox
          size="small"
          checked={checked}
          onClick={(e) => e.stopPropagation()}
          onChange={(event) => onCheck(event, api.apiSlug)}
          inputProps={{
            "aria-label": api.apiName || api.apiType,
          }}
          sx={{
            ...apiListControlSx,
            p: 0,
            alignSelf: "center",
          }}
        />
      )}
      <ListItemButton
        data-api-slug={api.apiSlug}
        selected={bulkMode ? checked : selected}
        onClick={handleContentClick}
        sx={{
          gap: 1,
          minWidth: 0,
          minHeight: 56,
          py: 0.75,
          px: 1,
          borderRadius: 2,
        }}
      >
        <Tooltip
          title={i18n(
            reorderEnabled
              ? "drag_to_reorder"
              : "save_or_discard_before_reorder",
            reorderEnabled
              ? "Drag to reorder"
              : "Save or discard changes before reordering"
          )}
        >
          <Box
            draggable={reorderEnabled}
            onDragStart={reorderEnabled ? onDragStart : undefined}
            onDragEnd={reorderEnabled ? onDragEnd : undefined}
            onClick={(e) => e.stopPropagation()}
            aria-disabled={!reorderEnabled}
            sx={{
              ...apiListControlSx,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "text.secondary",
              cursor: reorderEnabled ? "grab" : "not-allowed",
              opacity: reorderEnabled ? 1 : 0.45,
              "&:active": {
                cursor: "grabbing",
              },
            }}
          >
            <DragIndicatorIcon fontSize="small" />
          </Box>
        </Tooltip>
        <ApiProviderIcon apiType={api.apiType} disabled={api.isDisabled} />
        <Box
          sx={{
            minWidth: 0,
            flex: 1,
            opacity: api.isDisabled ? 0.5 : 1,
          }}
        >
          <Typography variant="body2" fontWeight={650} noWrap>
            {api.apiName || api.apiType}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {API_SPE_TYPES.ai.has(api.apiType)
              ? api.model || i18n("model_not_selected", "No model selected")
              : api.apiType}
          </Typography>
        </Box>
        <Box
          aria-label={i18n(api.isDisabled ? "disabled" : "enabled")}
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            flex: "0 0 auto",
            backgroundColor: api.isDisabled ? "text.disabled" : "success.main",
          }}
        />
      </ListItemButton>
    </ListItem>
  );
}

export default function Apis() {
  const i18n = useI18n();
  const outletContext = useOutletContext();
  const { setting = {} } = useSetting();
  const {
    transApis,
    addApi,
    deleteApi,
    deleteApis,
    pinApis,
    disableApis,
    enableApis,
    copyApi,
    alphaSortApis,
    reorderApis,
  } = useApiList();
  const rules = useRules();
  const confirm = useConfirm();
  const alerts = useAlert();

  const [alphaSortDir, setAlphaSortDir] = useState("asc");
  const [detailKey, setDetailKey] = useState(0);
  const [selectedApiSlug, setSelectedApiSlug] = useState(() => {
    const query = window.location.hash.split("?")[1] || "";
    return new URLSearchParams(query).get("service") || "";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [checkedApiSlugs, setCheckedApiSlugs] = useState([]);
  const [draggingApiSlug, setDraggingApiSlug] = useState("");
  const [dragOverApiSlug, setDragOverApiSlug] = useState("");
  const detailPanelRef = useRef(null);

  const apiTypes = useMemo(
    () =>
      OPT_ALL_TRANS_TYPES.map((type) => ({
        type,
        label: type,
      })),
    []
  );

  const globalRule = useMemo(
    () => rules.list?.find((rule) => rule.pattern === GLOBAL_KEY),
    [rules.list]
  );
  const defaultApiSlug = globalRule?.apiSlug || "";
  const enabledApis = useMemo(
    () => transApis.filter((api) => !api.isDisabled),
    [transApis]
  );
  const defaultApi = useMemo(
    () => transApis.find((api) => api.apiSlug === defaultApiSlug),
    [defaultApiSlug, transApis]
  );
  const defaultApiOptions = useMemo(
    () =>
      defaultApi?.isDisabled
        ? [
            defaultApi,
            ...enabledApis.filter((api) => api.apiSlug !== defaultApi.apiSlug),
          ]
        : enabledApis,
    [defaultApi, enabledApis]
  );
  const referencedRulesByApi = useMemo(() => {
    const references = new Map();
    const addReference = (apiSlug, label) => {
      if (!apiSlug || apiSlug === GLOBAL_KEY || apiSlug === "-") {
        return;
      }

      const labels = references.get(apiSlug) || [];
      labels.push(label);
      references.set(apiSlug, labels);
    };

    (rules.list || []).forEach((rule) => {
      addReference(
        rule.apiSlug,
        rule.pattern === GLOBAL_KEY
          ? i18n("website_defaults", "Website defaults")
          : rule.pattern
      );
    });

    addReference(
      setting.inputRule?.apiSlug,
      i18n("input_translate", "Input translation")
    );
    const tranboxApiSlugs = Array.isArray(setting.tranboxSetting?.apiSlugs)
      ? setting.tranboxSetting.apiSlugs
      : [];
    tranboxApiSlugs.forEach((apiSlug) => {
      addReference(
        apiSlug,
        i18n("selection_translate", "Selection translation")
      );
    });
    addReference(
      setting.tranboxSetting?.aiDictApiSlug,
      i18n("selection_translate", "Selection translation")
    );
    [
      setting.subtitleSetting?.apiSlug,
      setting.subtitleSetting?.segSlug,
      setting.subtitleSetting?.aiContextSlug,
    ].forEach((apiSlug) => {
      addReference(apiSlug, i18n("subtitle_translate", "Video subtitles"));
    });

    return references;
  }, [i18n, rules.list, setting]);

  const allApiItems = useMemo(
    () => transApis.map((api) => ({ api })),
    [transApis]
  );

  const apiItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    return allApiItems.filter(({ api }) => {
      if (serviceFilter === "enabled" && api.isDisabled) {
        return false;
      }
      if (serviceFilter === "ai" && !API_SPE_TYPES.ai.has(api.apiType)) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }

      return [api.apiName, api.apiType, api.model, api.url]
        .filter(Boolean)
        .some((value) =>
          String(value).toLocaleLowerCase().includes(normalizedQuery)
        );
    });
  }, [allApiItems, searchQuery, serviceFilter]);

  const apiSlugList = useMemo(
    () => apiItems.map(({ api }) => api.apiSlug),
    [apiItems]
  );

  const checkedApiSlugSet = useMemo(
    () => new Set(checkedApiSlugs),
    [checkedApiSlugs]
  );

  const checkedApiCount = checkedApiSlugs.length;
  const hasCheckedApis = checkedApiCount > 0;
  const allApisChecked =
    apiItems.length > 0 &&
    apiSlugList.every((apiSlug) => checkedApiSlugSet.has(apiSlug));

  useEffect(() => {
    if (allApiItems.length === 0) {
      setSelectedApiSlug("");
      return;
    }

    const selectedApiExists = allApiItems.some(
      ({ api }) => api.apiSlug === selectedApiSlug
    );

    if (!selectedApiExists) {
      const defaultApiExists = allApiItems.some(
        ({ api }) => api.apiSlug === defaultApiSlug
      );
      setSelectedApiSlug(
        defaultApiExists ? defaultApiSlug : allApiItems[0].api.apiSlug
      );
    }
  }, [allApiItems, defaultApiSlug, selectedApiSlug]);

  useEffect(() => {
    setCheckedApiSlugs((prev) => {
      if (prev.length === 0) {
        return prev;
      }

      const apiSlugSet = new Set(apiSlugList);
      const next = prev.filter((apiSlug) => apiSlugSet.has(apiSlug));

      return next.length === prev.length ? prev : next;
    });
  }, [apiSlugList]);

  const selectedApiItem = useMemo(
    () => allApiItems.find(({ api }) => api.apiSlug === selectedApiSlug),
    [allApiItems, selectedApiSlug]
  );

  useLayoutEffect(() => {
    detailPanelRef.current?.scrollTo({ top: 0 });
  }, [selectedApiSlug]);

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const confirmDiscardChanges = useCallback(async () => {
    if (!hasUnsavedChanges) {
      return true;
    }

    return confirm({
      message: i18n(
        "unsaved_service_changes",
        "This service has unsaved changes. Discard them and continue?"
      ),
      confirmText: i18n("discard_changes", "Discard changes"),
      cancelText: i18n("keep_editing", "Keep editing"),
    });
  }, [confirm, hasUnsavedChanges, i18n]);

  const warnIfServicesReferenced = useCallback(
    (apiSlugs) => {
      const labels = Array.from(
        new Set(
          apiSlugs.flatMap((apiSlug) => referencedRulesByApi.get(apiSlug) || [])
        )
      );
      if (labels.length === 0) {
        return false;
      }

      const visibleLabels = labels.slice(0, 5).join(", ");
      alerts?.warning(
        i18n(
          "service_referenced_block",
          "This service is still used by: {rules}. Change those references first."
        ).replace(
          "{rules}",
          labels.length > 5 ? `${visibleLabels}, …` : visibleLabels
        )
      );
      return true;
    },
    [alerts, i18n, referencedRulesByApi]
  );

  const handleDeleteApi = useCallback(
    (apiSlug) => {
      if (warnIfServicesReferenced([apiSlug])) {
        return false;
      }

      deleteApi(apiSlug);
      return true;
    },
    [deleteApi, warnIfServicesReferenced]
  );

  useEffect(() => {
    const registerNavigationGuard = outletContext?.registerNavigationGuard;
    if (!registerNavigationGuard) {
      return undefined;
    }

    registerNavigationGuard(hasUnsavedChanges ? confirmDiscardChanges : null);
    return () => registerNavigationGuard(null);
  }, [confirmDiscardChanges, hasUnsavedChanges, outletContext]);

  const handleSelectApi = useCallback(
    async (apiSlug) => {
      if (apiSlug === selectedApiSlug) {
        return;
      }
      if (!(await confirmDiscardChanges())) {
        return;
      }

      setHasUnsavedChanges(false);
      setSelectedApiSlug(apiSlug);
    },
    [confirmDiscardChanges, selectedApiSlug]
  );

  const handleApiCreated = useCallback((apiSlug) => {
    setHasUnsavedChanges(false);
    setSelectedApiSlug(apiSlug);
    setServiceFilter("all");
    setSearchQuery("");
  }, []);

  const handleMenuItemClick = async (apiType) => {
    if (!(await confirmDiscardChanges())) {
      return;
    }

    const newApi = addApi(apiType);
    if (newApi?.apiSlug) {
      handleApiCreated(newApi.apiSlug);
    }
    handleClose();
  };

  const handleDefaultApiChange = async (event) => {
    const apiSlug = event.target.value;
    if (!(await confirmDiscardChanges())) {
      return;
    }

    rules.put(GLOBAL_KEY, { apiSlug });
    setHasUnsavedChanges(false);
    setSelectedApiSlug(apiSlug);
  };

  const handleCheckApi = useCallback((event, apiSlug) => {
    event.stopPropagation();
    setCheckedApiSlugs((prev) =>
      prev.includes(apiSlug)
        ? prev.filter((item) => item !== apiSlug)
        : [...prev, apiSlug]
    );
  }, []);

  const handleToggleAllApis = useCallback(() => {
    setCheckedApiSlugs((prev) => {
      const previous = new Set(prev);
      const everyVisibleChecked =
        apiSlugList.length > 0 &&
        apiSlugList.every((apiSlug) => previous.has(apiSlug));

      if (everyVisibleChecked) {
        return prev.filter((apiSlug) => !apiSlugList.includes(apiSlug));
      }

      return Array.from(new Set([...prev, ...apiSlugList]));
    });
  }, [apiSlugList]);

  const handleToggleBulkMode = useCallback(() => {
    setBulkMode((prev) => {
      if (prev) {
        setCheckedApiSlugs([]);
      }

      return !prev;
    });
  }, []);

  const handlePinCheckedApis = useCallback(() => {
    pinApis(checkedApiSlugs);
    setDetailKey((key) => key + 1);
  }, [checkedApiSlugs, pinApis]);

  const handleEnableCheckedApis = useCallback(() => {
    enableApis(checkedApiSlugs);
    setDetailKey((key) => key + 1);
  }, [checkedApiSlugs, enableApis]);

  const handleDisableCheckedApis = useCallback(() => {
    if (warnIfServicesReferenced(checkedApiSlugs)) {
      return;
    }

    disableApis(checkedApiSlugs);
    setDetailKey((key) => key + 1);
  }, [checkedApiSlugs, disableApis, warnIfServicesReferenced]);

  const handleDeleteCheckedApis = useCallback(async () => {
    if (warnIfServicesReferenced(checkedApiSlugs)) {
      return;
    }

    const isConfirmed = await confirm({
      message: i18n(
        "delete_selected_apis_confirm",
        "Delete {count} selected interfaces?"
      ).replace("{count}", checkedApiCount),
      confirmText: i18n("delete"),
      cancelText: i18n("cancel"),
    });

    if (isConfirmed) {
      deleteApis(checkedApiSlugs);
      setCheckedApiSlugs([]);
      setDetailKey((key) => key + 1);
    }
  }, [
    checkedApiCount,
    checkedApiSlugs,
    confirm,
    deleteApis,
    i18n,
    warnIfServicesReferenced,
  ]);

  const handleDragStart = useCallback((event, apiSlug) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", apiSlug);
    setDraggingApiSlug(apiSlug);
  }, []);

  const handleDragOver = useCallback(
    (event, apiSlug) => {
      if (!draggingApiSlug || draggingApiSlug === apiSlug) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDragOverApiSlug(apiSlug);
    },
    [draggingApiSlug]
  );

  const handleDrop = useCallback(
    (event, apiSlug) => {
      event.preventDefault();
      const activeSlug =
        draggingApiSlug || event.dataTransfer.getData("text/plain");

      if (activeSlug && activeSlug !== apiSlug) {
        reorderApis(activeSlug, apiSlug);
      }

      setDraggingApiSlug("");
      setDragOverApiSlug("");
    },
    [draggingApiSlug, reorderApis]
  );

  const handleDragEnd = useCallback(() => {
    setDraggingApiSlug("");
    setDragOverApiSlug("");
  }, []);

  return (
    <Box>
      <Stack spacing={3}>
        <Paper variant="outlined" sx={editorSectionSx}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            alignItems={{ xs: "stretch", md: "center" }}
            justifyContent="space-between"
            gap={2}
          >
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                {i18n("default_translation_service", "Default page service")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {i18n(
                  "default_translation_service_helper",
                  "Used for page translation unless a website rule explicitly chooses another service."
                )}
              </Typography>
            </Box>
            <TextField
              select
              size="small"
              name="defaultApiSlug"
              label={i18n(
                "default_translation_service",
                "Default page service"
              )}
              value={defaultApi ? defaultApiSlug : ""}
              onChange={(event) => void handleDefaultApiChange(event)}
              helperText={
                defaultApiSlug && !defaultApi
                  ? i18n(
                      "default_service_missing",
                      "The referenced service is missing. Choose a new default."
                    )
                  : defaultApi && API_SPE_TYPES.ai.has(defaultApi.apiType)
                    ? `${i18n("model", "Model")}: ${
                        defaultApi.model ||
                        i18n("model_not_selected", "No model selected")
                      }`
                    : " "
              }
              sx={{ width: { xs: "100%", md: 360 }, flex: "0 0 auto" }}
            >
              <MenuItem value="" disabled>
                {i18n("select_service", "Select a service")}
              </MenuItem>
              {defaultApiOptions.map((api) => (
                <MenuItem
                  key={api.apiSlug}
                  value={api.apiSlug}
                  disabled={api.isDisabled}
                >
                  {api.apiName || api.apiType}
                  {API_SPE_TYPES.ai.has(api.apiType) && api.model
                    ? ` · ${api.model}`
                    : ""}
                  {api.isDisabled ? ` (${i18n("disabled")})` : ""}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Paper>

        <Alert severity="info" variant="outlined">
          {i18n(
            "translation_profile_explanation",
            "Each AI service combines one provider connection with one model. Duplicate a service to use another model from the same provider."
          )}{" "}
          <Link
            href="https://github.com/fishjar/kiss-translator/blob/master/custom-api_v2.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            {i18n("goto_custom_api_example")}
          </Link>
        </Alert>

        <Paper variant="outlined" sx={{ ...editorSectionSx, p: 2 }}>
          <Stack spacing={1.5}>
            <Stack
              direction={{ xs: "column", lg: "row" }}
              alignItems={{ xs: "stretch", lg: "center" }}
              spacing={1.5}
            >
              <TextField
                size="small"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={i18n(
                  "search_translation_services",
                  "Search services, providers, or models"
                )}
                inputProps={{
                  "aria-label": i18n(
                    "search_translation_services",
                    "Search services, providers, or models"
                  ),
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ flex: 1, minWidth: { lg: 280 } }}
              />
              <ToggleButtonGroup
                size="small"
                exclusive
                value={serviceFilter}
                onChange={(_event, value) => value && setServiceFilter(value)}
                aria-label={i18n("filter_services", "Filter services")}
                sx={{ alignSelf: { xs: "stretch", lg: "center" } }}
              >
                <ToggleButton value="all" sx={{ flex: { xs: 1, lg: "none" } }}>
                  {i18n("all", "All")}
                </ToggleButton>
                <ToggleButton
                  value="enabled"
                  sx={{ flex: { xs: 1, lg: "none" } }}
                >
                  {i18n("enabled", "Enabled")}
                </ToggleButton>
                <ToggleButton value="ai" sx={{ flex: { xs: 1, lg: "none" } }}>
                  {i18n("ai_services", "AI models")}
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            <Divider />
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              useFlexGap
              flexWrap="wrap"
            >
              <Button
                size="small"
                id="add-api-button"
                variant="contained"
                onClick={handleClick}
                aria-controls={open ? "add-api-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={open ? "true" : undefined}
                endIcon={<KeyboardArrowDownIcon />}
                startIcon={<AddIcon />}
              >
                {i18n("add")}
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={hasUnsavedChanges}
                onClick={() => {
                  const newDir = alphaSortDir === "asc" ? "desc" : "asc";
                  setAlphaSortDir(newDir);
                  setDetailKey((k) => k + 1);
                  alphaSortApis(newDir);
                }}
                startIcon={<SwapVertIcon />}
              >
                {i18n("sort_alphabetically")}
              </Button>
              <Button
                size="small"
                variant={bulkMode ? "contained" : "outlined"}
                onClick={handleToggleBulkMode}
              >
                {i18n("bulk_actions")}
              </Button>
              {bulkMode && (
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={apiItems.length === 0}
                    onClick={handleToggleAllApis}
                  >
                    {allApisChecked ? i18n("deselect_all") : i18n("select_all")}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!hasCheckedApis || hasUnsavedChanges}
                    onClick={handlePinCheckedApis}
                    startIcon={<PushPinIcon />}
                  >
                    {i18n("pin_to_top")}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!hasCheckedApis || hasUnsavedChanges}
                    onClick={handleEnableCheckedApis}
                    startIcon={<CheckCircleOutlineIcon />}
                  >
                    {i18n("enable")}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!hasCheckedApis || hasUnsavedChanges}
                    onClick={handleDisableCheckedApis}
                    startIcon={<BlockIcon />}
                  >
                    {i18n("disable")}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    disabled={!hasCheckedApis || hasUnsavedChanges}
                    onClick={handleDeleteCheckedApis}
                    startIcon={<DeleteIcon />}
                  >
                    {i18n("delete")}
                  </Button>
                </Stack>
              )}
            </Stack>
          </Stack>
          <Menu
            id="add-api-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            MenuListProps={{
              "aria-labelledby": "add-api-button",
            }}
          >
            {apiTypes.map((apiOption) => (
              <MenuItem
                key={apiOption.type}
                onClick={() => handleMenuItemClick(apiOption.type)}
                sx={{ gap: 1 }}
              >
                <ApiProviderIcon apiType={apiOption.type} />
                <Box component="span" sx={{ flex: 1 }}>
                  {apiOption.label}
                </Box>
                {API_SPE_TYPES.sponsors.has(apiOption.type) && (
                  <StarIcon color="warning" sx={{ marginLeft: "0.2em" }} />
                )}
              </MenuItem>
            ))}
          </Menu>
        </Paper>

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", lg: "row" },
            border: 1,
            borderColor: "divider",
            borderRadius: 3,
            overflow: { xs: "visible", lg: "hidden" },
            minHeight: { lg: 560 },
            height: { lg: "calc(100vh - 360px)" },
            backgroundColor: "background.paper",
          }}
        >
          <Box
            sx={(theme) => ({
              width: { xs: "100%", lg: 320 },
              flex: { xs: "0 0 auto", lg: "0 0 320px" },
              height: { lg: "100%" },
              maxHeight: { xs: 320, lg: "none" },
              overflowY: "auto",
              borderRight: {
                xs: 0,
                lg: `1px solid ${theme.palette.divider}`,
              },
              borderBottom: {
                xs: `1px solid ${theme.palette.divider}`,
                lg: 0,
              },
              p: 1,
            })}
          >
            <List disablePadding>
              {apiItems.map(({ api }) => (
                <ApiListItem
                  key={api.apiSlug}
                  api={api}
                  selected={api.apiSlug === selectedApiSlug}
                  bulkMode={bulkMode}
                  checked={checkedApiSlugSet.has(api.apiSlug)}
                  dragging={api.apiSlug === draggingApiSlug}
                  dragOver={api.apiSlug === dragOverApiSlug}
                  reorderEnabled={!hasUnsavedChanges}
                  onSelect={() => void handleSelectApi(api.apiSlug)}
                  onCheck={handleCheckApi}
                  onDragStart={(event) => handleDragStart(event, api.apiSlug)}
                  onDragOver={(event) => handleDragOver(event, api.apiSlug)}
                  onDrop={(event) => handleDrop(event, api.apiSlug)}
                  onDragEnd={handleDragEnd}
                />
              ))}
              {apiItems.length === 0 && (
                <Box sx={{ px: 2, py: 5, textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    {i18n("no_services_found", "No matching services")}
                  </Typography>
                </Box>
              )}
            </List>
          </Box>
          <Box
            ref={detailPanelRef}
            sx={{
              flex: 1,
              minWidth: 0,
              p: 2,
              boxSizing: "border-box",
              height: { lg: "100%" },
              overflowY: { lg: "auto" },
              scrollbarGutter: { lg: "stable" },
              overscrollBehavior: "contain",
              "& .MuiGrid-grid-lg-3": {
                flexBasis: { lg: "50%" },
                maxWidth: { lg: "50%" },
              },
            }}
          >
            {selectedApiItem && (
              <ApiFields
                key={detailKey}
                apiSlug={selectedApiItem.api.apiSlug}
                deleteApi={handleDeleteApi}
                copyApi={copyApi}
                onDirtyChange={setHasUnsavedChanges}
                onCreated={handleApiCreated}
                isReferenced={referencedRulesByApi.has(
                  selectedApiItem.api.apiSlug
                )}
                onReferencedMutation={warnIfServicesReferenced}
              />
            )}
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}
