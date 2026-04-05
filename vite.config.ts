import { defineConfig } from 'vite'

export default defineConfig({
  root: 'frontend',
  base: process.env.GITHUB_ACTIONS ? '/liminal/' : '/',
  server: {
    port: 3000,
  },
})
