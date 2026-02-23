/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gym: {
          bg: '#0a0a0f',
          surface: '#12121a',
          card: '#1a1a28',
          border: '#2a2a3d',
          hover: '#222235',
          accent: '#00d4aa',
          'accent-hover': '#00e8bb',
          'accent-dim': 'rgba(0, 212, 170, 0.1)',
          warning: '#f5a623',
          danger: '#ef4444',
          info: '#3b82f6',
          text: '#e8e8ef',
          'text-secondary': '#8888a0',
          'text-muted': '#55556a',
        }
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}
