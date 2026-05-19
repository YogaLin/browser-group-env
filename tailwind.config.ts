import type { Config } from "tailwindcss";

export default {
  content: ["./entrypoints/**/*.{ts,tsx,html}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        notion: {
          primary: "#5645d4",
          navy: "#0a1530",
          navyDeep: "#070f24",
          ink: "#1a1a1a",
          charcoal: "#37352f",
          slate: "#5d5b54",
          steel: "#787671",
          surface: "#f6f5f4",
          soft: "#fafaf9",
          hairline: "#e5e3df",
          peach: "#ffe8d4",
          rose: "#fde0ec",
          mint: "#d9f3e1",
          lavender: "#e6e0f5",
          sky: "#dcecfa",
          yellow: "#f9e79f",
          orange: "#dd5b00",
          brown: "#523410",
          green: "#1aae39",
          teal: "#2a9d99"
        }
      },
      boxShadow: {
        workspace: "0 24px 48px -8px rgba(15, 15, 15, 0.22)"
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      }
    }
  },
  plugins: []
} satisfies Config;
