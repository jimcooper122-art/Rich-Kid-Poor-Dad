/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Luckiest Guy"', 'cursive'],
        body: ['Fredoka', 'sans-serif'],
      },
      colors: {
        // MindMoney palette — Mr Beast energy, not cozy storybook
        money: {
          DEFAULT: '#16a34a',
          bright: '#22c55e',
          glow: '#86efac',
        },
        electric: {
          blue: '#0ea5e9',
          orange: '#fb923c',
          yellow: '#facc15',
        },
        ink: {
          DEFAULT: '#0f172a',
          soft: '#1e293b',
        },
      },
      boxShadow: {
        'pop': '0 8px 0 0 rgba(0,0,0,0.25)',
        'pop-sm': '0 4px 0 0 rgba(0,0,0,0.25)',
        'glow-money': '0 0 40px rgba(34,197,94,0.6)',
        'glow-electric': '0 0 40px rgba(14,165,233,0.6)',
      },
      animation: {
        'bounce-in': 'bounce-in 0.5s ease-out',
        'cash-pop': 'cash-pop 0.6s ease-out',
        'shake': 'shake 0.4s ease-in-out',
        'float-up': 'float-up 1s ease-out forwards',
      },
      keyframes: {
        'bounce-in': {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'cash-pop': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.4)', color: '#22c55e' },
          '100%': { transform: 'scale(1)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-6px)' },
          '75%': { transform: 'translateX(6px)' },
        },
        'float-up': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-80px)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
