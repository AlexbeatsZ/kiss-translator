import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { NavLink, useMatch } from "react-router-dom";
import { useI18n } from "../../hooks/I18n";
import { getSettingsNavigation } from "./settingsNavigation";

function LinkItem({ item, onNavigate, mobile = false }) {
  const match = useMatch({ path: item.url, end: item.url === "/" });
  const Icon = item.icon;
  const handleClick = (event) => {
    if (
      !onNavigate ||
      match ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    void onNavigate(item.url);
  };

  return (
    <ListItemButton
      component={NavLink}
      to={item.url}
      selected={!!match}
      onClick={handleClick}
      sx={(theme) => ({
        position: "relative",
        flexDirection: mobile ? "column" : "row",
        justifyContent: mobile ? "center" : "flex-start",
        flex: mobile ? 1 : "none",
        minWidth: 0,
        minHeight: mobile ? 58 : 46,
        mx: mobile ? 0 : 1,
        mb: mobile ? 0 : 0.4,
        px: mobile ? 0.5 : 1.25,
        borderRadius: mobile ? 1.25 : 1,
        color: "text.secondary",
        "& .MuiListItemIcon-root": { color: "inherit" },
        "&.Mui-selected": {
          color: "primary.main",
          backgroundColor: alpha(
            theme.palette.primary.main,
            mobile ? 0.1 : 0.12
          ),
          "&::before": mobile
            ? {
                content: '""',
                position: "absolute",
                top: 0,
                width: 28,
                height: 3,
                borderRadius: "0 0 4px 4px",
                backgroundColor: theme.palette.primary.main,
              }
            : undefined,
          "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.16),
          },
        },
      })}
    >
      <ListItemIcon
        sx={{
          minWidth: mobile ? 0 : 34,
          mb: mobile ? 0.3 : 0,
          justifyContent: "center",
        }}
      >
        <Icon sx={{ fontSize: mobile ? 20 : 19 }} />
      </ListItemIcon>
      <ListItemText
        primary={mobile ? item.mobileTitle : item.title}
        sx={{ m: 0, minWidth: 0 }}
        primaryTypographyProps={{
          fontSize: mobile ? "0.67rem" : "0.84rem",
          fontWeight: match ? 720 : 600,
          lineHeight: mobile ? 1.15 : 1.3,
          textAlign: mobile ? "center" : "left",
          noWrap: true,
        }}
      />
    </ListItemButton>
  );
}

export default function Navigator({
  drawerWidth = 208,
  PaperProps,
  onNavigate,
  ...props
}) {
  const i18n = useI18n();
  const items = getSettingsNavigation(i18n).flatMap((group) => group.items);

  if (props.variant === "mobile-bar") {
    return (
      <Box
        component="nav"
        aria-label={i18n("settings_navigation", "设置导航")}
        sx={(theme) => ({
          position: "fixed",
          zIndex: theme.zIndex.appBar + 1,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          gap: 0.25,
          px: 0.75,
          pt: 0.4,
          pb: "max(4px, env(safe-area-inset-bottom))",
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: alpha(
            theme.translationTokens?.rail || theme.palette.background.paper,
            0.97
          ),
          backdropFilter: "blur(16px)",
        })}
      >
        {items.map((item) => (
          <LinkItem key={item.id} item={item} onNavigate={onNavigate} mobile />
        ))}
      </Box>
    );
  }

  return (
    <Drawer
      {...props}
      PaperProps={{
        ...PaperProps,
        sx: (theme) => ({
          width: drawerWidth,
          boxSizing: "border-box",
          top: 56,
          height: "calc(100% - 56px)",
          borderRightColor: theme.palette.divider,
          backgroundColor:
            theme.translationTokens?.rail || theme.palette.background.paper,
          backgroundImage: "none",
        }),
      }}
    >
      <Box
        component="nav"
        aria-label={i18n("settings_navigation", "设置导航")}
        sx={{ flex: 1, minHeight: 0, overflowY: "auto", pt: 1.5 }}
      >
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ display: "block", px: 2.25, pb: 0.8, fontSize: "0.65rem" }}
        >
          {i18n("settings_group_translation", "翻译")}
        </Typography>
        <List disablePadding>
          {items.map((item) => (
            <LinkItem key={item.id} item={item} onNavigate={onNavigate} />
          ))}
        </List>
      </Box>
      <Divider />
      <Box sx={{ px: 2, py: 1.25 }}>
        <Typography variant="caption" color="text.disabled" fontSize="0.64rem">
          {`${i18n("app_name", "翻译")} · v${process.env.REACT_APP_VERSION}`}
        </Typography>
      </Box>
    </Drawer>
  );
}
