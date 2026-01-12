import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
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
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Vendor chunks - rarely change, cached well
            if (id.includes('node_modules')) {
              if (id.includes('react-dom') || id.includes('react/')) {
                return 'vendor-react';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              if (id.includes('@google/genai')) {
                return 'vendor-ai';
              }
              // Other vendor libs
              return 'vendor-misc';
            }
            // App code splitting by feature
            if (id.includes('/modals/')) {
              return 'app-modals';
            }
            if (id.includes('/hooks/')) {
              return 'app-hooks';
            }
            if (id.includes('/utils/')) {
              return 'app-utils';
            }
            if (id.includes('/sections/')) {
              return 'app-sections';
            }
            if (id.includes('/scenes/')) {
              return 'app-scenes';
            }
            if (id.includes('/constants/')) {
              return 'app-constants';
            }
          }
        }
      },
      chunkSizeWarningLimit: 600, // 600KB limit
    }
  };
});
