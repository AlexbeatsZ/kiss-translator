import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { NavLink, useMatch } from "react-router-dom";
import { useI18n } from "../../hooks/I18n";
import { getSettingsNavigation } from "./settingsNavigation";

function LinkItem({ item, onNavigate, compact = false }) {
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
        mx: compact ? 0 : 1.25,
        mb: compact ? 0 : 0.35,
        minWidth: compact ? "max-content" : 0,
        minHeight: compact ? 46 : 44,
        borderRadius: compact ? 0 : 1,
        color: "text.secondary",
        borderLeft: compact ? 0 : "3px solid transparent",
        borderBottom: compact ? "3px solid transparent" : 0,
        "& .MuiListItemIcon-root": {
          color: "text.secondary",
        },
        "&.Mui-selected": {
          color: "primary.main",
          backgroundColor: alpha(
            theme.palette.primary.main,
            compact ? 0.06 : 0.075
          ),
          borderLeftColor: compact ? "transparent" : theme.palette.primary.main,
          borderBottomColor: compact
            ? theme.palette.primary.main
            : "transparent",
          "& .MuiListItemIcon-root": {
            color: "primary.main",
          },
          "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.16),
          },
        },
      })}
    >
      <ListItemIcon sx={{ minWidth: compact ? 30 : 36 }}>
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

  if (props.variant === "mobile-strip") {
    return (
      <Box
        component="nav"
        aria-label={i18n("settings_navigation", "Settings navigation")}
        sx={(theme) => ({
          position: "sticky",
          top: 56,
          zIndex: theme.zIndex.appBar - 1,
          display: "flex",
          overflowX: "auto",
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor: alpha(theme.palette.background.paper, 0.96),
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        })}
      >
        {groups.flatMap((group) =>
          group.items.map((item) => (
            <LinkItem
              key={item.id}
              item={item}
              onNavigate={onNavigate}
              compact
            />
          ))
        )}
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
          top: { xs: 56, sm: 64 },
          height: { xs: "calc(100% - 56px)", sm: "calc(100% - 64px)" },
          borderRightColor: alpha(theme.palette.divider, 0.92),
          backgroundColor: alpha(theme.palette.background.paper, 0.93),
          backgroundImage: "none",
        }),
      }}
    >
      <Box
        component="nav"
        aria-label={i18n("settings_navigation", "Settings navigation")}
        sx={{ flex: 1, minHeight: 0, overflowY: "auto", py: 2 }}
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
                  px: 2.75,
                  pt: index === 0 ? 0.5 : 1.25,
                  pb: 0.65,
                  color: "primary.main",
                  bgcolor: "transparent",
                  fontSize: "0.69rem",
                  fontWeight: 650,
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
          {`PROOF DESK · v${process.env.REACT_APP_VERSION}`}
        </Typography>
      </Box>
    </Drawer>
  );
}
