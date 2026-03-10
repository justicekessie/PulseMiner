/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Ghana flag colours as accent palette
        'gh-red': '#CE1126',
        'gh-gold': '#FCD116',
        'gh-green': '#006B3F',
        'gh-star': '#000000',
        // PulseMiner semantic
        'pulse-blue': '#2563EB',
        'pulse-teal': '#0D9488',
        'pulse-amber': '#D97706',
        'pulse-rose': '#E11D48',
        'pulse-violet': '#7C3AED',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
