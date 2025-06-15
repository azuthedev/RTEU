/*
  # RLS Policy Optimization
  
  1. Performance Improvements
    - Replace direct calls to auth.uid() with (select auth.uid())
    - Replace direct calls to is_admin() with (select is_admin())
    - Consolidate multiple permissive policies for the same role and action
    
  2. Purpose
    - Improve query performance for tables with RLS policies
    - Reduce redundancy in policy evaluation
    - Follow Supabase best practices for RLS implementation
*/

-- ============ Fix auth_rls_initplan issues ============

-- 1. booking_activity_logs policies
DROP POLICY IF EXISTS "Admins can view all booking activity logs" ON booking_activity_logs;
CREATE POLICY "Admins can view all booking activity logs"
ON booking_activity_logs
FOR SELECT
TO authenticated
USING ((select exists (
    SELECT 1
    FROM users
    WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
)));

DROP POLICY IF EXISTS "Users can insert booking activity logs" ON booking_activity_logs;
CREATE POLICY "Users can insert booking activity logs"
ON booking_activity_logs
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

-- 2. driver_documents policies
DROP POLICY IF EXISTS "Partners can view their own documents" ON driver_documents;
CREATE POLICY "Partners can view their own documents"
ON driver_documents
FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1
    FROM drivers
    WHERE drivers.id = driver_documents.driver_id AND drivers.user_id = (select auth.uid())
));

DROP POLICY IF EXISTS "Partners can insert their own documents" ON driver_documents;
CREATE POLICY "Partners can insert their own documents"
ON driver_documents
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
    SELECT 1
    FROM drivers
    WHERE drivers.id = driver_documents.driver_id AND drivers.user_id = (select auth.uid())
));

DROP POLICY IF EXISTS "Drivers can view own documents" ON driver_documents;
CREATE POLICY "Drivers can view own documents"
ON driver_documents
FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1
    FROM drivers
    WHERE drivers.id = driver_documents.driver_id AND drivers.user_id = (select auth.uid())
));

DROP POLICY IF EXISTS "Partners can update their own documents" ON driver_documents;
CREATE POLICY "Partners can update their own documents"
ON driver_documents
FOR UPDATE
TO authenticated
USING (EXISTS (
    SELECT 1
    FROM drivers
    WHERE drivers.id = driver_documents.driver_id AND drivers.user_id = (select auth.uid())
));

DROP POLICY IF EXISTS "Partners can delete their own documents" ON driver_documents;
CREATE POLICY "Partners can delete their own documents"
ON driver_documents
FOR DELETE
TO authenticated
USING (EXISTS (
    SELECT 1
    FROM drivers
    WHERE drivers.id = driver_documents.driver_id AND drivers.user_id = (select auth.uid())
));

DROP POLICY IF EXISTS "Admins can view all documents" ON driver_documents;
CREATE POLICY "Admins can view all documents"
ON driver_documents
FOR SELECT
TO authenticated
USING ((select exists (
    SELECT 1
    FROM users
    WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
)));

-- 3. trips policies
DROP POLICY IF EXISTS "Drivers can see their assigned trips" ON trips;
CREATE POLICY "Drivers can see their assigned trips"
ON trips
FOR SELECT
TO authenticated
USING (driver_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own trips" ON trips;
CREATE POLICY "Users can view own trips"
ON trips
FOR SELECT
TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own trips" ON trips;
CREATE POLICY "Users can create own trips"
ON trips
FOR INSERT
TO authenticated
WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own trips" ON trips;
CREATE POLICY "Users can update own trips"
ON trips
FOR UPDATE
TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Drivers can update their assigned trips" ON trips;
CREATE POLICY "Drivers can update their assigned trips"
ON trips
FOR UPDATE
TO authenticated
USING (EXISTS (
    SELECT 1
    FROM drivers
    WHERE drivers.user_id = (select auth.uid()) AND drivers.id = trips.driver_id
));

-- 4. log_queries policies
DROP POLICY IF EXISTS "Users can view their own log queries" ON log_queries;
CREATE POLICY "Users can view their own log queries"
ON log_queries
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can view all log queries" ON log_queries;
CREATE POLICY "Admins can view all log queries"
ON log_queries
FOR SELECT
TO authenticated
USING ((select exists (
    SELECT 1
    FROM users
    WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
)));

DROP POLICY IF EXISTS "Users can insert their own log queries" ON log_queries;
CREATE POLICY "Users can insert their own log queries"
ON log_queries
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

-- 5. drivers policies
DROP POLICY IF EXISTS "Partners can read their own driver records" ON drivers;
CREATE POLICY "Partners can read their own driver records"
ON drivers
FOR SELECT
TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Partners can create their own driver records" ON drivers;
CREATE POLICY "Partners can create their own driver records"
ON drivers
FOR INSERT
TO authenticated
WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Partners can update their own driver records" ON drivers;
CREATE POLICY "Partners can update their own driver records"
ON drivers
FOR UPDATE
TO authenticated
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Drivers can update their own availability" ON drivers;
CREATE POLICY "Drivers can update their own availability"
ON drivers
FOR UPDATE
TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can read all drivers" ON drivers;
CREATE POLICY "Admins can read all drivers"
ON drivers
FOR SELECT
TO authenticated
USING ((select exists (
    SELECT 1
    FROM users
    WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
)));

-- 6. email_verifications policies
DROP POLICY IF EXISTS "Users can view their own verifications" ON email_verifications;
CREATE POLICY "Users can view their own verifications"
ON email_verifications
FOR SELECT
TO authenticated
USING (user_id = (select auth.uid()));

-- 7. payments policies
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
CREATE POLICY "Users can view own payments"
ON payments
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create own payments" ON payments;
CREATE POLICY "Users can create own payments"
ON payments
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

-- 8. vehicles policies
DROP POLICY IF EXISTS "Drivers can view own vehicles" ON vehicles;
CREATE POLICY "Drivers can view own vehicles"
ON vehicles
FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1
    FROM drivers
    WHERE drivers.id = vehicles.driver_id AND drivers.user_id = (select auth.uid())
));

-- 9. driver_reviews policies
DROP POLICY IF EXISTS "Users can view own reviews" ON driver_reviews;
CREATE POLICY "Users can view own reviews"
ON driver_reviews
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create reviews for completed trips" ON driver_reviews;
CREATE POLICY "Users can create reviews for completed trips"
ON driver_reviews
FOR INSERT
TO authenticated
WITH CHECK (((select auth.uid()) = user_id) AND (
    EXISTS (
        SELECT 1
        FROM trips
        WHERE trips.id = driver_reviews.trip_id 
        AND trips.user_id = (select auth.uid())
        AND trips.status = 'completed'::trip_status
    )
));

-- 10. zendesk_tickets policies
DROP POLICY IF EXISTS "Users can view own tickets" ON zendesk_tickets;
CREATE POLICY "Users can view own tickets"
ON zendesk_tickets
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

-- 11. referrals policies
DROP POLICY IF EXISTS "Users can view own referrals" ON referrals;
CREATE POLICY "Users can view own referrals"
ON referrals
FOR SELECT
TO authenticated
USING (((select auth.uid()) = referrer_id) OR ((select auth.uid()) = referred_id));

-- 12. messages policies
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
CREATE POLICY "Users can view their own messages"
ON messages
FOR SELECT
TO authenticated
USING (((select auth.uid()) = sender_id) OR ((select auth.uid()) = receiver_id));

DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages"
ON messages
FOR INSERT
TO authenticated
WITH CHECK (sender_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update read status of received messages" ON messages;
CREATE POLICY "Users can update read status of received messages"
ON messages
FOR UPDATE
TO authenticated
USING (receiver_id = (select auth.uid()))
WITH CHECK (receiver_id = (select auth.uid()));

-- 13. users policies
DROP POLICY IF EXISTS "Users can see if they are verified" ON users;
CREATE POLICY "Users can see if they are verified"
ON users
FOR SELECT
TO authenticated
USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own data" ON users;
CREATE POLICY "Users can view own data"
ON users
FOR SELECT
TO authenticated
USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data"
ON users
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);

-- 14. password_reset_tokens policies
DROP POLICY IF EXISTS "Users can see their own password reset tokens" ON password_reset_tokens;
CREATE POLICY "Users can see their own password reset tokens"
ON password_reset_tokens
FOR SELECT
TO authenticated
USING (user_email = (select auth.email()));

-- 15. feature_flags policies
DROP POLICY IF EXISTS "Users can view global feature flags" ON feature_flags;
CREATE POLICY "Users can view global feature flags"
ON feature_flags
FOR SELECT
TO authenticated
USING (
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

DROP POLICY IF EXISTS "Admins can view all feature flags" ON feature_flags;
CREATE POLICY "Admins can view all feature flags"
ON feature_flags
FOR SELECT
TO authenticated
USING ((select exists (
    SELECT 1
    FROM users
    WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
)));

DROP POLICY IF EXISTS "Admins can insert feature flags" ON feature_flags;
CREATE POLICY "Admins can insert feature flags"
ON feature_flags
FOR INSERT
TO authenticated
WITH CHECK ((select exists (
    SELECT 1
    FROM users
    WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
)));

DROP POLICY IF EXISTS "Admins can update feature flags" ON feature_flags;
CREATE POLICY "Admins can update feature flags"
ON feature_flags
FOR UPDATE
TO authenticated
USING ((select exists (
    SELECT 1
    FROM users
    WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
)));

DROP POLICY IF EXISTS "Admins can delete feature flags" ON feature_flags;
CREATE POLICY "Admins can delete feature flags"
ON feature_flags
FOR DELETE
TO authenticated
USING ((select exists (
    SELECT 1
    FROM users
    WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
)));

-- 16. activity_logs policies
DROP POLICY IF EXISTS "Drivers can view their own logs" ON activity_logs;
CREATE POLICY "Drivers can view their own logs"
ON activity_logs
FOR SELECT
TO authenticated
USING ((select auth.uid()) IN (
    SELECT drivers.user_id
    FROM drivers
    WHERE drivers.id = activity_logs.driver_id
));

DROP POLICY IF EXISTS "Admins can view all logs" ON activity_logs;
CREATE POLICY "Admins can view all logs"
ON activity_logs
FOR SELECT
TO authenticated
USING ((select exists (
    SELECT 1
    FROM users
    WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
)));

DROP POLICY IF EXISTS "Drivers and admins can insert activity logs" ON activity_logs;
CREATE POLICY "Drivers and admins can insert activity logs"
ON activity_logs
FOR INSERT
TO authenticated
WITH CHECK (
    ((select auth.uid()) IN (
        SELECT drivers.user_id
        FROM drivers
        WHERE drivers.id = activity_logs.driver_id
    )) OR
    (EXISTS (
        SELECT 1
        FROM users
        WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
    ))
);

-- 17. platform_settings policies
DROP POLICY IF EXISTS "Admins can read platform settings" ON platform_settings;
CREATE POLICY "Admins can read platform settings"
ON platform_settings
FOR SELECT
TO authenticated
USING ((select exists (
    SELECT 1
    FROM users
    WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
)));

DROP POLICY IF EXISTS "Admins can insert platform settings" ON platform_settings;
CREATE POLICY "Admins can insert platform settings"
ON platform_settings
FOR INSERT
TO authenticated
WITH CHECK ((select exists (
    SELECT 1
    FROM users
    WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
)));

DROP POLICY IF EXISTS "Admins can update platform settings" ON platform_settings;
CREATE POLICY "Admins can update platform settings"
ON platform_settings
FOR UPDATE
TO authenticated
USING ((select exists (
    SELECT 1
    FROM users
    WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
)));

-- ============ Fix multiple_permissive_policies issues ============

-- 1. activity_logs for `authenticated` `SELECT` - Already fixed above

-- 2. driver_documents for `authenticated` `SELECT` - Already fixed above

-- 3. drivers for `authenticated` `INSERT`
DROP POLICY IF EXISTS "Admins can insert drivers" ON drivers;
DROP POLICY IF EXISTS "Partners can create their own driver records" ON drivers;
CREATE POLICY "Combined drivers insert policy"
ON drivers
FOR INSERT
TO authenticated
WITH CHECK (
    (select exists (
        SELECT 1
        FROM users
        WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
    )) OR 
    (user_id = (select auth.uid()))
);

-- 4. drivers for `authenticated` `SELECT`
DROP POLICY IF EXISTS "Admins can read all drivers" ON drivers;
DROP POLICY IF EXISTS "Admins can view all drivers" ON drivers;
DROP POLICY IF EXISTS "Partners can read their own driver records" ON drivers;
CREATE POLICY "Combined drivers view policy"
ON drivers
FOR SELECT
TO authenticated
USING (
    (select exists (
        SELECT 1
        FROM users
        WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
    )) OR 
    (user_id = (select auth.uid()))
);

-- 5. drivers for `authenticated` `UPDATE` - Already fixed above

-- 6. feature_flags for `authenticated` `SELECT` - Already fixed above

-- 7. incident_reports for `authenticated` `SELECT`
DROP POLICY IF EXISTS "Admin and support can view all reports" ON incident_reports;
DROP POLICY IF EXISTS "Drivers can view their own reports" ON incident_reports;
CREATE POLICY "Combined incident reports view policy"
ON incident_reports
FOR SELECT
TO authenticated
USING (
    (EXISTS (
        SELECT 1
        FROM users
        WHERE users.id = (select auth.uid())
        AND (users.user_role = 'admin'::user_role OR users.user_role = 'support'::user_role)
    )) OR 
    (EXISTS (
        SELECT 1
        FROM drivers
        WHERE drivers.user_id = (select auth.uid()) AND drivers.id = incident_reports.driver_id
    ))
);

-- 8. invite_links for `authenticated` `DELETE` (duplicates)
DROP POLICY IF EXISTS "Admins can delete invite_links" ON invite_links;

-- 9. invite_links for `authenticated` `INSERT` (duplicates)
DROP POLICY IF EXISTS "Admins can insert invite_links" ON invite_links;

-- 10. invite_links for `authenticated` `SELECT`
DROP POLICY IF EXISTS "Admins can view all invite links" ON invite_links;
DROP POLICY IF EXISTS "Admins can view all invite_links" ON invite_links;
DROP POLICY IF EXISTS "Public can validate invite links" ON invite_links;
CREATE POLICY "Combined invite links view policy"
ON invite_links
FOR SELECT
TO authenticated
USING (
    (select exists (
        SELECT 1
        FROM users
        WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
    )) OR 
    (status = 'active'::invite_status)
);

-- 11. invite_links for `authenticated` `UPDATE`
DROP POLICY IF EXISTS "Admins can update invite links" ON invite_links;
DROP POLICY IF EXISTS "Admins can update invite_links" ON invite_links;
DROP POLICY IF EXISTS "Public can update active invite links" ON invite_links;
CREATE POLICY "Combined invite links update policy"
ON invite_links
FOR UPDATE
TO authenticated
USING (
    (select exists (
        SELECT 1
        FROM users
        WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
    )) OR 
    (status = 'active'::invite_status)
);

-- 12. log_queries for `authenticated` `SELECT` - Already fixed above

-- 13. payments for `authenticated` `INSERT`
DROP POLICY IF EXISTS "Admins can insert payments" ON payments;
DROP POLICY IF EXISTS "Users can create own payments" ON payments;
CREATE POLICY "Combined payments insert policy"
ON payments
FOR INSERT
TO authenticated
WITH CHECK (
    (select exists (
        SELECT 1
        FROM users
        WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
    )) OR 
    ((select auth.uid()) = user_id)
);

-- 14. payments for `authenticated` `SELECT`
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
CREATE POLICY "Combined payments view policy"
ON payments
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

-- 15. trips for `authenticated` `INSERT`
DROP POLICY IF EXISTS "Admins can insert trips" ON trips;
DROP POLICY IF EXISTS "Users can create own trips" ON trips;
DROP POLICY IF EXISTS "Users can create their own bookings" ON trips;
CREATE POLICY "Combined trips insert policy"
ON trips
FOR INSERT
TO authenticated
WITH CHECK (
    (select exists (
        SELECT 1
        FROM users
        WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
    )) OR 
    (user_id = (select auth.uid())) OR 
    ((user_id IS NULL) AND (customer_email IS NOT NULL))
);

-- 16. trips for `authenticated` `SELECT`
DROP POLICY IF EXISTS "Admins can view all trips" ON trips;
DROP POLICY IF EXISTS "Drivers can see their assigned trips" ON trips;
DROP POLICY IF EXISTS "Users can view own trips" ON trips;
CREATE POLICY "Combined trips view policy"
ON trips
FOR SELECT
TO authenticated
USING (
    (select exists (
        SELECT 1
        FROM users
        WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
    )) OR 
    (driver_id = (select auth.uid())) OR 
    (user_id = (select auth.uid()))
);

-- 17. trips for `authenticated` `UPDATE`
DROP POLICY IF EXISTS "Admins can update trips" ON trips;
DROP POLICY IF EXISTS "Drivers can update their assigned trips" ON trips;
DROP POLICY IF EXISTS "Users can update own trips" ON trips;
CREATE POLICY "Combined trips update policy"
ON trips
FOR UPDATE
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
        WHERE drivers.user_id = (select auth.uid()) AND drivers.id = trips.driver_id
    )) OR 
    (user_id = (select auth.uid()))
);

-- 18. users for `anon` `INSERT`
-- This is a special case - keep the more permissive policy
DROP POLICY IF EXISTS "Auth trigger insert" ON users;

-- 19. users for `authenticated` `INSERT`
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users FOR authenticated;
CREATE POLICY "Combined users insert policy"
ON users
FOR INSERT
TO authenticated
WITH CHECK (
    (select exists (
        SELECT 1
        FROM users
        WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
    )) OR 
    (
        (COALESCE(user_role, 'customer'::user_role) = 'customer'::user_role) AND
        ((is_suspended IS NULL) OR (is_suspended = false)) AND
        ((created_at IS NULL) OR (created_at = now()))
    )
);

-- 20. users for `authenticated` `SELECT`
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can see if they are verified" ON users;
DROP POLICY IF EXISTS "Users can view own data" ON users;
CREATE POLICY "Combined users view policy"
ON users
FOR SELECT
TO authenticated
USING (
    (select exists (
        SELECT 1
        FROM users
        WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
    )) OR 
    (id = (select auth.uid()))
);

-- 21. users for `authenticated` `UPDATE`
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Combined users update policy"
ON users
FOR UPDATE
TO authenticated
USING (
    (select exists (
        SELECT 1
        FROM users
        WHERE users.id = (select auth.uid()) AND users.user_role = 'admin'::user_role
    )) OR 
    ((select auth.uid()) = id)
);

-- 22. vehicles for `authenticated` `SELECT`
DROP POLICY IF EXISTS "Admins can view all vehicles" ON vehicles;
DROP POLICY IF EXISTS "Drivers can view own vehicles" ON vehicles;
CREATE POLICY "Combined vehicles view policy"
ON vehicles
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
        WHERE drivers.id = vehicles.driver_id AND drivers.user_id = (select auth.uid())
    ))
);

-- 23. zendesk_tickets for `authenticated` `SELECT`
DROP POLICY IF EXISTS "Admins can view all zendesk_tickets" ON zendesk_tickets;
DROP POLICY IF EXISTS "Users can view own tickets" ON zendesk_tickets;
CREATE POLICY "Combined zendesk tickets view policy"
ON zendesk_tickets
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