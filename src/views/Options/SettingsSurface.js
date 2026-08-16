import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { alpha } from "@mui/material/styles";

function FlowValue({ label, value, color }) {
  return (
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Typography
        variant="caption"
        sx={{ color: "text.secondary", fontSize: "0.64rem" }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ color, fontWeight: 700, overflowWrap: "anywhere", mt: 0.15 }}
      >
        {value || "—"}
      </Typography>
    </Box>
  );
}

function ReadingContext({ source, target, engine }) {
  return (
    <Paper
      aria-label="Default translation context"
      variant="outlined"
      sx={(theme) => ({
        mt: 1.75,
        px: { xs: 1.5, sm: 2 },
        py: 1.15,
        display: "flex",
        alignItems: "center",
        gap: { xs: 1, sm: 1.5 },
        borderColor: alpha(theme.palette.primary.main, 0.28),
        backgroundColor: alpha(theme.palette.primary.main, 0.045),
      })}
    >
      <FlowValue label="SOURCE" value={source} color="secondary.main" />
      <ArrowForwardRoundedIcon sx={{ color: "text.disabled", fontSize: 18 }} />
      <FlowValue label="ENGINE" value={engine} color="text.primary" />
      <ArrowForwardRoundedIcon sx={{ color: "text.disabled", fontSize: 18 }} />
      <FlowValue label="OUTPUT" value={target} color="primary.main" />
    </Paper>
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
    <Box component="header" sx={{ mb: { xs: 2, md: 2.5 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={1.5}
      >
        <Box sx={{ minWidth: 0 }}>
          {eyebrow && (
            <Typography variant="overline" color="primary.main">
              {eyebrow}
            </Typography>
          )}
          <Typography
            component="h1"
            variant="h4"
            sx={{ fontSize: { xs: "1.65rem", sm: "1.95rem" }, mt: -0.15 }}
          >
            {title}
          </Typography>
          {description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.35, maxWidth: 720, lineHeight: 1.5 }}
            >
              {description}
            </Typography>
          )}
        </Box>
        {actions && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
      </Stack>
      {readingContext && <ReadingContext {...readingContext} />}
    </Box>
  );
}

const sectionSx = (theme) => ({
  borderColor: alpha(theme.palette.divider, 0.95),
  borderRadius: 1.5,
  backgroundColor: theme.palette.background.paper,
  boxShadow: "none",
});

function SectionHeading({ title, description, action }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "flex-start", sm: "center" }}
      justifyContent="space-between"
      spacing={1.25}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography component="h2" variant="h6">
          {title}
        </Typography>
        {description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.25, lineHeight: 1.5 }}
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
        p: { xs: 1.75, sm: 2.25 },
        ...(typeof sx === "function" ? sx(theme) : sx),
      })}
    >
      <SectionHeading title={title} description={description} action={action} />
      <Box sx={{ mt: 2 }}>{children}</Box>
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
          px: { xs: 1.75, sm: 2.25 },
          py: 0.35,
          minHeight: 64,
          "& .MuiAccordionSummary-content": { my: 1 },
        }}
      >
        <SectionHeading title={title} description={description} />
      </AccordionSummary>
      <AccordionDetails sx={{ px: { xs: 1.75, sm: 2.25 }, pb: 2.25 }}>
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
        gap: 1.5,
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
        <Box sx={{ pr: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 650 }}>
            {label}
          </Typography>
          {description && (
            <Typography
              component="span"
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 0.2, lineHeight: 1.4 }}
            >
              {description}
            </Typography>
          )}
        </Box>
      }
      sx={(theme) => ({
        m: 0,
        px: 1.5,
        py: 0.65,
        minHeight: 58,
        width: "100%",
        justifyContent: "space-between",
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1.25,
        backgroundColor: theme.translationTokens?.surfaceRaised,
        ...(typeof sx === "function" ? sx(theme) : sx),
      })}
    />
  );
}
