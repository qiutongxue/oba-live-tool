/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      keyframes: {
        'toast-slide-down': {
          '0%': { transform: 'translate(-50%, -100%)' },
          '100%': { transform: 'translate(-50%, 0)' },
        },
      },
      animation: {
        'toast-slide-down': 'toast-slide-down 0.3s ease-out forwards',
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
}
