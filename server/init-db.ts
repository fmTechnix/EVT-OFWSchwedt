import { db } from "./db";
import { users, vehicles, qualifikationen, settings, einsatz } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function initializeDatabase() {
  // Check if already initialized (check if admin user exists)
  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length > 0) {
    console.log("Database already initialized");
    return;
  }

  console.log("Initializing database with default data...");

  // Initialize qualifikationen
  const quals = [
    { id: 1, kuerzel: "TM", name: "Truppmann", beschreibung: "Grundausbildung für Feuerwehrleute" },
    { id: 2, kuerzel: "AGT", name: "Atemschutzgeräteträger", beschreibung: "Berechtigung zum Tragen von Atemschutzgeräten" },
    { id: 3, kuerzel: "Maschinist", name: "Maschinist", beschreibung: "Befähigung zur Bedienung von Feuerwehrfahrzeugen" },
    { id: 4, kuerzel: "GF", name: "Gruppenführer", beschreibung: "Führungsausbildung für Gruppen" },
    { id: 5, kuerzel: "Sprechfunker", name: "Sprechfunker", beschreibung: "Berechtigung zur Funkkommunikation" },
    { id: 6, kuerzel: "San", name: "Sanitäter", beschreibung: "Sanitätsausbildung" },
  ];
  await db.insert(qualifikationen).values(quals);

  // Initialize users
  const defaultUsers = [
    {
      username: "admin",
      password: "admin",
      role: "admin",
      vorname: "Admin",
      nachname: "User",
      qualifikationen: ["TM", "AGT", "Maschinist", "GF"],
      muss_passwort_aendern: false,
    },
    {
      username: "moderator",
      password: "moderator123",
      role: "moderator",
      vorname: "Moderator",
      nachname: "User",
      qualifikationen: ["TM", "Sprechfunker"],
      muss_passwort_aendern: false,
    },
    {
      username: "member",
      password: "member123",
      role: "member",
      vorname: "Member",
      nachname: "User",
      qualifikationen: ["TM"],
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

  console.log("Database initialization complete!");
}
