import { defineConfig } from 'vite'

export default defineConfig({
  // index.html está en la raíz, Vite lo detecta automáticamente
  build: {
    outDir: 'dist',
  },
})
