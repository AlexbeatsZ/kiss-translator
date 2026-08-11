import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import MenuIcon from "@mui/icons-material/Menu";
import { alpha } from "@mui/material/styles";
import Logo from "../../components/Logo";
import { useI18n } from "../../hooks/I18n";
import DarkModeButton from "./DarkModeButton";

function Header({ onDrawerToggle }) {
  const i18n = useI18n();

  return (
    <AppBar
      color="transparent"
      position="sticky"
      elevation={0}
      sx={(theme) => ({
        zIndex: theme.zIndex.drawer + 1,
        color: "text.primary",
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.82)}`,
        backgroundColor: alpha(
          theme.palette.background.paper,
          theme.palette.mode === "dark" ? 0.88 : 0.9
        ),
        backdropFilter: "blur(16px)",
      })}
    >
      <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 1.5, sm: 2.5 } }}>
        <Box sx={{ display: { xs: "block", md: "none" }, mr: 0.75 }}>
          <IconButton
            color="inherit"
            aria-label={i18n("open_navigation", "Open navigation")}
            onClick={onDrawerToggle}
            edge="start"
          >
            <MenuIcon />
          </IconButton>
        </Box>

        <Link
          underline="none"
          color="inherit"
          href={process.env.REACT_APP_HOMEPAGE}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ minWidth: 0 }}
        >
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Logo size={28} />
            <Box sx={{ minWidth: 0 }}>
              <Typography
                component="div"
                variant="subtitle1"
                sx={{ fontWeight: 760, lineHeight: 1.2 }}
              >
                {i18n("app_name", "KISS Translator")}
              </Typography>
              <Typography
                component="div"
                variant="caption"
                color="text.secondary"
                sx={{ display: { xs: "none", sm: "block" }, lineHeight: 1.2 }}
              >
                {i18n("settings_center", "Settings center")}
              </Typography>
            </Box>
          </Stack>
        </Link>

        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title={i18n("theme_mode", "Theme mode")}>
          <Box component="span">
            <DarkModeButton />
          </Box>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}

export default Header;
