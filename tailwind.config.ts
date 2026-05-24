import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#0B0F14',
        panel: '#101720',
        ink: '#E7EEF8',
        muted: '#8C9AAA',
        lime: '#C7F464',
        seam: '#2ED3B7',
        danger: '#FF6B6B'
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(199,244,100,0.12), 0 24px 80px rgba(0,0,0,0.35)'
      }
    }
  },
  plugins: []
};

export default config;
