/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        black: '#000000',
        charcoal: '#1a1a1a',
        white: '#ffffff',
        'solar-yellow': '#ffd700',
      },
      fontFamily: {
        primary: ['Poppins', 'sans-serif'],
        f37moon: ['F37Moon', 'sans-serif'],
      },
    },
  },
  plugins: [],
};


