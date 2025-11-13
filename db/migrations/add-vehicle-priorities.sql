-- Add einsatzart column to aao_stichworte
ALTER TABLE aao_stichworte 
ADD COLUMN IF NOT EXISTS einsatzart TEXT NOT NULL DEFAULT 'standard';

-- Create vehicle_priorities table
CREATE TABLE IF NOT EXISTS vehicle_priorities (
  id SERIAL PRIMARY KEY,
  vehicle_type TEXT NOT NULL UNIQUE,
  brandeinsatz_priority INTEGER NOT NULL DEFAULT 3,
  th_priority INTEGER NOT NULL DEFAULT 3,
  gefahrgut_priority INTEGER NOT NULL DEFAULT 3,
  standard_priority INTEGER NOT NULL DEFAULT 2
);

-- Seed default vehicle priorities based on German fire service standards
-- Priority 1 = highest (attack vehicles), Priority 3 = lowest (support)

INSERT INTO vehicle_priorities (vehicle_type, brandeinsatz_priority, th_priority, gefahrgut_priority, standard_priority)
VALUES
  -- Attack vehicles (Angriffsfahrzeuge) - Highest priority for fire operations
  ('LF', 1, 1, 2, 1),     -- Löschfahrzeug - Primary attack vehicle
  ('HLF', 1, 1, 2, 1),    -- Hilfeleistungslöschfahrzeug - Combined attack/rescue
  ('TLF', 1, 2, 2, 1),    -- Tanklöschfahrzeug - Water supply for fire
  
  -- Aerial/Rescue vehicles - High priority for rescue, medium for fire
  ('DL', 2, 1, 3, 2),     -- Drehleiter - Aerial ladder, critical for rescue
  
  -- Technical rescue - High priority for TH, medium for fire
  ('RW', 2, 1, 2, 2),     -- Rüstwagen - Technical rescue vehicle
  
  -- Hazmat - Highest priority for Gefahrgut
  ('ABC-Erkunder', 3, 2, 1, 2), -- ABC reconnaissance vehicle
  
  -- Support vehicles - Lowest priority (personnel transport, command)
  ('MTW', 3, 3, 3, 3),    -- Mannschaftstransportwagen - Personnel transport
  ('ELW', 3, 3, 3, 2),    -- Einsatzleitwagen - Command vehicle
  ('KdoW', 3, 3, 3, 2)    -- Kommandowagen - Command vehicle
ON CONFLICT (vehicle_type) DO UPDATE SET
  brandeinsatz_priority = EXCLUDED.brandeinsatz_priority,
  th_priority = EXCLUDED.th_priority,
  gefahrgut_priority = EXCLUDED.gefahrgut_priority,
  standard_priority = EXCLUDED.standard_priority;

-- Update existing AAO keywords with einsatzart based on kategorie
-- Brand keywords → brandeinsatz
UPDATE aao_stichworte 
SET einsatzart = 'brandeinsatz'
WHERE kategorie = 'brand' OR kategorie ILIKE '%brand%';

-- Hilfeleistung keywords → technische_hilfeleistung
UPDATE aao_stichworte 
SET einsatzart = 'technische_hilfeleistung'
WHERE kategorie = 'hilfeleistung' OR kategorie ILIKE '%hilfe%';

-- Sonstige keywords → standard
UPDATE aao_stichworte 
SET einsatzart = 'standard'
WHERE kategorie = 'sonstige' OR einsatzart = 'standard';
