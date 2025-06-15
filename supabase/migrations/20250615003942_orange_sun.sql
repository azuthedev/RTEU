/*
  # Set search_path for functions to enhance security
  
  1. Changes
    - Sets `search_path = public, pg_temp` for all existing functions
    - Uses a dynamic approach to avoid errors with non-existent functions
    - Properly checks function existence with argument count and schema
    
  2. Security Benefits
    - Prevents search path injection attacks
    - Ensures functions only use tables from expected schemas
*/

-- Use a more robust approach that completely avoids executing ALTER statements 
-- on non-existent functions
DO $$
DECLARE
  func RECORD;
  function_list TEXT[] := ARRAY[
    'update_updated_at_column',
    'cleanup_expired_verifications',
    'cleanup_expired_password_tokens',
    'get_driver_counts',
    'check_password_reset_rate_limit',
    'normalize_email',
    'find_user_by_email',
    'toggle_driver_availability',
    'set_driver_availability_admin',
    'set_current_user_id',
    'get_user_driver_id',
    'is_partner',
    'get_zone_multipliers_with_codes',
    'submit_driver_for_verification',
    'driver_exists',
    'create_driver_profile',
    'handle_new_user',
    'is_admin',
    'is_admin_by_id',
    'debug_jwt',
    'log_pricing_change'
  ];
  
  -- Explicitly excluding problematic functions
  skip_functions TEXT[] := ARRAY[
    'get_table_columns',  -- Known to not exist
    'log_query_attempt',  -- Known to not exist
    'get_user_feature_flags', -- Known to not exist
    'run_sql_query'       -- Known to not exist
  ];
BEGIN
  -- Loop through all functions in public schema
  FOR func IN 
    SELECT p.proname as name, 
           pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = ANY(function_list)
    AND p.proname != ALL(skip_functions)
  LOOP
    -- Generate and execute ALTER statement for each existing function
    BEGIN
      IF func.args = '' THEN
        -- No arguments function
        EXECUTE format('ALTER FUNCTION public.%I() SET search_path = public, pg_temp', func.name);
      ELSE
        -- Function with arguments
        EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp', 
                       func.name, func.args);
      END IF;
      
      RAISE NOTICE 'Fixed search_path for %(%)', func.name, func.args;
    EXCEPTION WHEN OTHERS THEN
      -- Catch any errors and continue
      RAISE NOTICE 'Error fixing search_path for %(%): %', func.name, func.args, SQLERRM;
    END;
  END LOOP;
  
  -- Report skipped functions
  FOREACH func.name IN ARRAY skip_functions
  LOOP
    RAISE NOTICE 'Skipped function % - excluded from processing', func.name;
  END LOOP;
  
  RAISE NOTICE 'Search path security update completed';
END $$;