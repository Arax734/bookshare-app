import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primaryColor)",
          light: "var(--primaryColorLight)",
          lightMax: "var(--primaryColorLightMax)",
        },
        secondary: {
          DEFAULT: "var(--secondaryColor)",
          light: "var(--secondaryColorLight)",
          dark: "var(--secondaryColorDark)",
        },
      },
      fontFamily: {
        montserrat: ["var(--font-montserrat)"],
      },
      screens: {
        xs: "475px",
      },
      keyframes: {
        "pulse-scale": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.2)" },
        },
      },
      animation: {
        "pulse-scale": "pulse-scale 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
