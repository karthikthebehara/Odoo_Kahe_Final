/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
      colors: {
        gray: {
          950: '#030712',
        },
        'cafe-cream': '#FDFBF7',
        'cafe-espresso': '#1A110B',
        'cafe-latte': '#C2A688',
        'cafe-matcha': '#4B6043',
        'cafe-terracotta': '#D07A56',
      },
      borderWidth: {
        3: '3px',
      },
      animation: {
        'pulse-slow': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-fast': 'spin 0.6s linear infinite',
      },
    },
  },
  plugins: [],
};
