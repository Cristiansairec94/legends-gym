/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        crimson: {
          50: '#FFF1F2',
          100: '#FFE0E3',
          200: '#FFC2C9',
          300: '#FF8593',
          400: '#FF4757',
          500: '#E11D38',
          600: '#C8102E',
          700: '#9F0B24',
          800: '#7F091D',
          900: '#580614',
          950: '#2D040B',
        },
        gym: {
          bg: '#0D0E11',
          card: '#15161B',
          surface: '#1F2128',
          border: '#2E313B',
          accent: '#E11D38',
          accentHover: '#C8102E',
          gold: '#FF4757',
          text: '#F5F6F7',
          muted: '#9CA1AA',
          danger: '#EF4444',
          success: '#10B981',
          warning: '#F59E0B',
          info: '#3B82F6'
        }
      },
      boxShadow: {
        'glow-white': '0 0 25px -4px rgba(245, 246, 247, 0.28)',
        'glow-crimson': '0 0 25px -4px rgba(225, 29, 56, 0.5)',
        'glow-gold': '0 0 25px -4px rgba(225, 29, 56, 0.5)',
        'glow-green': '0 0 30px -5px rgba(16, 185, 129, 0.5)',
        'glow-red': '0 0 30px -5px rgba(239, 68, 68, 0.5)',
        'scanner': '0 0 22px 3px rgba(225, 29, 56, 0.6)',
      },
      animation: {
        'scan-line': 'scan 2s ease-in-out infinite alternate',
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar': 'radar 3s linear infinite',
      },
      keyframes: {
        scan: {
          '0%': { top: '5%', opacity: '0.8' },
          '100%': { top: '92%', opacity: '0.9' },
        },
        radar: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        }
      }
    },
  },
  plugins: [],
}
