-- ============= Fix function_search_path_mutable warnings =============
-- This migration adds search_path security to existing functions
-- Using conditional logic to only alter functions that exist

DO $$
DECLARE
  func_exists BOOLEAN;
  func_count INT;
BEGIN
  -- Add schema qualification and better error handling for all function checks

  -- 1. update_updated_at_column
  SELECT COUNT(*) FROM pg_proc 
  WHERE proname = 'update_updated_at_column' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  INTO func_count;
  
  IF func_count > 0 THEN
    EXECUTE 'ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for update_updated_at_column';
  ELSE
    RAISE NOTICE 'Function update_updated_at_column() not found, skipping';
  END IF;

  -- 2. cleanup_expired_verifications
  SELECT COUNT(*) FROM pg_proc 
  WHERE proname = 'cleanup_expired_verifications' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  INTO func_count;
  
  IF func_count > 0 THEN
    EXECUTE 'ALTER FUNCTION public.cleanup_expired_verifications() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for cleanup_expired_verifications';
  ELSE
    RAISE NOTICE 'Function cleanup_expired_verifications() not found, skipping';
  END IF;

  -- 3. cleanup_expired_password_tokens
  SELECT COUNT(*) FROM pg_proc 
  WHERE proname = 'cleanup_expired_password_tokens' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  INTO func_count;
  
  IF func_count > 0 THEN
    EXECUTE 'ALTER FUNCTION public.cleanup_expired_password_tokens() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for cleanup_expired_password_tokens';
  ELSE
    RAISE NOTICE 'Function cleanup_expired_password_tokens() not found, skipping';
  END IF;

  -- 4. get_driver_counts
  SELECT COUNT(*) FROM pg_proc 
  WHERE proname = 'get_driver_counts' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  INTO func_count;
  
  IF func_count > 0 THEN
    EXECUTE 'ALTER FUNCTION public.get_driver_counts() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for get_driver_counts';
  ELSE
    RAISE NOTICE 'Function get_driver_counts() not found, skipping';
  END IF;

  -- 5. check_password_reset_rate_limit
  SELECT COUNT(*) FROM pg_proc 
  WHERE proname = 'check_password_reset_rate_limit' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  INTO func_count;
  
  IF func_count > 0 THEN
    EXECUTE 'ALTER FUNCTION public.check_password_reset_rate_limit(TEXT) SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for check_password_reset_rate_limit';
  ELSE
    RAISE NOTICE 'Function check_password_reset_rate_limit(TEXT) not found, skipping';
  END IF;

  -- 6. normalize_email
  SELECT COUNT(*) FROM pg_proc 
  WHERE proname = 'normalize_email' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  INTO func_count;
  
  IF func_count > 0 THEN
    EXECUTE 'ALTER FUNCTION public.normalize_email(TEXT) SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for normalize_email';
  ELSE
    RAISE NOTICE 'Function normalize_email(TEXT) not found, skipping';
  END IF;

  -- 7. find_user_by_email
  SELECT COUNT(*) FROM pg_proc 
  WHERE proname = 'find_user_by_email' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  INTO func_count;
  
  IF func_count > 0 THEN
    EXECUTE 'ALTER FUNCTION public.find_user_by_email(TEXT) SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for find_user_by_email';
  ELSE
    RAISE NOTICE 'Function find_user_by_email(TEXT) not found, skipping';
  END IF;

  -- 8. Skip log_query_attempt since it was causing errors
  RAISE NOTICE 'Skipping log_query_attempt() as it was causing errors';

  -- 9. get_table_columns
  SELECT COUNT(*) FROM pg_proc 
  WHERE proname = 'get_table_columns' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  INTO func_count;
  
  IF func_count > 0 THEN
    EXECUTE 'ALTER FUNCTION public.get_table_columns() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for get_table_columns';
  ELSE
    RAISE NOTICE 'Function get_table_columns() not found, skipping';
  END IF;

  -- 10. get_user_feature_flags
  SELECT COUNT(*) FROM pg_proc 
  WHERE proname = 'get_user_feature_flags' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  INTO func_count;
  
  IF func_count > 0 THEN
    EXECUTE 'ALTER FUNCTION public.get_user_feature_flags() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for get_user_feature_flags';
  ELSE
    RAISE NOTICE 'Function get_user_feature_flags() not found, skipping';
  END IF;

  -- 11. toggle_driver_availability
  SELECT COUNT(*) FROM pg_proc 
  WHERE proname = 'toggle_driver_availability' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  INTO func_count;
  
  IF func_count > 0 THEN
    EXECUTE 'ALTER FUNCTION public.toggle_driver_availability() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for toggle_driver_availability';
  ELSE
    RAISE NOTICE 'Function toggle_driver_availability() not found, skipping';
  END IF;

  -- 12. set_driver_availability_admin
  SELECT COUNT(*) FROM pg_proc 
  WHERE proname = 'set_driver_availability_admin' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  INTO func_count;
  
  IF func_count > 0 THEN
    EXECUTE 'ALTER FUNCTION public.set_driver_availability_admin() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for set_driver_availability_admin';
  ELSE
    RAISE NOTICE 'Function set_driver_availability_admin() not found, skipping';
  END IF;

  -- 13. set_current_user_id
  SELECT COUNT(*) FROM pg_proc 
  WHERE proname = 'set_current_user_id' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  INTO func_count;
  
  IF func_count > 0 THEN
    EXECUTE 'ALTER FUNCTION public.set_current_user_id() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for set_current_user_id';
  ELSE
    RAISE NOTICE 'Function set_current_user_id() not found, skipping';
  END IF;

  -- 14. get_user_driver_id
  SELECT COUNT(*) FROM pg_proc 
  WHERE proname = 'get_user_driver_id' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  INTO func_count;
  
  IF func_count > 0 THEN
    EXECUTE 'ALTER FUNCTION public.get_user_driver_id() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for get_user_driver_id';
  ELSE
    RAISE NOTICE 'Function get_user_driver_id() not found, skipping';
  END IF;

  -- 15. is_partner
  SELECT COUNT(*) FROM pg_proc 
  WHERE proname = 'is_partner' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  INTO func_count;
  
  IF func_count > 0 THEN
    EXECUTE 'ALTER FUNCTION public.is_partner() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for is_partner';
  ELSE
    RAISE NOTICE 'Function is_partner() not found, skipping';
  END IF;

  -- 16. get_zone_multipliers_with_codes
  SELECT COUNT(*) FROM pg_proc 
  WHERE proname = 'get_zone_multipliers_with_codes' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  INTO func_count;
  
  IF func_count > 0 THEN
    EXECUTE 'ALTER FUNCTION public.get_zone_multipliers_with_codes() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for get_zone_multipliers_with_codes';
  ELSE
    RAISE NOTICE 'Function get_zone_multipliers_with_codes() not found, skipping';
  END IF;

  -- 17. submit_driver_for_verification
  SELECT COUNT(*) FROM pg_proc 
  WHERE proname = 'submit_driver_for_verification' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  INTO func_count;
  
  IF func_count > 0 THEN
    EXECUTE 'ALTER FUNCTION public.submit_driver_for_verification() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for submit_driver_for_verification';
  ELSE
    RAISE NOTICE 'Function submit_driver_for_verification() not found, skipping';
  END IF;

  -- 18. driver_exists
  SELECT COUNT(*) FROM pg_proc 
  WHERE proname = 'driver_exists' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  INTO func_count;
  
  IF func_count > 0 THEN
    EXECUTE 'ALTER FUNCTION public.driver_exists() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for driver_exists';
  ELSE
    RAISE NOTICE 'Function driver_exists() not found, skipping';
  END IF;

  -- 19. create_driver_profile
  SELECT COUNT(*) FROM pg_proc 
  WHERE proname = 'create_driver_profile' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  INTO func_count;
  
  IF func_count > 0 THEN
    EXECUTE 'ALTER FUNCTION public.create_driver_profile() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for create_driver_profile';
  ELSE
    RAISE NOTICE 'Function create_driver_profile() not found, skipping';
  END IF;

  -- 20. handle_new_user
  SELECT COUNT(*) FROM pg_proc 
  WHERE proname = 'handle_new_user' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  INTO func_count;
  
  IF func_count > 0 THEN
    EXECUTE 'ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for handle_new_user';
  ELSE
    RAISE NOTICE 'Function handle_new_user() not found, skipping';
  END IF;

  -- 21. is_admin
  SELECT COUNT(*) FROM pg_proc 
  WHERE proname = 'is_admin' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  INTO func_count;
  
  IF func_count > 0 THEN
    EXECUTE 'ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for is_admin';
  ELSE
    RAISE NOTICE 'Function is_admin() not found, skipping';
  END IF;

  -- 22. is_admin_by_id
  SELECT COUNT(*) FROM pg_proc 
  WHERE proname = 'is_admin_by_id' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  INTO func_count;
  
  IF func_count > 0 THEN
    EXECUTE 'ALTER FUNCTION public.is_admin_by_id() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for is_admin_by_id';
  ELSE
    RAISE NOTICE 'Function is_admin_by_id() not found, skipping';
  END IF;

  -- 23. debug_jwt
  SELECT COUNT(*) FROM pg_proc 
  WHERE proname = 'debug_jwt' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  INTO func_count;
  
  IF func_count > 0 THEN
    EXECUTE 'ALTER FUNCTION public.debug_jwt() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for debug_jwt';
  ELSE
    RAISE NOTICE 'Function debug_jwt() not found, skipping';
  END IF;

  -- 24. log_pricing_change
  SELECT COUNT(*) FROM pg_proc 
  WHERE proname = 'log_pricing_change' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  INTO func_count;
  
  IF func_count > 0 THEN
    EXECUTE 'ALTER FUNCTION public.log_pricing_change() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for log_pricing_change';
  ELSE
    RAISE NOTICE 'Function log_pricing_change() not found, skipping';
  END IF;
END $$;