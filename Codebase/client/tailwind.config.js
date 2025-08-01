/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Add custom colors if needed
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false, // This disables Tailwind's base/reset styles
  },
  important: false,
};
