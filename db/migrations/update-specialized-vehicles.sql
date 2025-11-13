-- Update vehicle priorities: RW, GWG, and other specialized vehicles should NOT be treated as support vehicles
-- Migration: Ensure specialized vehicles maintain crew and are not pulled from during reassignment

-- Priority System:
-- Priority 1 = Attack vehicles (LF, HLF, TLF) - Highest priority, receive crew from support
-- Priority 2 = Specialized (DL, RW, GWG, Wasserträger, SW) - Keep their crew, protected from reassignment
-- Priority 3 = Support only (MTW, ELW, KdoW) - Give excess crew (>2 people) to tactical vehicles

-- Add specialized vehicle types that should be protected from crew reassignment
INSERT INTO vehicle_priorities (vehicle_type, brandeinsatz_priority, th_priority, gefahrgut_priority, standard_priority)
VALUES
  ('GWG', 2, 2, 2, 2),         -- Gerätewagen Gefahrgut - Specialized equipment
  ('SW', 2, 2, 1, 2),           -- Schlauchwagen - Water supply support  
  ('Wasserträger', 2, 2, 2, 2) -- Water carrier - Specialized water supply
ON CONFLICT (vehicle_type) DO UPDATE SET
  brandeinsatz_priority = EXCLUDED.brandeinsatz_priority,
  th_priority = EXCLUDED.th_priority,
  gefahrgut_priority = EXCLUDED.gefahrgut_priority,
  standard_priority = EXCLUDED.standard_priority;
