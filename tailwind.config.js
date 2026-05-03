/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Linksman primitives
        ink: '#0E1410',
        bone: '#F4F0E6',
        fairway: '#2D4A36',
        sage: '#9BB89A',
        brass: '#B8924A',
        clay: '#B94A3B',
        graphite: '#1A2520',
        // Backwards-compat aliases — same key names as before, new values
        'bg-base': '#0E1410',
        'bg-surface': '#1A2520',
        'bg-elevated': '#1A2520',
        'border-subtle': '#F4F0E61F',
        'text-primary': '#F4F0E6',
        'text-secondary': '#F4F0E699',
        'text-muted': '#F4F0E666',
        accent: '#9BB89A',
        'accent-soft': '#9BB89A26',
      },
      fontFamily: {
        display: ['Fraunces_300Light'],
        'display-italic': ['Fraunces_300Light_Italic'],
        editorial: ['Fraunces_400Regular'],
        mono: ['JetBrainsMono_500Medium'],
        'mono-bold': ['JetBrainsMono_600SemiBold'],
      },
    },
  },
  plugins: [],
};
