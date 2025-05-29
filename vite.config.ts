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
        // Simplified chunking strategy to avoid dynamic import issues
        output: {
          manualChunks: {
            'react-core': ['react', 'react-dom'],
            'router': ['react-router-dom', 'react-router'],
            'ui': ['lucide-react', 'framer-motion'],
          }
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
      proxy: {
        // Proxy Edge Function requests to avoid CORS issues during development
        '/api/email-verification': {
          target: 'https://phcqdnzuicgmlhkmnpxc.supabase.co/functions/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          headers: {
            'Origin': 'http://localhost:3000'
          },
        }
      }
    },
    preview: {
      port: 4000,
      open: true,
    },
    define: {
      // Include all environment variables in the client build
      'import.meta.env.WEBHOOK_SECRET': JSON.stringify(env.WEBHOOK_SECRET || ''),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(env.VITE_GOOGLE_MAPS_API_KEY),
      'import.meta.env.VITE_GA_MEASUREMENT_ID': JSON.stringify(env.VITE_GA_MEASUREMENT_ID),
    }
  };
});