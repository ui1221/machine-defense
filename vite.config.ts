import { defineConfig } from 'vite'

export default defineConfig({
  base: '/machine-defense/',
  server: { port: parseInt(process.env.PORT || '5173') },
  build: { target: 'es2020' }
})
