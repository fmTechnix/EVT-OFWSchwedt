-- Migration: admin → system_admin role for non-operative accounts
-- WICHTIG: Führe dieses Script nur für reine System-Admin-Accounts aus!
-- Operative Admins (Wehrführer etc.) sollen "admin" bleiben!

-- Schritt 1: Zeige alle aktuellen Admin-Accounts
SELECT 
  id,
  username,
  vorname,
  nachname,
  role,
  qualifikationen
FROM users
WHERE role = 'admin';

-- Schritt 2: Automatische Umstellung für typische System-Admin-Usernamen
-- (admin, test, system, etc.)
UPDATE users
SET role = 'system_admin'
WHERE role = 'admin'
  AND (
    username ILIKE '%admin%'
    OR username ILIKE '%test%'
    OR username ILIKE '%system%'
  );

-- Schritt 3: Verifizierung - Zeige alle Rollen
SELECT 
  role,
  COUNT(*) as anzahl
FROM users
GROUP BY role
ORDER BY role;

-- Schritt 4: Zeige die umgestellten Accounts
SELECT 
  id,
  username,
  vorname,
  nachname,
  role
FROM users
WHERE role = 'system_admin';
