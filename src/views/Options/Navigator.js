import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { NavLink, useMatch } from "react-router-dom";
import { useI18n } from "../../hooks/I18n";
import { getSettingsNavigation } from "./settingsNavigation";

function LinkItem({ item, onNavigate }) {
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
        mx: 1.25,
        mb: 0.4,
        minHeight: 42,
        borderRadius: 2,
        color: "text.secondary",
        "& .MuiListItemIcon-root": {
          color: "text.secondary",
        },
        "&.Mui-selected": {
          color: "primary.main",
          backgroundColor: alpha(theme.palette.primary.main, 0.11),
          "& .MuiListItemIcon-root": {
            color: "primary.main",
          },
          "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.16),
          },
        },
      })}
    >
      <ListItemIcon sx={{ minWidth: 36 }}>
        <Icon fontSize="small" />
      </ListItemIcon>
      <ListItemText
        primary={item.title}
        primaryTypographyProps={{
          variant: "body2",
          fontWeight: match ? 700 : 560,
          lineHeight: 1.3,
        }}
      />
    </ListItemButton>
  );
}

export default function Navigator({
  drawerWidth = 272,
  PaperProps,
  onNavigate,
  ...props
}) {
  const i18n = useI18n();
  const groups = getSettingsNavigation(i18n);

  return (
    <Drawer
      {...props}
      PaperProps={{
        ...PaperProps,
        sx: (theme) => ({
          width: drawerWidth,
          boxSizing: "border-box",
          borderRightColor: alpha(theme.palette.divider, 0.82),
          backgroundColor:
            theme.palette.mode === "dark"
              ? alpha(theme.palette.background.paper, 0.96)
              : "#fbfcfe",
          backgroundImage: "none",
        }),
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }} />
      <Box
        component="nav"
        aria-label={i18n("settings_navigation", "Settings navigation")}
        sx={{ flex: 1, minHeight: 0, overflowY: "auto", py: 1 }}
      >
        {groups.map((group, index) => (
          <List
            key={group.id}
            disablePadding
            subheader={
              <ListSubheader
                component="div"
                disableSticky
                sx={{
                  px: 2.5,
                  pt: index === 0 ? 0.5 : 1.25,
                  pb: 0.65,
                  color: "text.disabled",
                  bgcolor: "transparent",
                  fontSize: "0.69rem",
                  fontWeight: 760,
                  lineHeight: 1.5,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {group.label}
              </ListSubheader>
            }
          >
            {group.items.map((item) => (
              <LinkItem key={item.id} item={item} onNavigate={onNavigate} />
            ))}
          </List>
        ))}
      </Box>
      <Divider />
      <Box sx={{ px: 2.5, py: 1.5 }}>
        <Typography variant="caption" color="text.disabled">
          {`KISS Translator v${process.env.REACT_APP_VERSION}`}
        </Typography>
      </Box>
    </Drawer>
  );
}
