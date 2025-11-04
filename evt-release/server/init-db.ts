import { db } from "./db";
import { users, vehicles, qualifikationen, settings, einsatz, vehicleConfigs } from "@shared/schema";
import { sql } from "drizzle-orm";
import { hashPassword } from "./password-utils";
import fs from "fs";
import path from "path";

export async function initializeDatabase() {
  // Check if already initialized (check if admin user exists)
  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length > 0) {
    console.log("Database already initialized");
    return;
  }

  console.log("Initializing database with default data...");

  // Initialize qualifikationen (base qualifications + addons)
  const quals = [
    // Base qualifications
    { id: 1, kuerzel: "TM", name: "Truppmann", beschreibung: "Grundausbildung für Feuerwehrleute" },
    { id: 2, kuerzel: "AGT", name: "Atemschutzgeräteträger", beschreibung: "Berechtigung zum Tragen von Atemschutzgeräten" },
    { id: 3, kuerzel: "MASCH", name: "Maschinist", beschreibung: "Befähigung zur Bedienung von Feuerwehrfahrzeugen" },
    { id: 4, kuerzel: "GF", name: "Gruppenführer", beschreibung: "Führungsausbildung für Gruppen" },
    { id: 5, kuerzel: "ZF", name: "Zugführer", beschreibung: "Führungsausbildung für Züge" },
    { id: 6, kuerzel: "FUNK", name: "Sprechfunker", beschreibung: "Berechtigung zur Funkkommunikation" },
    { id: 7, kuerzel: "FUEASS", name: "Führungsassistent", beschreibung: "Unterstützung der Einsatzleitung" },
    { id: 8, kuerzel: "TH", name: "Technische Hilfeleistung", beschreibung: "Spezialausbildung für technische Rettung" },
    { id: 9, kuerzel: "ABC1", name: "ABC-Einsatz Stufe 1", beschreibung: "Grundausbildung für ABC-Gefahren" },
    { id: 10, kuerzel: "CBRN_ERKKW", name: "CBRN-Erkundungskraftwagen", beschreibung: "Ausbildung für CBRN-Erkundung" },
    { id: 11, kuerzel: "FAHRER_B", name: "Fahrer Klasse B", beschreibung: "Führerschein Klasse B für MTF" },
    { id: 12, kuerzel: "San", name: "Sanitäter", beschreibung: "Sanitätsausbildung" },
    // Addon qualifications
    { id: 13, kuerzel: "MZ", name: "Maschinisten-Zusatz", beschreibung: "Zusatzausbildung für spezielle Fahrzeuge (z.B. RW)" },
    { id: 14, kuerzel: "WT18", name: "Wasserträger 18t", beschreibung: "Berechtigung für Wasserträger-Fahrzeuge über 18t" },
  ];
  await db.insert(qualifikationen).values(quals);
  
  // Reset sequence to max ID to prevent duplicate key errors
  await db.execute(sql`SELECT setval('qualifikationen_id_seq', (SELECT MAX(id) FROM qualifikationen))`);

  // Initialize users with hashed passwords (using new qualification abbreviations)
  const defaultUsers = [
    {
      username: "admin",
      password: await hashPassword("admin"),
      role: "admin",
      vorname: "Admin",
      nachname: "User",
      qualifikationen: ["TM", "AGT", "MASCH", "GF", "ZF"],
      muss_passwort_aendern: false,
    },
    {
      username: "moderator",
      password: await hashPassword("moderator123"),
      role: "moderator",
      vorname: "Moderator",
      nachname: "User",
      qualifikationen: ["TM", "FUNK", "FUEASS"],
      muss_passwort_aendern: false,
    },
    {
      username: "member",
      password: await hashPassword("member123"),
      role: "member",
      vorname: "Member",
      nachname: "User",
      qualifikationen: ["TM", "FAHRER_B"],
      muss_passwort_aendern: false,
    },
  ];
  await db.insert(users).values(defaultUsers);

  // Initialize vehicles
  const defaultVehicles = [
    { id: 1, name: "HLF 20", funk: "Florian Schwedt 1/46/1", besatzung: 9 },
    { id: 2, name: "DLK 23/12", funk: "Florian Schwedt 1/33/1", besatzung: 3 },
  ];
  await db.insert(vehicles).values(defaultVehicles);
  
  // Reset sequence to max ID to prevent duplicate key errors
  await db.execute(sql`SELECT setval('vehicles_id_seq', (SELECT MAX(id) FROM vehicles))`);

  // Initialize settings
  await db.insert(settings).values({
    id: 1,
    schichtlaenge_std: 12,
    min_agt: 2,
    min_maschinist: 1,
    min_gf: 1,
  });

  // Initialize einsatz
  await db.insert(einsatz).values({
    id: 1,
    stichwort: "B: Kleinbrand",
    bemerkung: "",
    mannschaftsbedarf: 9,
  });

  // Initialize vehicle configurations from JSON file
  try {
    const configPath = path.join(import.meta.dirname, "data", "vehicle-configs.json");
    const configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    
    for (const vehicleData of configData.vehicles) {
      await db.insert(vehicleConfigs).values({
        vehicle: vehicleData.vehicle,
        type: vehicleData.type,
        slots: vehicleData.slots,
        constraints: vehicleData.constraints || null,
      });
    }
    
    // Reset sequence to max ID
    await db.execute(sql`SELECT setval('vehicle_configs_id_seq', (SELECT MAX(id) FROM vehicle_configs))`);
    
    console.log(`Loaded ${configData.vehicles.length} vehicle configurations`);
  } catch (error) {
    console.error("Failed to load vehicle configurations:", error);
  }

  console.log("Database initialization complete!");
}
