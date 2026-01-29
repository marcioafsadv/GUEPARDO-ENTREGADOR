import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Base URL para produção
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false, // Desabilita sourcemaps em produção
    minify: 'terser', // Minificação otimizada
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
          'leaflet': ['leaflet']
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
});