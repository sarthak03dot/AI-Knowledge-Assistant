import React, { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

export const theme = {
  colors: {
    primary: {
      main: "#06b6d4",
      light: "#22d3ee",
      dark: "#0891b2",
      contrastText: "#ffffff",
      border: "rgba(6, 182, 212, 0.35)",
      alpha10: "rgba(6, 182, 212, 0.1)",
      bg: "rgba(6, 182, 212, 0.12)",
    },
    secondary: {
      main: "#8b5cf6",
      light: "#a78bfa",
      dark: "#7c3aed",
      contrastText: "#ffffff",
      border: "rgba(139, 92, 246, 0.35)",
      alpha10: "rgba(139, 92, 246, 0.1)",
      bg: "rgba(139, 92, 246, 0.12)",
    },
    accent: {
      blue: "#3b82f6",
      cyan: "#06b6d4",
      purple: "#8b5cf6",
      teal: "#14b8a6",
      pink: "#ec4899",
    },
    success: {
      main: "#10b981",
      light: "#34d399",
      dark: "#059669",
      contrastText: "#ffffff",
    },
    warning: {
      main: "#f59e0b",
      light: "#fbbf24",
      dark: "#d97706",
      contrastText: "#ffffff",
    },
    error: {
      main: "#f43f5e",
      light: "#fb7185",
      dark: "#e11d48",
      contrastText: "#ffffff",
    },
    info: {
      main: "#06b6d4",
      light: "#22d3ee",
      dark: "#0891b2",
      contrastText: "#ffffff",
    },
    background: {
      default: "#070b14",
      paper: "#0f172a",
      darkSurface: "#05080f",
      darkCard: "#0b1120",
    },
    text: {
      primary: "#f8fafc",
      secondary: "#cbd5e1",
      tertiary: "#94a3b8",
      disabled: "#64748b",
      inverse: "#ffffff",
    },
    border: {
      default: "rgba(255, 255, 255, 0.08)",
      light: "rgba(255, 255, 255, 0.05)",
      dark: "rgba(6, 182, 212, 0.25)",
      glow: "rgba(6, 182, 212, 0.4)",
    },
    divider: "rgba(255, 255, 255, 0.08)",
    action: {
      hover: "rgba(6, 182, 212, 0.08)",
      selected: "rgba(6, 182, 212, 0.16)",
      disabled: "rgba(255, 255, 255, 0.3)",
      disabledBackground: "rgba(255, 255, 255, 0.08)",
    },
    neutral: {
      50: "#f8fafc",
      100: "#f1f5f9",
      200: "#e2e8f0",
      300: "#cbd5e1",
      400: "#94a3b8",
      500: "#64748b",
      600: "#475569",
      700: "#334155",
      800: "#1e293b",
      900: "#0f172a",
      950: "#070b14",
    },
    gradients: {
      primary: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
      primaryHover: "linear-gradient(135deg, #0891b2 0%, #2563eb 50%, #7c3aed 100%)",
      cyber: "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)",
      surface: "linear-gradient(180deg, #0f172a 0%, #0b1120 100%)",
      subtle: "linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)",
      card: "linear-gradient(145deg, rgba(15, 23, 42, 0.8) 0%, rgba(11, 17, 32, 0.9) 100%)",
    },
    shadows: {
      xs: "0 1px 2px rgba(0, 0, 0, 0.2)",
      sm: "0 2px 4px rgba(0, 0, 0, 0.25)",
      md: "0 4px 12px rgba(0, 0, 0, 0.3)",
      lg: "0 8px 24px rgba(0, 0, 0, 0.4)",
      xl: "0 16px 36px rgba(0, 0, 0, 0.5)",
      primary: "0 4px 16px rgba(6, 182, 212, 0.35)",
      primaryHover: "0 6px 24px rgba(6, 182, 212, 0.5)",
      secondary: "0 4px 16px rgba(139, 92, 246, 0.35)",
    },
  },
  typography: {
    fontFamily: '"Outfit", "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: { fontWeight: 800, letterSpacing: "-0.02em" },
    h2: { fontWeight: 800, letterSpacing: "-0.02em" },
    h3: { fontWeight: 700, letterSpacing: "-0.015em" },
    h4: { fontWeight: 700, letterSpacing: "-0.01em" },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    body1: { fontSize: "0.925rem", lineHeight: 1.6 },
    body2: { fontSize: "0.85rem", lineHeight: 1.6 },
    caption: { fontSize: "0.75rem" },
    overline: { fontSize: "0.68rem", textTransform: "uppercase" as const, letterSpacing: "0.08em" },
  },
  borderRadius: {
    sm: "6px",
    md: "10px",
    lg: "14px",
    xl: "20px",
    full: "9999px",
  },
  transitions: {
    fast: "all 0.15s ease",
    normal: "all 0.2s ease",
  },
};

export type Theme = typeof theme;

const muiTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: theme.colors.primary.main,
      light: theme.colors.primary.light,
      dark: theme.colors.primary.dark,
      contrastText: theme.colors.primary.contrastText,
    },
    secondary: {
      main: theme.colors.secondary.main,
      light: theme.colors.secondary.light,
      dark: theme.colors.secondary.dark,
      contrastText: theme.colors.secondary.contrastText,
    },
    success: {
      main: theme.colors.success.main,
      light: theme.colors.success.light,
      dark: theme.colors.success.dark,
      contrastText: theme.colors.success.contrastText,
    },
    warning: {
      main: theme.colors.warning.main,
      light: theme.colors.warning.light,
      dark: theme.colors.warning.dark,
      contrastText: theme.colors.warning.contrastText,
    },
    error: {
      main: theme.colors.error.main,
      light: theme.colors.error.light,
      dark: theme.colors.error.dark,
      contrastText: theme.colors.error.contrastText,
    },
    info: {
      main: theme.colors.info.main,
      light: theme.colors.info.light,
      dark: theme.colors.info.dark,
      contrastText: theme.colors.info.contrastText,
    },
    background: {
      default: theme.colors.background.default,
      paper: theme.colors.background.paper,
    },
    text: {
      primary: theme.colors.text.primary,
      secondary: theme.colors.text.secondary,
      disabled: theme.colors.text.disabled,
    },
    divider: theme.colors.divider,
    action: {
      hover: theme.colors.action.hover,
      selected: theme.colors.action.selected,
      disabled: theme.colors.action.disabled,
      disabledBackground: theme.colors.action.disabledBackground,
    },
  },
  typography: {
    fontFamily: theme.typography.fontFamily,
    h1: theme.typography.h1,
    h2: theme.typography.h2,
    h3: theme.typography.h3,
    h4: theme.typography.h4,
    h5: theme.typography.h5,
    h6: theme.typography.h6,
    body1: theme.typography.body1,
    body2: theme.typography.body2,
    caption: theme.typography.caption,
    overline: theme.typography.overline,
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#070b14",
          color: "#f8fafc",
          scrollbarColor: "#1e293b #070b14",
        },
        "input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus, input:-webkit-autofill:active": {
          WebkitBoxShadow: "0 0 0 1000px #0b1120 inset !important",
          WebkitTextFillColor: "#f8fafc !important",
          caretColor: "#06b6d4 !important",
          borderRadius: "inherit",
          transition: "background-color 5000s ease-in-out 0s",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 10,
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          backgroundColor: "#0f172a",
          backgroundImage: "none",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "#0f172a",
        },
      },
    },
  },
});

interface ThemeContextValue {
  theme: Theme;
  colors: Theme["colors"];
  getColor: (path: string) => string | undefined;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const contextValue = useMemo(
    () => ({
      theme,
      colors: theme.colors,
      getColor: (path: string) => {
        const keys = path.split(".");
        let value: any = theme.colors;
        for (const key of keys) {
          value = value?.[key];
        }
        return value;
      },
    }),
    []
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme,
      colors: theme.colors,
      getColor: (path: string) => {
        const keys = path.split(".");
        let value: any = theme.colors;
        for (const key of keys) {
          value = value?.[key];
        }
        return value;
      },
    };
  }
  return context;
};

export const useColors = () => {
  const context = useContext(ThemeContext);
  return context ? context.colors : theme.colors;
};