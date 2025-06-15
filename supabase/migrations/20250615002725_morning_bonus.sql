/*
  # Fix remaining RLS policy performance issues
  
  1. Changes
    - Fix `auth_rls_initplan` warnings by replacing direct `auth.uid()` calls with `(select auth.uid())`
    - Address `multiple_permissive_policies` warnings by combining duplicated policies
    
  2. Tables Fixed
    - incident_reports
    - vehicle_base_prices
    - zone_multipliers
    - fixed_routes
    - pricing_change_logs
    
  3. Benefit
    - Improves query performance at scale
    - Reduces unnecessary re-evaluation of auth functions
*/

-- ============ Fix remaining auth_rls_initplan issues ============

-- 1. incident_reports policies
DROP POLICY IF EXISTS "Drivers can create reports for their trips" ON incident_reports;
CREATE POLICY "Drivers can create reports for their trips"
ON incident_reports
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
    SELECT 1
    FROM drivers
    WHERE drivers.user_id = (select uid()) AND drivers.id = incident_reports.driver_id
));

DROP POLICY IF EXISTS "Admin can update reports" ON incident_reports;
CREATE POLICY "Admin can update reports"
ON incident_reports
FOR UPDATE
TO authenticated
USING (EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = (select uid()) AND users.user_role = 'admin'::user_role
));

-- 2. vehicle_base_prices policy
DROP POLICY IF EXISTS "Admins can manage vehicle_base_prices" ON vehicle_base_prices;
CREATE POLICY "Admins can manage vehicle_base_prices"
ON vehicle_base_prices
FOR ALL
TO public
USING (EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = (select uid()) AND users.user_role = 'admin'::user_role
));

-- 3. zone_multipliers policy
DROP POLICY IF EXISTS "Admins can manage zone_multipliers" ON zone_multipliers;
CREATE POLICY "Admins can manage zone_multipliers"
ON zone_multipliers
FOR ALL
TO public
USING (EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = (select uid()) AND users.user_role = 'admin'::user_role
));

-- 4. fixed_routes policy
DROP POLICY IF EXISTS "Admins can manage fixed_routes" ON fixed_routes;
CREATE POLICY "Admins can manage fixed_routes"
ON fixed_routes
FOR ALL
TO public
USING (EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = (select uid()) AND users.user_role = 'admin'::user_role
));

-- 5. pricing_change_logs policy
DROP POLICY IF EXISTS "Admins can view pricing change logs" ON pricing_change_logs;
CREATE POLICY "Admins can view pricing change logs"
ON pricing_change_logs
FOR SELECT
TO public
USING (EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = (select uid()) AND users.user_role = 'admin'::user_role
));

-- ============ Combine any remaining multiple_permissive_policies ============

-- 1. activity_logs for authenticated SELECT
DROP POLICY IF EXISTS "Admins can view all logs" ON activity_logs;
DROP POLICY IF EXISTS "Drivers can view their own logs" ON activity_logs;
CREATE POLICY "Combined activity logs view policy"
ON activity_logs
FOR SELECT
TO authenticated
USING (
    (select exists (
        SELECT 1
        FROM users
        WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
    )) OR 
    ((select auth.uid()) IN (
        SELECT drivers.user_id
        FROM drivers
        WHERE drivers.id = activity_logs.driver_id
    ))
);

-- 2. driver_documents for authenticated SELECT
DROP POLICY IF EXISTS "Admins can view all documents" ON driver_documents;
DROP POLICY IF EXISTS "Admins can view all driver_documents" ON driver_documents;
DROP POLICY IF EXISTS "Drivers can view own documents" ON driver_documents;
DROP POLICY IF EXISTS "Partners can view their own documents" ON driver_documents;
CREATE POLICY "Combined driver documents view policy"
ON driver_documents
FOR SELECT
TO authenticated
USING (
    (select exists (
        SELECT 1
        FROM users
        WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
    )) OR 
    (EXISTS (
        SELECT 1
        FROM drivers
        WHERE drivers.id = driver_documents.driver_id AND drivers.user_id = (select auth.uid())
    ))
);

-- 3. drivers for authenticated UPDATE
DROP POLICY IF EXISTS "Admins can update drivers" ON drivers;
DROP POLICY IF EXISTS "Drivers can update their own availability" ON drivers;
DROP POLICY IF EXISTS "Partners can update their own driver records" ON drivers;
CREATE POLICY "Combined drivers update policy"
ON drivers
FOR UPDATE
TO authenticated
USING (
    (select exists (
        SELECT 1
        FROM users
        WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
    )) OR 
    (user_id = (select auth.uid()))
);

-- 4. email_verifications for authenticated SELECT
DROP POLICY IF EXISTS "Public can check verification status" ON email_verifications;
DROP POLICY IF EXISTS "Users can view their own verifications" ON email_verifications;
CREATE POLICY "Combined email verifications view policy"
ON email_verifications
FOR SELECT
TO authenticated
USING (
    TRUE  -- Allow viewing all verifications for authenticated users
    -- This mimics the original "Public can check verification status" policy which allowed all access
    -- While also covering the "Users can view their own verifications" policy
);

-- 5. feature_flags for authenticated SELECT
DROP POLICY IF EXISTS "Admins can view all feature flags" ON feature_flags;
DROP POLICY IF EXISTS "Users can view global feature flags" ON feature_flags;
CREATE POLICY "Combined feature flags view policy"
ON feature_flags
FOR SELECT
TO authenticated
USING (
    (select exists (
        SELECT 1
        FROM users
        WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
    )) OR
    (scope = 'global'::text) OR
    ((scope = 'admin'::text) AND (EXISTS (
        SELECT 1
        FROM users
        WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
    ))) OR
    ((scope = 'partner'::text) AND (EXISTS (
        SELECT 1
        FROM users
        WHERE users.id = (select auth.uid()) AND users.user_role = 'partner'::user_role
    ))) OR
    ((scope = 'customer'::text) AND (EXISTS (
        SELECT 1
        FROM users
        WHERE users.id = (select auth.uid()) AND users.user_role = 'customer'::user_role
    )))
);

-- 6. log_queries for authenticated SELECT
DROP POLICY IF EXISTS "Admins can view all log queries" ON log_queries;
DROP POLICY IF EXISTS "Users can view their own log queries" ON log_queries;
CREATE POLICY "Combined log queries view policy"
ON log_queries
FOR SELECT
TO authenticated
USING (
    (select exists (
        SELECT 1
        FROM users
        WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
    )) OR
    ((select auth.uid()) = user_id)
);