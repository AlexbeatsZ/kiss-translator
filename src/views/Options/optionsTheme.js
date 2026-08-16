const LIGHT_TOKENS = {
  canvas: "#F3F5F9",
  rail: "#E9EDF4",
  surface: "#FFFFFF",
  surfaceRaised: "#F7F9FC",
  ink: "#141824",
  muted: "#667085",
  source: "#9A642B",
  translation: "#536FD7",
  success: "#14845F",
  danger: "#D54862",
  rule: "#D6DBE6",
};

const DARK_TOKENS = {
  canvas: "#0B0D12",
  rail: "#0F131B",
  surface: "#151A24",
  surfaceRaised: "#1B2230",
  ink: "#F2F4F8",
  muted: "#98A2B3",
  source: "#D6A96F",
  translation: "#7C9CFF",
  success: "#5DD6A3",
  danger: "#FF7A90",
  rule: "#293142",
};

const BODY_FONT =
  '"Segoe UI Variable", Aptos, "Noto Sans SC", "Microsoft YaHei UI", sans-serif';
const UTILITY_FONT = '"JetBrains Mono", "Cascadia Mono", Consolas, monospace';

export const OPTIONS_THEME_OPTIONS = ({ mode }) => {
  const token = mode === "dark" ? DARK_TOKENS : LIGHT_TOKENS;

  return {
    translationTokens: token,
    shape: { borderRadius: 12 },
    palette: {
      primary: {
        main: token.translation,
        contrastText: mode === "dark" ? "#0B0D12" : "#FFFFFF",
      },
      secondary: { main: token.source },
      success: { main: token.success },
      error: { main: token.danger },
      background: {
        default: token.canvas,
        paper: token.surface,
      },
      text: {
        primary: token.ink,
        secondary: token.muted,
      },
      divider: token.rule,
    },
    typography: {
      fontFamily: BODY_FONT,
      h1: { fontWeight: 720, letterSpacing: "-0.035em" },
      h2: { fontWeight: 700, letterSpacing: "-0.03em" },
      h3: { fontWeight: 700, letterSpacing: "-0.025em" },
      h4: { fontWeight: 680, letterSpacing: "-0.02em" },
      h5: { fontWeight: 670, letterSpacing: "-0.015em" },
      h6: { fontWeight: 660, letterSpacing: "-0.01em" },
      button: {
        fontWeight: 680,
        letterSpacing: "-0.005em",
        textTransform: "none",
      },
      overline: {
        fontFamily: UTILITY_FONT,
        fontWeight: 700,
        letterSpacing: "0.08em",
      },
      caption: { fontFamily: UTILITY_FONT, letterSpacing: "0.01em" },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: { backgroundColor: token.canvas },
          body: {
            backgroundColor: token.canvas,
            backgroundImage:
              mode === "dark"
                ? `radial-gradient(circle at 72% -20%, ${token.translation}18, transparent 38%)`
                : "none",
          },
          "*": { scrollbarColor: `${token.rule} transparent` },
          "*:focus-visible": {
            outline: `3px solid ${token.translation}66`,
            outlineOffset: 2,
          },
          "@media (prefers-reduced-motion: reduce)": {
            "*, *::before, *::after": {
              animationDuration: "0.01ms !important",
              animationIterationCount: "1 !important",
              transitionDuration: "0.01ms !important",
            },
          },
        },
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { minHeight: 42, borderRadius: 10, paddingInline: 16 },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: { borderRadius: 10, minWidth: 42, minHeight: 42 },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: token.surfaceRaised,
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: token.muted,
            },
          },
        },
      },
      MuiAlert: { styleOverrides: { root: { borderRadius: 10 } } },
      MuiAccordion: {
        styleOverrides: { root: { backgroundImage: "none" } },
      },
      MuiTooltip: { defaultProps: { arrow: true } },
      MuiChip: { styleOverrides: { root: { borderRadius: 8 } } },
    },
  };
};
