import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'neon-green': '#00ff41',
        danger: '#ff0000',
        void: '#0a0a0a',
      },
    },
  },
  plugins: [],
};

export default config;
