/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
      },
      colors: {
        brand: {
          amber: '#f59e0b',
          amberDim: 'rgba(245,158,11,0.15)',
          amberBorder: 'rgba(245,158,11,0.3)',
          bg: '#0f1923',
          card: '#1a2535',
          cardHover: '#1f2e42',
          border: '#2a3f5f',
          borderHover: '#3a5070',
          muted: 'rgba(255,255,255,0.45)',
          subtle: 'rgba(255,255,255,0.2)',
        },
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
      },
    },
  },
  plugins: [],
};