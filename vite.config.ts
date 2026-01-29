import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        // Redirect @google/genai to our compatibility shim
        '@google/genai': path.resolve(__dirname, './utils/shims/googleGenai.ts')
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Supabase is large and self-contained
            if (id.includes('node_modules')) {
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
            }
            // App code splitting - only for non-critical paths
            if (id.includes('/modals/')) {
              return 'app-modals';
            }
          }
        }
      },
      chunkSizeWarningLimit: 800, // Increase limit since we're bundling more together
    }
  };
});
