/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0f4ff",
          100: "#dce7ff",
          200: "#b9cffe",
          300: "#89abfd",
          400: "#537dfb",
          500: "#2d52f8",
          600: "#1a32ee",
          700: "#1626da",
          800: "#1820b0",
          900: "#1a208a",
          950: "#131455",
        },
      },
    },
  },
  plugins: [],
};
