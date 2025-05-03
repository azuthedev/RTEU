/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_GA_MEASUREMENT_ID: string;
  readonly VITE_IMAGE_CDN_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}