import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'https://api.revoa.app',
          changeOrigin: true,
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              // Add origin to proxied request
              proxyReq.setHeader('origin', env.VITE_APP_URL || 'https://members.revoa.app');
            });
          }
        }
      },
      cors: {
        origin: [
          'https://members.revoa.app',
          'http://localhost:5173',
          'https://*.myshopify.com',
          'https://*.shopify.com',
          'https://*.supabase.co'
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
          'Content-Type',
          'Authorization',
          'X-Requested-With',
          'apikey',
          'X-Client-Info',
          'X-Shopify-Access-Token',
          'X-Shopify-Shop-Domain'
        ],
        credentials: true,
        preflightContinue: false,
        optionsSuccessStatus: 204
      }
    },
    build: {
      target: 'es2020',
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode === 'development',
      minify: mode === 'production',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['lucide-react', '@supabase/supabase-js', 'sonner'],
            'chart-vendor': ['recharts']
          }
        }
      }
    }
  };
});