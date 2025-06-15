/*
  # Fix function search path mutable security warnings
  
  1. Changes
    - Add explicit search path configuration to all database functions
    - Sets search_path to 'public, pg_temp' to prevent privilege escalation
    
  2. Security Benefits
    - Prevents malicious users from modifying search_path to access non-public schemas
    - Ensures function behavior is consistent regardless of the calling user
    - Follows security best practices recommended by Supabase database linter
*/

-- ============= Fix function_search_path_mutable warnings =============

-- 1. update_updated_at_column
ALTER FUNCTION update_updated_at_column()
SET search_path = public, pg_temp;

-- 2. cleanup_expired_verifications
ALTER FUNCTION cleanup_expired_verifications()
SET search_path = public, pg_temp;

-- 3. cleanup_expired_password_tokens
ALTER FUNCTION cleanup_expired_password_tokens()
SET search_path = public, pg_temp;

-- 4. get_driver_counts
ALTER FUNCTION get_driver_counts()
SET search_path = public, pg_temp;

-- 5. check_password_reset_rate_limit
ALTER FUNCTION check_password_reset_rate_limit(TEXT)
SET search_path = public, pg_temp;

-- 6. normalize_email
ALTER FUNCTION normalize_email(TEXT)
SET search_path = public, pg_temp;

-- 7. find_user_by_email
ALTER FUNCTION find_user_by_email(TEXT)
SET search_path = public, pg_temp;

-- 8. run_sql_query
ALTER FUNCTION run_sql_query()
SET search_path = public, pg_temp;

-- 9. log_query_attempt
ALTER FUNCTION log_query_attempt()
SET search_path = public, pg_temp;

-- 10. get_table_columns
ALTER FUNCTION get_table_columns()
SET search_path = public, pg_temp;

-- 11. get_user_feature_flags
ALTER FUNCTION get_user_feature_flags()
SET search_path = public, pg_temp;

-- 12. toggle_driver_availability
ALTER FUNCTION toggle_driver_availability()
SET search_path = public, pg_temp;

-- 13. set_driver_availability_admin
ALTER FUNCTION set_driver_availability_admin()
SET search_path = public, pg_temp;

-- 14. set_current_user_id
ALTER FUNCTION set_current_user_id()
SET search_path = public, pg_temp;

-- 15. get_user_driver_id
ALTER FUNCTION get_user_driver_id()
SET search_path = public, pg_temp;

-- 16. is_partner
ALTER FUNCTION is_partner()
SET search_path = public, pg_temp;

-- 17. get_zone_multipliers_with_codes
ALTER FUNCTION get_zone_multipliers_with_codes()
SET search_path = public, pg_temp;

-- 18. submit_driver_for_verification
ALTER FUNCTION submit_driver_for_verification()
SET search_path = public, pg_temp;

-- 19. driver_exists
ALTER FUNCTION driver_exists()
SET search_path = public, pg_temp;

-- 20. create_driver_profile
ALTER FUNCTION create_driver_profile()
SET search_path = public, pg_temp;

-- 21. handle_new_user
ALTER FUNCTION handle_new_user()
SET search_path = public, pg_temp;

-- 22. is_admin
ALTER FUNCTION is_admin()
SET search_path = public, pg_temp;

-- 23. is_admin_by_id
ALTER FUNCTION is_admin_by_id()
SET search_path = public, pg_temp;

-- 24. debug_jwt
ALTER FUNCTION debug_jwt()
SET search_path = public, pg_temp;

-- 25. log_pricing_change
ALTER FUNCTION log_pricing_change()
SET search_path = public, pg_temp;