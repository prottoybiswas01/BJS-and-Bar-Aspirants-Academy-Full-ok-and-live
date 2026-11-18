// Existing views use dark surface utilities and pale type utilities.
// Adapt surfaces and foregrounds independently so status hues remain meaningful.
const status = {
  amber: ['#473ead','#efedff'], blue: ['#344ca6','#edf2ff'],
  cyan: ['#116581','#e6f4f8'], emerald: ['#126246','#e6f4ed'],
  green: ['#17603f','#eaf5ec'], red: ['#a02c3c','#fff0ef'],
  rose: ['#a43155','#ffedf1'], purple: ['#684294','#f4eefb'],
  orange: ['#8c4316','#fff0df'], yellow: ['#795418','#fff4d9'],
  indigo: ['#4b4199','#f0eeff'], teal: ['#196a65','#e6f4f2']
};
const tones = (make) => Object.fromEntries(Object.entries(status).map(([name,[ink,pale]]) => [name,make(ink,pale)]));
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backgroundColor: {
        slate: {950:'#f4f5fa',900:'#ffffff',800:'#eaedf5',700:'#dce1ef',600:'#c8cedf'},
        ...tones((ink,pale) => ({950:pale,900:pale,800:pale,700:ink,600:ink,500:ink,400:ink}))
      },
      textColor: {
        white:'#18203a', slate:{50:'#18203a',100:'#252d48',200:'#333c56',300:'#47516a',400:'#535f76',500:'#606b80',950:'#ffffff'},
        ...tones(ink => ({100:ink,200:ink,300:ink,400:ink,500:ink}))
      },
      borderColor: {slate:{950:'#d5d9e5',900:'#d8dce7',800:'#d7dce8',700:'#c4ccdc',600:'#a9b3ca'}},
      gradientColorStops: {
        slate:{950:'#f0f2fa',900:'#fff',800:'#f0f2fa'},
        ...tones((ink,pale) => ({950:pale,900:pale,800:pale,700:ink,600:ink,500:ink,400:ink,300:ink}))
      },
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
