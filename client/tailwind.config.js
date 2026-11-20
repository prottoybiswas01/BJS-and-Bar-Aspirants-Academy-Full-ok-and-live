/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
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
        },
        navy: {
          950: '#020617',
          900: '#0F172A',
          850: '#151F32',
          800: '#1E293B',
          700: '#334155',
          600: '#475569',
        },
        gold: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        obsidian: {
          950: '#05080F',
          900: '#090D16',
          850: '#0F1420',
          800: '#111827',
          700: '#1F2937',
        },
        alabaster: {
          50: '#FAFAFA',
          100: '#F8FAFC',
          200: '#F1F5F9',
          300: '#E2E8F0',
        }
      },
      fontFamily: {
        sans: ['"Hind Siliguri"', '"Plus Jakarta Sans"', '"Noto Sans Bengali"', 'Inter', 'system-ui', 'sans-serif'],
        bengali: ['"Hind Siliguri"', '"Noto Sans Bengali"', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', '"Hind Siliguri"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
