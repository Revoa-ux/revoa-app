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
        sans: ['Inter var', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
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
          DEFAULT: '#111827', // Main background
          surface: '#1F2937', // Card/elevated surface background
          input: '#1F2937', // Form inputs
          hover: '#374151', // Hover states
          active: '#4B5563', // Active/selected states
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
          DEFAULT: '#374151', // Default borders
          hover: '#4B5563', // Border hover states
        }
      },
      ringColor: {
        dark: {
          DEFAULT: '#374151',
          hover: '#4B5563',
        }
      }
    },
  },
  plugins: [],
};