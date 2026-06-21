/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{svelte,js,ts}'],
  theme: {
    extend: {
      colors: {
        arcane: {
          bg:       '#0b0814',
          panel:    '#15101f',
          panel2:   '#1d1530',
          border:   '#3a2a55',
          accent:   '#a855f7',
          accent2:  '#c084fc',
          gold:     '#f5c25b',
          ruby:     '#ef4444',
          topaz:    '#facc15',
          jade:     '#22c55e',
          sapphire: '#3b82f6',
          amber:    '#f59e0b',
          emerald:  '#10b981'
        }
      },
      fontFamily: {
        display: ['"Cinzel"', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
