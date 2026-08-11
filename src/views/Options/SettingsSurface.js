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

export function SettingsPageHeader({ eyebrow, title, description, actions }) {
  return (
    <Stack
      component="header"
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "flex-start", sm: "center" }}
      justifyContent="space-between"
      spacing={2}
      sx={{ mb: { xs: 2.5, md: 3.5 } }}
    >
      <Box sx={{ minWidth: 0, maxWidth: 820 }}>
        {eyebrow && (
          <Typography
            variant="overline"
            color="primary.main"
            sx={{ fontWeight: 750, letterSpacing: "0.08em" }}
          >
            {eyebrow}
          </Typography>
        )}
        <Typography
          component="h1"
          variant="h4"
          sx={{
            fontWeight: 760,
            letterSpacing: "-0.025em",
            overflowWrap: "anywhere",
          }}
        >
          {title}
        </Typography>
        {description && (
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mt: 0.75, lineHeight: 1.65 }}
          >
            {description}
          </Typography>
        )}
      </Box>
      {actions && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
    </Stack>
  );
}

const sectionSx = (theme) => ({
  borderColor: alpha(
    theme.palette.divider,
    theme.palette.mode === "dark" ? 0.8 : 1
  ),
  borderRadius: 3,
  backgroundImage: "none",
  backgroundColor:
    theme.palette.mode === "dark"
      ? alpha(theme.palette.background.paper, 0.78)
      : theme.palette.background.paper,
  boxShadow:
    theme.palette.mode === "dark"
      ? "0 18px 48px rgba(0, 0, 0, 0.18)"
      : "0 16px 40px rgba(15, 23, 42, 0.045)",
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
        <Typography component="h2" variant="h6" sx={{ fontWeight: 720 }}>
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
        borderRadius: 2,
        ...(typeof sx === "function" ? sx(theme) : sx),
      })}
    />
  );
}
