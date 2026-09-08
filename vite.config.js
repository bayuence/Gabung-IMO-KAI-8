import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Optimalkan chunk agar loading lebih cepat
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor'
          }
          if (id.includes('node_modules/pdf-lib')) {
            return 'pdfLib'
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'icons'
          }
        },
      },
    },
    // Tampilkan warning jika chunk terlalu besar (> 500KB)
    chunkSizeWarningLimit: 500,
  },
})
