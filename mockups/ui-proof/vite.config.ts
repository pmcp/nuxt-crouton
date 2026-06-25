import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'

export default defineConfig({
  plugins: [vue(), ui()],
  // base:'./' so the built dist works when served from a subpath or file://
  base: './'
})
