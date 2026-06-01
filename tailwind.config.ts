import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        tactile: "0 18px 28px -18px rgba(80, 68, 54, 0.45), inset 0 1px 0 rgba(255,255,255,0.75)",
        button: "0 11px 0 #d68972, 0 22px 30px -18px rgba(93, 73, 55, 0.7), inset 0 1px 0 rgba(255,255,255,0.72)",
        mint: "0 11px 0 #77afa6, 0 22px 30px -18px rgba(50, 91, 86, 0.55), inset 0 1px 0 rgba(255,255,255,0.76)",
        insetSoft: "inset 8px 8px 18px rgba(157, 138, 112, 0.14), inset -8px -8px 18px rgba(255,255,255,0.74)",
      },
    },
  },
  plugins: [],
};

export default config;
