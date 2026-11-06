import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: { colors: { sukoon: { ink: "#171512", cream: "#F5F0E8", coffee: "#8B5E3C", sage: "#8A9278" } } } },
  plugins: []
};
export default config;
