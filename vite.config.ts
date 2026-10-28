import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin'

export default defineConfig({
  plugins: [
    tanstackStart(),
  ],
})
