/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        'spin': 'spin 1s linear infinite',
      },
      keyframes: {
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
      fontFamily: {
        sans: ['Suisse', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
        },
        secondary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#e8795a',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        }
      },
      backgroundColor: {
        dark: {
          DEFAULT: '#1f1f1f', // Main background
          surface: '#2a2a2a', // Card/elevated surface background
          input: '#2a2a2a', // Form inputs
          hover: '#3a3a3a', // Hover states
          active: '#4a4a4a', // Active/selected states
        }
      },
      textColor: {
        dark: {
          primary: '#F9FAFB', // Primary text
          secondary: '#D1D5DB', // Secondary text
          muted: '#9CA3AF', // Muted text
        }
      },
      borderColor: {
        dark: {
          DEFAULT: '#3a3a3a', // Default borders
          hover: '#4a4a4a', // Border hover states
        }
      },
      ringColor: {
        dark: {
          DEFAULT: '#3a3a3a',
          hover: '#4a4a4a',
        }
      }
    },
  },
  plugins: [],
};