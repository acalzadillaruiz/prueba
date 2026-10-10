import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "rgb(var(--np-navy-rgb) / <alpha-value>)", 2: "rgb(var(--np-navy-2-rgb) / <alpha-value>)", card: "#2E343C", line: "#49525D" },
        coral: { DEFAULT: "rgb(var(--np-coral-rgb) / <alpha-value>)", hover: "rgb(var(--np-coral-hover-rgb) / <alpha-value>)", cta: "rgb(var(--np-coral-cta-rgb) / <alpha-value>)", "cta-hover": "rgb(var(--np-coral-cta-hover-rgb) / <alpha-value>)" },
        ivory: "rgb(var(--np-ivory-rgb) / <alpha-value>)",
        arena: "rgb(var(--np-arena-rgb) / <alpha-value>)",
        egeo: "rgb(var(--np-egeo-rgb) / <alpha-value>)",
        rosa: "rgb(var(--np-rosa-rgb) / <alpha-value>)",
        muted: "rgb(var(--np-muted-rgb) / <alpha-value>)",
        mist: "rgb(var(--np-mist-rgb) / <alpha-value>)",
        gold: { DEFAULT: "rgb(var(--np-gold-rgb) / <alpha-value>)", text: "rgb(var(--np-gold-text-rgb) / <alpha-value>)" },
        ink: "rgb(var(--np-ink-rgb) / <alpha-value>)",
        // AMALI names (030): the same palette under its own words, for new code.
        travertino: "rgb(var(--np-ivory-rgb) / <alpha-value>)",
        piedra: "rgb(var(--np-arena-rgb) / <alpha-value>)",
        ambar: "rgb(var(--np-ambar-rgb) / <alpha-value>)",
        taupe: "rgb(var(--np-taupe-rgb) / <alpha-value>)",
        pizarra: "rgb(var(--np-navy-rgb) / <alpha-value>)",
        mar: "rgb(var(--np-coral-rgb) / <alpha-value>)",
        noche: "#1C1D1D",
        line: "rgb(var(--np-line-rgb) / <alpha-value>)",
        ok: "rgb(var(--np-ok-rgb) / <alpha-value>)",
        warn: "rgb(var(--np-warn-rgb) / <alpha-value>)",
        danger: "rgb(var(--np-danger-rgb) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        serif: ["var(--font-serif)"],
        logo: ["var(--font-logo)"],
        title: ["var(--font-title)"],
      },
      // AMALI: straight rectangles with a minimal radius; capsules stay rounded-full.
      borderRadius: { np: "var(--radius)", sm: "2px", DEFAULT: "3px", md: "3px", lg: "4px", xl: "4px", "2xl": "4px", "3xl": "6px" },
      boxShadow: { np: "var(--shadow)" },
      transitionTimingFunction: { np: "cubic-bezier(0,0,.2,1)" },
      transitionDuration: { np: "180ms" },
    },
  },
  plugins: [],
};
export default config;
