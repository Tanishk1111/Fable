import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        lcd: ["var(--font-vt323)", "monospace"],
        handwritten: ["var(--font-caveat)", "cursive"],
      },
      colors: {
        amp: {
          red: "#ff2a2a",
          glow: "#ff4444",
        },
        pager: {
          green: "#7cfc00",
          screen: "#0a1a0a",
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 8px #ff2a2a, 0 0 16px #ff2a2a66" },
          "50%": { boxShadow: "0 0 20px #ff4444, 0 0 40px #ff444488" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
