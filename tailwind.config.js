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
          bg: '#0B0D13',
          card: '#131722',
          surface: '#1B2030',
          border: '#272E44',
          accent: '#FFB800',
          accentHover: '#E5A500',
          text: '#F3F4F6',
          muted: '#9CA3AF',
          danger: '#EF4444',
          success: '#10B981',
          warning: '#F59E0B',
          info: '#3B82F6'
        }
      },
      boxShadow: {
        'glow-gold': '0 0 25px -5px rgba(255, 184, 0, 0.4)',
        'glow-green': '0 0 30px -5px rgba(16, 185, 129, 0.5)',
        'glow-red': '0 0 30px -5px rgba(239, 68, 68, 0.5)',
        'scanner': '0 0 20px 2px rgba(255, 184, 0, 0.6)',
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
