import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "var(--np-navy)", 2: "var(--np-navy-2)", card: "#152033", line: "#22304a" },
        coral: { DEFAULT: "var(--np-coral)", hover: "var(--np-coral-hover)" },
        ivory: "var(--np-ivory)",
        mist: "var(--np-mist)",
        gold: "var(--np-gold)",
        ink: "var(--np-ink)",
        line: "var(--np-line)",
        ok: "var(--np-ok)",
        warn: "var(--np-warn)",
        danger: "var(--np-danger)",
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
