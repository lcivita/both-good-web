/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'barrio': ['Barrio', 'serif'],
        '8bit': ['Pixelify Sans', 'monospace'],
      },
      animation: {
        'jiggle': 'jiggle 3s infinite ease-in-out',
      },
      keyframes: {
        jiggle: {
          '0%': { transform: 'translateY(0)' },
          '25%': { transform: 'translateY(-1px)' },
          '50%': { transform: 'translateY(1px)' },
          '75%': { transform: 'translateY(-1px)' },
          '100%': { transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}

