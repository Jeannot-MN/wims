import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/app/**/*.{ts,tsx}", "./src/web/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        cream: "#fbf7f1",
        rose: "#c08081",
        sage: "#8aa088",
        oat: "#f3ece1",
        nude: "#e7d8c5",
        orchid: "#b89cb1",
        blush: "#e9c9c9",
        wine: "#6b2a3a",
      },
      fontFamily: {
        display: ["var(--font-display)", "Cormorant Garamond", "serif"],
        body: ["var(--font-body)", "Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.9s ease-out both",
        "fade-in": "fade-in 1.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
