/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'osint-black': '#050505',
        'osint-dark': '#111315',
        'osint-cyan': '#00ffff',
        'osint-cyan-glow': 'rgba(0, 255, 255, 0.5)',
        'osint-green': '#39ff14', 
        'osint-amber': '#ffb000',
        'osint-panel': 'rgba(10, 15, 20, 0.85)',
      },
      fontFamily: {
        mono: ['"Space Mono"', 'monospace'],
        sans: ['"Space Mono"', 'monospace'], // Force all text to mono
      },
      boxShadow: {
        'cyan-glow': '0 0 10px rgba(0, 255, 255, 0.3)',
      }
    },
  },
  plugins: [],
}
