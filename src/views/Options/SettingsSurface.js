import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { alpha } from "@mui/material/styles";

function ReadingContext({ source, target, engine }) {
  return (
    <Box
      aria-label="Default translation context"
      sx={(theme) => ({
        minWidth: { sm: 260 },
        maxWidth: { xs: "100%", sm: 320 },
        borderLeft: `3px solid ${theme.palette.primary.main}`,
        pl: 1.75,
        py: 0.35,
      })}
    >
      <Stack direction="row" alignItems="baseline" spacing={1}>
        <Typography variant="overline" color="secondary.main">
          {source}
        </Typography>
        <Typography aria-hidden="true" color="text.disabled">
          →
        </Typography>
        <Typography variant="overline" color="primary.main">
          {target}
        </Typography>
      </Stack>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mt: 0.1, overflowWrap: "anywhere" }}
      >
        {engine || "—"}
      </Typography>
    </Box>
  );
}

export function SettingsPageHeader({
  eyebrow,
  title,
  description,
  actions,
  readingContext,
}) {
  return (
    <Stack
      component="header"
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "flex-start", sm: "flex-end" }}
      justifyContent="space-between"
      spacing={2}
      sx={{ mb: { xs: 2.5, md: 4 } }}
    >
      <Box sx={{ minWidth: 0, maxWidth: 820 }}>
        {eyebrow && (
          <Typography
            variant="overline"
            color="primary.main"
            sx={{ fontWeight: 650 }}
          >
            {eyebrow}
          </Typography>
        )}
        <Typography
          component="h1"
          variant="h3"
          sx={{
            fontSize: { xs: "2.05rem", sm: "2.65rem" },
            overflowWrap: "anywhere",
          }}
        >
          {title}
        </Typography>
        {description && (
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mt: 0.75, lineHeight: 1.65, maxWidth: 680 }}
          >
            {description}
          </Typography>
        )}
      </Box>
      {(readingContext || actions) && (
        <Stack
          spacing={1.5}
          sx={{ flexShrink: 0, width: { xs: "100%", sm: "auto" } }}
        >
          {readingContext && <ReadingContext {...readingContext} />}
          {actions && <Box>{actions}</Box>}
        </Stack>
      )}
    </Stack>
  );
}

const sectionSx = (theme) => ({
  borderColor: alpha(
    theme.palette.divider,
    theme.palette.mode === "dark" ? 0.8 : 1
  ),
  borderRadius: 1.5,
  backgroundImage: "none",
  backgroundColor:
    theme.palette.mode === "dark"
      ? alpha(theme.palette.background.paper, 0.78)
      : theme.palette.background.paper,
  boxShadow: "none",
  position: "relative",
  "&::before": {
    content: '""',
    position: "absolute",
    left: -1,
    top: 22,
    width: 3,
    height: 34,
    borderRadius: 3,
    backgroundColor: theme.palette.primary.main,
  },
});

function SectionHeading({ title, description, action }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "flex-start", sm: "center" }}
      justifyContent="space-between"
      spacing={1.5}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography component="h2" variant="h5" sx={{ fontWeight: 570 }}>
          {title}
        </Typography>
        {description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.4, lineHeight: 1.6 }}
          >
            {description}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
    </Stack>
  );
}

export function SettingsSection({ title, description, action, children, sx }) {
  return (
    <Paper
      component="section"
      variant="outlined"
      sx={(theme) => ({
        ...sectionSx(theme),
        p: { xs: 2, sm: 2.5, md: 3 },
        ...(typeof sx === "function" ? sx(theme) : sx),
      })}
    >
      <SectionHeading title={title} description={description} action={action} />
      <Box sx={{ mt: 2.5 }}>{children}</Box>
    </Paper>
  );
}

export function SettingsAccordionSection({
  title,
  description,
  children,
  defaultExpanded = false,
}) {
  return (
    <Accordion
      component="section"
      defaultExpanded={defaultExpanded}
      disableGutters
      elevation={0}
      sx={(theme) => ({
        ...sectionSx(theme),
        overflow: "hidden",
        "&::before": { display: "none" },
      })}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          px: { xs: 2, sm: 2.5, md: 3 },
          py: 0.75,
          minHeight: 72,
          "& .MuiAccordionSummary-content": { my: 1.25 },
        }}
      >
        <SectionHeading title={title} description={description} />
      </AccordionSummary>
      <AccordionDetails sx={{ px: { xs: 2, sm: 2.5, md: 3 }, pb: 3 }}>
        {children}
      </AccordionDetails>
    </Accordion>
  );
}

export function SettingsGrid({ children, minColumnWidth = 230, sx }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minColumnWidth}px), 1fr))`,
        gap: 2,
        alignItems: "start",
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

export function SettingsToggle({ label, description, control, sx }) {
  return (
    <FormControlLabel
      labelPlacement="start"
      control={control}
      label={
        <Box sx={{ pr: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 650 }}>
            {label}
          </Typography>
          {description && (
            <Typography
              component="span"
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 0.35, lineHeight: 1.45 }}
            >
              {description}
            </Typography>
          )}
        </Box>
      }
      sx={(theme) => ({
        m: 0,
        px: 1.5,
        py: 0.75,
        minHeight: 56,
        width: "100%",
        justifyContent: "space-between",
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        ...(typeof sx === "function" ? sx(theme) : sx),
      })}
    />
  );
}
