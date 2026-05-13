import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        sidebar: '#1e293b',
        accent: {
          DEFAULT: '#f59e0b',
          dark: '#d97706',
        },
      },
    },
  },
  plugins: [],
}

export default config
