import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import Logo from "../../components/Logo";
import { useI18n } from "../../hooks/I18n";
import DarkModeButton from "./DarkModeButton";

function Header() {
  const i18n = useI18n();

  return (
    <AppBar
      color="transparent"
      position="sticky"
      elevation={0}
      sx={(theme) => ({
        zIndex: theme.zIndex.drawer + 1,
        color: "text.primary",
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: alpha(
          theme.translationTokens?.rail || theme.palette.background.paper,
          0.96
        ),
        backdropFilter: "blur(16px)",
      })}
    >
      <Toolbar sx={{ minHeight: "56px !important", px: { xs: 1.5, sm: 2 } }}>
        <Link
          underline="none"
          color="inherit"
          href={process.env.REACT_APP_HOMEPAGE}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ minWidth: 0, display: "inline-flex" }}
        >
          <Stack direction="row" alignItems="center" spacing={1.1}>
            <Box
              sx={(theme) => ({
                display: "grid",
                placeItems: "center",
                width: 32,
                height: 32,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1.25,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
              })}
            >
              <Logo size={22} />
            </Box>
            <Typography
              component="div"
              variant="subtitle1"
              sx={{ fontWeight: 720, lineHeight: 1, letterSpacing: "-0.02em" }}
            >
              {i18n("app_name", "KISS Translator")}
            </Typography>
          </Stack>
        </Link>

        <Box sx={{ flexGrow: 1 }} />
        <DarkModeButton />
      </Toolbar>
    </AppBar>
  );
}

export default Header;
