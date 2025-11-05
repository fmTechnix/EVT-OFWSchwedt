-- AAO (Alarm- und Ausrückeordnung) Seed Data for Brandenburg Fire Service
-- Standard keywords for fire department deployment based on Brandenburg fire service guidelines
-- Source: Brandenburg fire service alarm and deployment regulations
-- Last updated: 2025-01-05

-- Delete existing AAO entries to ensure clean state
DELETE FROM aao_stichworte;

-- Brand-Stichworte (Fire Alarms)
INSERT INTO aao_stichworte (stichwort, kategorie, beschreibung, fahrzeuge, bemerkung, aktiv) VALUES
('B:Klein', 'brand', 'Kleinbrand - z.B. Mülleimerbrand, brennende Hecke', ARRAY['LF 10'], 'Standardalarmierung für kleinere Brände ohne Gefahr für Personen oder Gebäude', true),
('B:Mittel', 'brand', 'Mittelbrand - z.B. Kellerbrand, PKW-Brand', ARRAY['LF 10', 'LF 16', 'DLK 23'], 'Erweiterte Alarmierung mit Drehleitereinsatz für Mittelbrände', true),
('B:Groß', 'brand', 'Großbrand - z.B. Gebäudebrand, Hallenbrand', ARRAY['LF 10', 'LF 16', 'DLK 23', 'TLF 16'], 'Vollalarmierung aller verfügbaren Kräfte bei Großbrandlage', true),
('B:BMA', 'brand', 'Brandmeldeanlage ausgelöst', ARRAY['LF 10', 'DLK 23'], 'Automatische Brandmeldeanlage - Kontrolle und ggf. Brandbekämpfung', true),
('B:Gebäude', 'brand', 'Gebäudebrand', ARRAY['LF 10', 'LF 16', 'DLK 23', 'TLF 16'], 'Brand in bewohntem oder gewerblich genutztem Gebäude', true),
('B:Kfz', 'brand', 'Fahrzeugbrand', ARRAY['LF 10', 'LF 16'], 'PKW, LKW oder sonstiges Kraftfahrzeug brennt', true),
('B:Wald', 'brand', 'Waldbrand', ARRAY['LF 10', 'TLF 16', 'MTW'], 'Wald- oder Flächenbrand mit erhöhtem Wasserbedarf', true),
('B:Müll', 'brand', 'Müllbrand / Mülltonnenbrand', ARRAY['LF 10'], 'Brennender Müll, Mülltonnen, Container - kleinere Brandbekämpfung', true);

-- Hilfeleistungs-Stichworte (Technical Rescue)
INSERT INTO aao_stichworte (stichwort, kategorie, beschreibung, fahrzeuge, bemerkung, aktiv) VALUES
('H:VU', 'hilfeleistung', 'Verkehrsunfall ohne Einklemmung', ARRAY['LF 10', 'RW 1'], 'Verkehrsunfall ohne eingeklemmte Personen - Absicherung und kleinere technische Hilfe', true),
('H:VU P', 'hilfeleistung', 'Verkehrsunfall mit eingeklemmter Person', ARRAY['LF 10', 'LF 16', 'RW 1', 'DLK 23'], 'Verkehrsunfall mit eingeklemmten Personen - schwere technische Hilfeleistung erforderlich', true),
('H:Klein', 'hilfeleistung', 'Kleine technische Hilfeleistung', ARRAY['LF 10'], 'Kleinere Hilfeleistungen ohne besondere Ausrüstung (z.B. Tür öffnen, Ölspur)', true),
('H:Mittel', 'hilfeleistung', 'Mittlere technische Hilfeleistung', ARRAY['LF 10', 'RW 1'], 'Technische Hilfeleistung mit Spezialgerät vom Rüstwagen', true),
('H:Tier', 'hilfeleistung', 'Tierrettung', ARRAY['LF 10', 'DLK 23'], 'Rettung von Tieren in Notlage (z.B. Katze auf Baum, Pferd in Graben)', true),
('H:Wasser', 'hilfeleistung', 'Wasserschaden / Überflutung', ARRAY['LF 10', 'LF 16'], 'Auspumpen von Kellern, Beseitigung von Wasserschäden', true),
('H:Person', 'hilfeleistung', 'Personenrettung', ARRAY['LF 10', 'DLK 23'], 'Rettung von Personen aus Notlage (Höhe, Tiefe, besondere Gefahrenlage)', true),
('H:Türnotöffnung', 'hilfeleistung', 'Türöffnung / Wohnungsöffnung', ARRAY['LF 10'], 'Notöffnung von Türen bei akuter Gefahr für Personen', true);

-- Note: The vehicle names used in this seed data (LF 10, LF 16, DLK 23, TLF 16, RW 1, MTW)
-- are standard Brandenburg fire service designations. Ensure these vehicles exist in your
-- vehicles table with matching 'funk' (call sign) values, or adjust the seed data accordingly.
