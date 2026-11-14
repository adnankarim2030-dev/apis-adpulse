import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        border: "var(--border)",
        text: "var(--text)",
        muted: "var(--muted)",
        subtle: "var(--subtle)",

        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          soft: "var(--primary-soft)",
          border: "var(--primary-border)",
        },

        success: {
          DEFAULT: "var(--success-bg)",
          bg: "var(--success-bg)",
          text: "var(--success-text)",
        },
        warning: {
          DEFAULT: "var(--warning-bg)",
          bg: "var(--warning-bg)",
          text: "var(--warning-text)",
        },
        danger: {
          DEFAULT: "var(--danger-bg)",
          bg: "var(--danger-bg)",
          text: "var(--danger-text)",
        },
        info: {
          DEFAULT: "var(--info-bg)",
          bg: "var(--info-bg)",
          text: "var(--info-text)",
        },
        neutral: {
          DEFAULT: "var(--neutral-bg)",
          bg: "var(--neutral-bg)",
          text: "var(--neutral-text)",
        },

        // Legacy compatibility aliases
        ink: {
          DEFAULT: "var(--text)",
          800: "var(--muted)",
          700: "var(--muted)",
          600: "var(--subtle)",
        },
        paper: {
          DEFAULT: "var(--background)",
          card: "var(--surface)",
        },
        line: {
          DEFAULT: "var(--border)",
          soft: "var(--border)",
        },
        slate: {
          DEFAULT: "var(--muted)",
          soft: "var(--subtle)",
        },
        signal: {
          DEFAULT: "var(--primary)",
          50: "var(--primary-soft)",
          600: "var(--primary-hover)",
          700: "var(--primary-hover)",
        },
        status: {
          healthy: "var(--success-text)",
          watch: "var(--warning-text)",
          risk: "var(--danger-text)",
          critical: "var(--danger-text)",
          info: "var(--info-text)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        display: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        button: "12px",
        input: "12px",
        chip: "9999px",
        DEFAULT: "12px",
        lg: "16px",
        md: "12px",
        sm: "8px",
        full: "9999px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15,23,42,.05), 0 6px 16px rgba(15,23,42,.05)",
        sm: "0 1px 2px rgba(15,23,42,.05)",
        md: "0 4px 6px -1px rgba(15,23,42,.07), 0 2px 4px -2px rgba(15,23,42,.05)",
        lg: "0 10px 15px -3px rgba(15,23,42,.08), 0 4px 6px -4px rgba(15,23,42,.04)",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.5" }],
        sm: ["0.875rem", { lineHeight: "1.5" }],
        base: ["1rem", { lineHeight: "1.5" }],
        lg: ["1.125rem", { lineHeight: "1.5" }],
        xl: ["1.25rem", { lineHeight: "1.4" }],
        "2xl": ["1.5rem", { lineHeight: "1.3" }],
      },
    },
  },
  plugins: [],
};

export default config;
