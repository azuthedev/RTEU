-- ============= Fix function_search_path_mutable warnings =============
-- This migration adds search_path security to existing functions
-- Using conditional logic to only alter functions that exist

DO $$
DECLARE
  func_exists BOOLEAN;
BEGIN
  -- 1. update_updated_at_column
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') INTO func_exists;
  IF func_exists THEN
    EXECUTE 'ALTER FUNCTION update_updated_at_column() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for update_updated_at_column';
  END IF;

  -- 2. cleanup_expired_verifications
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'cleanup_expired_verifications') INTO func_exists;
  IF func_exists THEN
    EXECUTE 'ALTER FUNCTION cleanup_expired_verifications() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for cleanup_expired_verifications';
  END IF;

  -- 3. cleanup_expired_password_tokens
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'cleanup_expired_password_tokens') INTO func_exists;
  IF func_exists THEN
    EXECUTE 'ALTER FUNCTION cleanup_expired_password_tokens() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for cleanup_expired_password_tokens';
  END IF;

  -- 4. get_driver_counts
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_driver_counts') INTO func_exists;
  IF func_exists THEN
    EXECUTE 'ALTER FUNCTION get_driver_counts() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for get_driver_counts';
  END IF;

  -- 5. check_password_reset_rate_limit
  SELECT EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'check_password_reset_rate_limit' 
    AND pronargs = 1
  ) INTO func_exists;
  IF func_exists THEN
    EXECUTE 'ALTER FUNCTION check_password_reset_rate_limit(TEXT) SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for check_password_reset_rate_limit';
  END IF;

  -- 6. normalize_email
  SELECT EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'normalize_email' 
    AND pronargs = 1
  ) INTO func_exists;
  IF func_exists THEN
    EXECUTE 'ALTER FUNCTION normalize_email(TEXT) SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for normalize_email';
  END IF;

  -- 7. find_user_by_email
  SELECT EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'find_user_by_email' 
    AND pronargs = 1
  ) INTO func_exists;
  IF func_exists THEN
    EXECUTE 'ALTER FUNCTION find_user_by_email(TEXT) SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for find_user_by_email';
  END IF;

  -- 8. log_query_attempt
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'log_query_attempt') INTO func_exists;
  IF func_exists THEN
    EXECUTE 'ALTER FUNCTION log_query_attempt() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for log_query_attempt';
  END IF;

  -- 9. get_table_columns
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_table_columns') INTO func_exists;
  IF func_exists THEN
    EXECUTE 'ALTER FUNCTION get_table_columns() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for get_table_columns';
  END IF;

  -- 10. get_user_feature_flags
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_user_feature_flags') INTO func_exists;
  IF func_exists THEN
    EXECUTE 'ALTER FUNCTION get_user_feature_flags() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for get_user_feature_flags';
  END IF;

  -- 11. toggle_driver_availability
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'toggle_driver_availability') INTO func_exists;
  IF func_exists THEN
    EXECUTE 'ALTER FUNCTION toggle_driver_availability() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for toggle_driver_availability';
  END IF;

  -- 12. set_driver_availability_admin
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'set_driver_availability_admin') INTO func_exists;
  IF func_exists THEN
    EXECUTE 'ALTER FUNCTION set_driver_availability_admin() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for set_driver_availability_admin';
  END IF;

  -- 13. set_current_user_id
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'set_current_user_id') INTO func_exists;
  IF func_exists THEN
    EXECUTE 'ALTER FUNCTION set_current_user_id() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for set_current_user_id';
  END IF;

  -- 14. get_user_driver_id
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_user_driver_id') INTO func_exists;
  IF func_exists THEN
    EXECUTE 'ALTER FUNCTION get_user_driver_id() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for get_user_driver_id';
  END IF;

  -- 15. is_partner
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'is_partner') INTO func_exists;
  IF func_exists THEN
    EXECUTE 'ALTER FUNCTION is_partner() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for is_partner';
  END IF;

  -- 16. get_zone_multipliers_with_codes
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_zone_multipliers_with_codes') INTO func_exists;
  IF func_exists THEN
    EXECUTE 'ALTER FUNCTION get_zone_multipliers_with_codes() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for get_zone_multipliers_with_codes';
  END IF;

  -- 17. submit_driver_for_verification
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'submit_driver_for_verification') INTO func_exists;
  IF func_exists THEN
    EXECUTE 'ALTER FUNCTION submit_driver_for_verification() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for submit_driver_for_verification';
  END IF;

  -- 18. driver_exists
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'driver_exists') INTO func_exists;
  IF func_exists THEN
    EXECUTE 'ALTER FUNCTION driver_exists() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for driver_exists';
  END IF;

  -- 19. create_driver_profile
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'create_driver_profile') INTO func_exists;
  IF func_exists THEN
    EXECUTE 'ALTER FUNCTION create_driver_profile() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for create_driver_profile';
  END IF;

  -- 20. handle_new_user
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') INTO func_exists;
  IF func_exists THEN
    EXECUTE 'ALTER FUNCTION handle_new_user() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for handle_new_user';
  END IF;

  -- 21. is_admin
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'is_admin') INTO func_exists;
  IF func_exists THEN
    EXECUTE 'ALTER FUNCTION is_admin() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for is_admin';
  END IF;

  -- 22. is_admin_by_id
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'is_admin_by_id') INTO func_exists;
  IF func_exists THEN
    EXECUTE 'ALTER FUNCTION is_admin_by_id() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for is_admin_by_id';
  END IF;

  -- 23. debug_jwt
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'debug_jwt') INTO func_exists;
  IF func_exists THEN
    EXECUTE 'ALTER FUNCTION debug_jwt() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for debug_jwt';
  END IF;

  -- 24. log_pricing_change
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'log_pricing_change') INTO func_exists;
  IF func_exists THEN
    EXECUTE 'ALTER FUNCTION log_pricing_change() SET search_path = public, pg_temp';
    RAISE NOTICE 'Fixed search_path for log_pricing_change';
  END IF;
END $$;