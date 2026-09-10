import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cloud: "var(--cloud)",
        surface: {
          DEFAULT: "var(--surface)",
          hover: "var(--surface-hover)",
        },
        border: "var(--border)",
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          soft: "var(--primary-soft)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          elevated: "var(--sidebar-elevated)",
          border: "var(--sidebar-border)",
          text: "var(--sidebar-text)",
          active: "var(--sidebar-text-active)",
        },
        emerald: {
          DEFAULT: "var(--emerald)",
          soft: "var(--emerald-soft)",
        },
        sage: {
          DEFAULT: "var(--sage)",
          soft: "var(--sage-soft)",
        },
        aqua: {
          DEFAULT: "var(--aqua)",
          deep: "var(--aqua-deep)",
          wash: "var(--aqua-wash)",
        },
        sun: {
          DEFAULT: "var(--sun)",
          deep: "var(--sun-deep)",
          wash: "var(--sun-wash)",
        },
        tangerine: {
          DEFAULT: "var(--tangerine)",
          deep: "var(--tangerine-deep)",
          wash: "var(--tangerine-wash)",
        },
        "vivid-teal": {
          DEFAULT: "var(--vivid-teal)",
          wash: "var(--vivid-teal-wash)",
        },
        coral: {
          DEFAULT: "var(--coral)",
          deep: "var(--coral-deep)",
        },
        violet: {
          DEFAULT: "var(--violet)",
          soft: "var(--violet-soft)",
        },
        brass: {
          DEFAULT: "var(--brass)",
          soft: "var(--brass-soft)",
        },
        amber: {
          DEFAULT: "var(--amber)",
          soft: "var(--amber-soft)",
        },
        rose: {
          DEFAULT: "var(--rose)",
          soft: "var(--rose-soft)",
        },
        ink: "var(--ink)",
        slate: {
          DEFAULT: "var(--slate)",
          dim: "var(--slate-dim)",
        },
        mint: {
          DEFAULT: "var(--emerald)",
          soft: "var(--emerald-soft)",
        },
        paper: "var(--ink)",
        mist: {
          DEFAULT: "var(--slate)",
          dim: "var(--slate-dim)",
        },
        charcoal: "var(--cloud)",
        foreground: "var(--ink)",
        muted: "var(--slate)",
        accent: {
          DEFAULT: "var(--primary)",
          soft: "var(--primary-soft)",
          glow: "var(--primary)",
        },
        danger: "var(--rose)",
        warning: "var(--amber)",
        success: "var(--sage)",
        positive: "var(--sage)",
        background: "var(--cloud)",
        "surface-2": "var(--surface-hover)",
        "surface-3": "var(--surface-hover)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "10px",
        button: "10px",
      },
      boxShadow: {
        card: "var(--card-shadow)",
        lift: "var(--card-shadow-lift)",
      },
      transitionDuration: {
        fast: "180ms",
      },
    },
  },
  plugins: [],
};
export default config;
