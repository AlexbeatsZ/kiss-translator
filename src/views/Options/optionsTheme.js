const LIGHT_TOKENS = {
  ink: "#17211D",
  paper: "#EEF3F1",
  sheet: "#F9FBFA",
  muted: "#5D6B65",
  source: "#425B6B",
  translation: "#08775C",
  proof: "#D7694E",
  rule: "#BECBC5",
};

const DARK_TOKENS = {
  ink: "#ECF3EF",
  paper: "#101713",
  sheet: "#18231E",
  muted: "#9EADA6",
  source: "#A9BBB3",
  translation: "#55CDAA",
  proof: "#F08B72",
  rule: "#34483F",
};

const DISPLAY_FONT =
  "Newsreader, Iowan Old Style, Palatino Linotype, Noto Serif SC, serif";
const BODY_FONT =
  "Noto Sans SC, Microsoft YaHei UI, Aptos, Segoe UI, sans-serif";
const UTILITY_FONT = "IBM Plex Mono, Cascadia Mono, Consolas, monospace";

export const OPTIONS_THEME_OPTIONS = ({ mode }) => {
  const token = mode === "dark" ? DARK_TOKENS : LIGHT_TOKENS;

  return {
    translationTokens: token,
    shape: {
      borderRadius: 10,
    },
    palette: {
      primary: {
        main: token.translation,
        contrastText: mode === "dark" ? "#102019" : "#FFFFFF",
      },
      secondary: {
        main: token.source,
      },
      error: {
        main: token.proof,
      },
      background: {
        default: token.paper,
        paper: token.sheet,
      },
      text: {
        primary: token.ink,
        secondary: token.muted,
      },
      divider: token.rule,
    },
    typography: {
      fontFamily: BODY_FONT,
      h1: {
        fontFamily: DISPLAY_FONT,
        fontWeight: 570,
        letterSpacing: "-0.035em",
      },
      h2: {
        fontFamily: DISPLAY_FONT,
        fontWeight: 570,
        letterSpacing: "-0.028em",
      },
      h3: {
        fontFamily: DISPLAY_FONT,
        fontWeight: 570,
        letterSpacing: "-0.02em",
      },
      h4: {
        fontFamily: DISPLAY_FONT,
        fontWeight: 570,
        letterSpacing: "-0.015em",
      },
      button: {
        fontWeight: 680,
        letterSpacing: "-0.01em",
        textTransform: "none",
      },
      overline: {
        fontFamily: UTILITY_FONT,
        fontWeight: 650,
        letterSpacing: "0.085em",
      },
      caption: { fontFamily: UTILITY_FONT, letterSpacing: "0.015em" },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: token.paper,
            backgroundImage: `radial-gradient(circle at 1px 1px, ${token.rule}55 1px, transparent 0)`,
            backgroundSize: "22px 22px",
          },
          "*:focus-visible": {
            outline: `3px solid ${token.proof}66`,
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
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            minHeight: 42,
            borderRadius: 8,
            paddingInline: 16,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundColor: `${token.sheet}E8`,
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
      MuiTooltip: {
        defaultProps: {
          arrow: true,
        },
      },
    },
  };
};
