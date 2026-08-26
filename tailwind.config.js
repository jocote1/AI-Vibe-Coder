/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#090a0f',
        card: '#10131c',
        'card-foreground': '#f3f4f6',
        primary: {
          DEFAULT: '#6366f1',
          foreground: '#ffffff',
          hover: '#4f46e5',
        },
        secondary: {
          DEFAULT: '#1e2333',
          foreground: '#cbd5e1',
        },
        accent: {
          DEFAULT: '#a855f7',
          foreground: '#ffffff',
        },
        neon: {
          purple: '#c084fc',
          cyan: '#22d3ee',
          pink: '#f43f5e',
          green: '#10b981',
          amber: '#f59e0b',
        },
        border: '#1e2436',
        input: '#151928',
        ring: '#6366f1',
      },
      fontFamily: {
        mono: ['Fira Code', 'JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -5px rgba(34, 211, 238, 0.3)',
        'glow-purple': '0 0 20px -5px rgba(192, 132, 252, 0.3)',
        'glow-pink': '0 0 20px -5px rgba(244, 63, 94, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(99, 102, 241, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.6)' },
        },
      },
    },
  },
  plugins: [],
};
