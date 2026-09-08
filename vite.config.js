import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Optimalkan chunk agar loading lebih cepat
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          pdfLib: ['pdf-lib'],
          icons: ['lucide-react'],
        },
      },
    },
    // Tampilkan warning jika chunk terlalu besar (> 500KB)
    chunkSizeWarningLimit: 500,
  },
})
