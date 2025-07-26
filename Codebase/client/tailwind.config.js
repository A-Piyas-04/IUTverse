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
  // Ensure important is not set to true, which can cause issues
  important: false,
};
