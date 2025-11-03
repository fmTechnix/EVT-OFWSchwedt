import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with roles
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // "admin" or "member"
  name: text("name").notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Vehicles (Fahrzeuge)
export const vehicles = pgTable("vehicles", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  funk: text("funk").notNull(), // Funkrufname
  besatzung: integer("besatzung").notNull(), // Crew size
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true });
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;

// Kameraden (Crew members)
export const kameraden = pgTable("kameraden", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  qualifikationen: text("qualifikationen").array().notNull(), // ["TM", "AGT", "Maschinist", "GF", "Sprechfunker", "San"]
});

export const insertKameradSchema = createInsertSchema(kameraden).omit({ id: true });
export type InsertKamerad = z.infer<typeof insertKameradSchema>;
export type Kamerad = typeof kameraden.$inferSelect;

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

// Available qualifications
export const QUALIFIKATIONEN = ["TM", "AGT", "Maschinist", "GF", "Sprechfunker", "San"] as const;

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
