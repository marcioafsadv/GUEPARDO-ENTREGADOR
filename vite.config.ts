import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Guepardo Entregador',
        short_name: 'Guepardo',
        description: 'Aplicativo para entregadores do Papaléguas Delivery',
        theme_color: '#FF6B00',
        background_color: '#121212',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  base: '/', // Base URL para produção
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false, // Desabilita sourcemaps em produção
    minify: 'esbuild', // Minificação padrão (mais rápida)
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