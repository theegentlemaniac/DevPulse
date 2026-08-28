/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#0a0a0f",
        panel: "#12121a",
        accent: "#22d3ee",
      },
    },
  },
  plugins: [],
};
