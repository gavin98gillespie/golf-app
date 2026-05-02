/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'bg-base': '#08100c',
        'bg-surface': '#0f1814',
        'bg-elevated': '#0a120e',
        'border-subtle': '#1c2a23',
        'text-primary': '#f0efe8',
        'text-secondary': '#7a8a82',
        'text-muted': '#4a5a52',
        accent: '#4ade80',
        'accent-soft': 'rgba(74, 222, 128, 0.06)',
      },
      fontFamily: {
        sans: ['Inter_400Regular'],
        medium: ['Inter_500Medium'],
        semibold: ['Inter_600SemiBold'],
        bold: ['Inter_700Bold'],
        light: ['Inter_300Light'],
      },
    },
  },
  plugins: [],
};
