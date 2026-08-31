import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#14161F",
          800: "#1C1F2B",
          700: "#262A3A",
          600: "#333849",
        },
        paper: {
          DEFAULT: "#F4F5F7",
          card: "#FFFFFF",
        },
        line: {
          DEFAULT: "#E1E3E8",
          soft: "#ECEDF1",
        },
        slate: {
          DEFAULT: "#5B6072",
          soft: "#868C9C",
        },
        signal: {
          DEFAULT: "#E8A23D",
          50: "#FCF3E4",
          600: "#C9852A",
          700: "#A66C20",
        },
        status: {
          healthy: "#2F8F5B",
          watch: "#C9852A",
          risk: "#D4552C",
          critical: "#C13A3A",
          info: "#3A55D9",
        },
        adpulse: {
          red: {
            DEFAULT: "var(--adpulse-red-primary, #E31E24)",
            hover: "var(--adpulse-red-hover, #C6151B)",
          },
          slate: "var(--adpulse-dark-slate, #0F172A)",
          teal: "var(--adpulse-agency-teal, #14B8A6)",
          dark: "var(--bg-app-dark, #090D16)",
          surface: "var(--bg-card-surface, #1E293B)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "4px",
        md: "6px",
        lg: "8px",
        enterprise: "var(--radius-enterprise, 12px)",
      },
      boxShadow: {
        none: "none",
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.1rem" }],
        sm: ["0.8125rem", { lineHeight: "1.25rem" }],
        base: ["0.9375rem", { lineHeight: "1.45rem" }],
      },
    },
  },
  plugins: [],
};

export default config;
