import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isAnalyze = mode === 'analyze';
  
  return {
    plugins: [
      react(),
      // Brotli compression (better than gzip for modern browsers)
      viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
      }),
      // Regular gzip compression for older browsers
      viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
      }),
      // Bundle analyzer in analyze mode
      isAnalyze && visualizer({
        open: true,
        filename: 'stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
    ],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    build: {
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Core React libraries in one chunk
            if (id.includes('node_modules/react/') || 
                id.includes('node_modules/react-dom/')) {
              return 'react-vendor';
            }
            
            // Router in separate chunk
            if (id.includes('node_modules/react-router') ||
                id.includes('node_modules/history')) {
              return 'router-vendor';
            }
            
            // UI libraries in one chunk
            if (id.includes('node_modules/lucide-react') || 
                id.includes('node_modules/framer-motion')) {
              return 'ui-vendor';
            }
            
            // Analytics and monitoring in one chunk
            if (id.includes('node_modules/react-ga4') || 
                id.includes('node_modules/web-vitals')) {
              return 'analytics-vendor';
            }
            
            // Date related libraries
            if (id.includes('node_modules/date-fns') ||
                id.includes('node_modules/react-day-picker')) {
              return 'date-vendor';
            }
            
            // Radix UI components
            if (id.includes('node_modules/@radix-ui')) {
              return 'radix-vendor';
            }
            
            // Supabase
            if (id.includes('node_modules/@supabase')) {
              return 'supabase-vendor';
            }
          },
        },
      },
      target: 'es2020', // Modern target for smaller bundles
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1000,
      assetsInlineLimit: 4096, // 4kb - inline assets smaller than this
      minify: 'terser', // Use terser for better minification
      terserOptions: {
        compress: {
          drop_console: mode === 'production', // Remove console logs in production
          drop_debugger: mode === 'production'
        }
      }
    },
    server: {
      port: 3000,
      open: true,
      cors: true,
    },
    preview: {
      port: 4000,
      open: true,
    },
    define: {
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      'process.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(env.VITE_GOOGLE_MAPS_API_KEY),
      'process.env.VITE_GA_MEASUREMENT_ID': JSON.stringify(env.VITE_GA_MEASUREMENT_ID),
    }
  };
});