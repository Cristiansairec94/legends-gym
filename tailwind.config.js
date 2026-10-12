/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gym: {
          bg: '#09090B',
          card: '#121215',
          surface: '#18181D',
          border: '#272730',
          accent: '#FFFFFF',
          accentHover: '#E4E4E7',
          gold: '#FFB800',
          text: '#F4F4F6',
          muted: '#A1A1AA',
          danger: '#EF4444',
          success: '#10B981',
          warning: '#F59E0B',
          info: '#3B82F6'
        }
      },
      boxShadow: {
        'glow-white': '0 0 25px -4px rgba(255, 255, 255, 0.35)',
        'glow-gold': '0 0 25px -4px rgba(245, 158, 11, 0.45)',
        'glow-green': '0 0 30px -5px rgba(16, 185, 129, 0.5)',
        'glow-red': '0 0 30px -5px rgba(239, 68, 68, 0.5)',
        'scanner': '0 0 22px 3px rgba(255, 255, 255, 0.65)',
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
