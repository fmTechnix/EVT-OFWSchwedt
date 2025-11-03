import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with roles and qualifications (unified Benutzer)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // "admin", "moderator", or "member"
  vorname: text("vorname").notNull(),
  nachname: text("nachname").notNull(),
  qualifikationen: text("qualifikationen").array().notNull().default(sql`'{}'`), // ["TM", "AGT", "Maschinist", "GF", "Sprechfunker", "San"]
  muss_passwort_aendern: boolean("muss_passwort_aendern").notNull().default(false),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Vehicles (Fahrzeuge)
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  funk: text("funk").notNull(), // Funkrufname
  besatzung: integer("besatzung").notNull(), // Crew size
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true });
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;

// Einsatz (Deployment/Mission)
export const einsatz = pgTable("einsatz", {
  id: integer("id").primaryKey(),
  stichwort: text("stichwort").notNull(),
  bemerkung: text("bemerkung").notNull(),
  mannschaftsbedarf: integer("mannschaftsbedarf").notNull(),
});

export const insertEinsatzSchema = createInsertSchema(einsatz).omit({ id: true });
export type InsertEinsatz = z.infer<typeof insertEinsatzSchema>;
export type Einsatz = typeof einsatz.$inferSelect;

// Settings
export const settings = pgTable("settings", {
  id: integer("id").primaryKey(),
  schichtlaenge_std: integer("schichtlaenge_std").notNull(),
  min_agt: integer("min_agt").notNull(),
  min_maschinist: integer("min_maschinist").notNull(),
  min_gf: integer("min_gf").notNull(),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

// Qualifikationen (Qualifications)
export const qualifikationen = pgTable("qualifikationen", {
  id: serial("id").primaryKey(),
  kuerzel: text("kuerzel").notNull().unique(), // e.g., "AGT", "TM"
  name: text("name").notNull(), // e.g., "Atemschutzgeräteträger"
  beschreibung: text("beschreibung").notNull(),
});

export const insertQualifikationSchema = createInsertSchema(qualifikationen).omit({ id: true });
export type InsertQualifikation = z.infer<typeof insertQualifikationSchema>;
export type Qualifikation = typeof qualifikationen.$inferSelect;

// Available qualifications (kept for backwards compatibility)
export const QUALIFIKATIONEN = ["TM", "AGT", "Maschinist", "GF", "Sprechfunker", "San"] as const;

// Termine (Calendar events)
export const termine = pgTable("termine", {
  id: serial("id").primaryKey(),
  titel: text("titel").notNull(),
  beschreibung: text("beschreibung").notNull(),
  datum: text("datum").notNull(), // ISO date string (YYYY-MM-DD)
  uhrzeit: text("uhrzeit").notNull(), // Time string (HH:MM)
  ort: text("ort").notNull(),
  ersteller_id: text("ersteller_id").notNull(), // User ID who created it
});

export const insertTerminSchema = createInsertSchema(termine).omit({ id: true, ersteller_id: true });
export type InsertTermin = z.infer<typeof insertTerminSchema>;
export type Termin = typeof termine.$inferSelect;

// Termin Zusagen (Event responses)
export const terminZusagen = pgTable("termin_zusagen", {
  id: serial("id").primaryKey(),
  termin_id: integer("termin_id").notNull(),
  user_id: text("user_id").notNull(),
  status: text("status").notNull(), // "zugesagt" or "abgesagt"
});

export const insertTerminZusageSchema = createInsertSchema(terminZusagen).omit({ id: true });
export type InsertTerminZusage = z.infer<typeof insertTerminZusageSchema>;
export type TerminZusage = typeof terminZusagen.$inferSelect;

// Besetzungscheck result type
export type BesetzungscheckResult = {
  vorhanden: {
    agt: number;
    maschinist: number;
    gf: number;
    gesamt: number;
  };
  minima: {
    min_agt: number;
    min_maschinist: number;
    min_gf: number;
    mannschaftsbedarf: number;
  };
  erfuellt: boolean;
};
