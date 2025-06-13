import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your configuration.');
  
  if (import.meta.env.DEV) {
    throw new Error(
      'Supabase URL or Anon Key is missing. Please make sure you have connected to Supabase and have the correct environment variables set up.'
    );
  }
}

// Regular client with anon key for normal operations
export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

// Create a service role client for admin operations (bypassing RLS)
export const createServiceRoleClient = () => {
  if (!supabaseServiceRoleKey) {
    console.warn('Service role key missing - admin operations will fail');
    // Return regular client as fallback
    return supabase;
  }

  return createClient<Database>(
    supabaseUrl || '',
    supabaseServiceRoleKey,
    {
      auth: {
        persistSession: false
      }
    }
  );
};

// Export a pre-created instance for convenience (but be careful with usage)
export const supabaseAdmin = createServiceRoleClient();