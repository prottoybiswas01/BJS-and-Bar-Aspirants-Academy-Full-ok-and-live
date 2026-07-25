/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        legal: {
          900: '#0b1325',
          800: '#14213d',
          700: '#1e2942',
          gold: '#d4af37',
          amber: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['"Hind Siliguri"', '"Noto Sans Bengali"', '"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        bengali: ['"Hind Siliguri"', '"Noto Sans Bengali"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
