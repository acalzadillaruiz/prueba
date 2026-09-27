import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "rgb(11 18 32 / <alpha-value>)", 2: "rgb(17 24 39 / <alpha-value>)", card: "#152033", line: "#22304a" },
        coral: { DEFAULT: "rgb(var(--np-coral-rgb) / <alpha-value>)", hover: "rgb(var(--np-coral-hover-rgb) / <alpha-value>)", cta: "rgb(var(--np-coral-cta-rgb) / <alpha-value>)", "cta-hover": "rgb(var(--np-coral-cta-hover-rgb) / <alpha-value>)" },
        ivory: "rgb(var(--np-ivory-rgb) / <alpha-value>)",
        mist: "rgb(var(--np-mist-rgb) / <alpha-value>)",
        gold: "rgb(var(--np-gold-rgb) / <alpha-value>)",
        ink: "rgb(var(--np-ink-rgb) / <alpha-value>)",
        line: "rgb(var(--np-line-rgb) / <alpha-value>)",
        ok: "rgb(var(--np-ok-rgb) / <alpha-value>)",
        warn: "rgb(var(--np-warn-rgb) / <alpha-value>)",
        danger: "rgb(var(--np-danger-rgb) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
      borderRadius: { np: "var(--radius)" },
      boxShadow: { np: "var(--shadow)" },
      transitionTimingFunction: { np: "cubic-bezier(0,0,.2,1)" },
      transitionDuration: { np: "180ms" },
    },
  },
  plugins: [],
};
export default config;
