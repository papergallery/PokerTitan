/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: { DEFAULT: '#1a1a1a', 2: '#242424' },
        accent: { DEFAULT: '#22c55e', hover: '#16a34a' },
        muted: '#a3a3a3',
        border: '#2a2a2a',
        table: '#1a3a2a',
      },
    },
  },
  plugins: [],
}
