import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "rgb(var(--np-navy-rgb) / <alpha-value>)", 2: "rgb(var(--np-navy-2-rgb) / <alpha-value>)", card: "#14243A", line: "#1E3049" },
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
        noche: "#0E1A2B",
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
      // Brisa (048): soft corners — controls 12px, cards and photos 16px, map and large panels 24px.
      borderRadius: { np: "var(--radius)", sm: "8px", DEFAULT: "12px", md: "12px", lg: "16px", xl: "16px", "2xl": "20px", "3xl": "24px" },
      // Flat by default; the one "float" shadow is for menus, dialogs, sheets and the sticky rail.
      boxShadow: { np: "var(--shadow)", float: "var(--np-float)" },
      transitionTimingFunction: { np: "cubic-bezier(.2,.7,.2,1)" },
      transitionDuration: { np: "180ms" },
    },
  },
  plugins: [],
};
export default config;
