-- CRITICAL: Remove admin users from current_assignments table
-- Admin accounts must NEVER appear in operational crew assignments

-- Step 1: Show affected records before deletion
SELECT 
  ca.id,
  ca.user_id,
  u.vorname,
  u.nachname,
  u.role,
  ca.position,
  ca.vehicle_config_id
FROM current_assignments ca
JOIN users u ON ca.user_id = u.id
WHERE u.role = 'admin';

-- Step 2: Delete admin user assignments
DELETE FROM current_assignments
WHERE user_id IN (
  SELECT id FROM users WHERE role = 'admin'
);

-- Step 3: Verify cleanup
SELECT COUNT(*) as remaining_admin_assignments
FROM current_assignments ca
JOIN users u ON ca.user_id = u.id
WHERE u.role = 'admin';

-- Also clean up admin users from trupp_partner_id field
UPDATE current_assignments
SET trupp_partner_id = NULL
WHERE trupp_partner_id IN (
  SELECT id FROM users WHERE role = 'admin'
);
