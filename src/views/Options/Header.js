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
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.82)}`,
        backgroundColor: alpha(theme.palette.background.paper, 0.94),
        backdropFilter: "blur(18px)",
      })}
    >
      <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 1.5, sm: 2.5 } }}>
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
                width: 34,
                height: 34,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: "50% 50% 50% 16%",
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
              })}
            >
              <Logo size={23} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                component="div"
                variant="h6"
                sx={{
                  fontWeight: 580,
                  lineHeight: 1.05,
                  letterSpacing: "-0.025em",
                }}
              >
                {i18n("app_name", "KISS Translator")}
              </Typography>
              <Typography
                component="div"
                variant="caption"
                color="text.secondary"
                sx={{ display: { xs: "none", sm: "block" }, lineHeight: 1.2 }}
              >
                {i18n("translation_proof_desk", "Translation proof desk")}
              </Typography>
            </Box>
          </Stack>
        </Link>

        <Box sx={{ flexGrow: 1 }} />
        <DarkModeButton />
      </Toolbar>
    </AppBar>
  );
}

export default Header;
