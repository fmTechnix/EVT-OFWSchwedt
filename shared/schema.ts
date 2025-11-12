import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, serial, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
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
  min_agt: integer("min_agt").notNull(),
  min_maschinist: integer("min_maschinist").notNull(),
  min_gf: integer("min_gf").notNull(),
  rotation_window: integer("rotation_window").notNull().default(4), // Number of weeks to consider for rotation
  rotation_weights: jsonb("rotation_weights"), // Position-specific rotation weights
  assignment_mode: text("assignment_mode").notNull().default("manual"), // "manual" or "auto_aao"
});

export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true }).extend({
  assignment_mode: z.enum(["manual", "auto_aao"]).default("manual"),
});
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

// Extended Termin type with zusage statistics
export type TerminMitStats = Termin & {
  zusagen_count: number;
  absagen_count: number;
  total_responses: number;
};

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

// Vehicle Configurations (for automatic crew assignment)
export const vehicleConfigs = pgTable("vehicle_configs", {
  id: serial("id").primaryKey(),
  vehicle: text("vehicle").notNull().unique(), // e.g., "HLF 20"
  type: text("type").notNull(), // e.g., "LF", "TLF", "RW"
  slots: jsonb("slots").notNull(), // Array of slot configurations
  constraints: jsonb("constraints"), // Optional constraints object
});

export const insertVehicleConfigSchema = createInsertSchema(vehicleConfigs).omit({ id: true });
export type InsertVehicleConfig = z.infer<typeof insertVehicleConfigSchema>;
export type VehicleConfig = typeof vehicleConfigs.$inferSelect;

// TypeScript types for vehicle configuration structure
export type VehicleSlot = {
  position: string;
  requires?: string[];
  requires_any?: string[];
  prefer?: string[];
  addons_required?: string[];
  allow_fallback?: boolean;
};

export type VehicleConstraints = {
  min_agt_total?: number;
  min_agt_watertrupp?: number;
  min_cbrn_erkkw_total?: number;
  min_funk_total?: number;
  prefer_th_total?: number;
  prefer_abc1_total?: number;
};

export type VehicleConfigData = {
  vehicle: string;
  type: string;
  slots: VehicleSlot[];
  constraints?: VehicleConstraints;
};

// Assignment result types for automatic crew assignment
export type SlotAssignment = {
  position: string;
  assignedUser: User | null;
  candidateUsers: User[];
  isFilled: boolean;
  meetsRequirements: boolean;
};

export type VehicleAssignment = {
  vehicleConfig: VehicleConfig;
  slots: SlotAssignment[];
  isFullyStaffed: boolean;
  meetsConstraints: boolean;
  constraintIssues: string[];
};

// User Availability (Verfügbarkeit) - Extended with time slots
export const availabilities = pgTable("availabilities", {
  id: serial("id").primaryKey(),
  user_id: text("user_id").notNull(),
  date: text("date").notNull(), // ISO date string (YYYY-MM-DD)
  status: text("status").notNull(), // "available", "unavailable"
  reason: text("reason"), // Optional reason (e.g., "Urlaub", "Krankheit")
  start_time: text("start_time"), // HH:MM format (e.g., "08:00"), null = all day
  end_time: text("end_time"), // HH:MM format (e.g., "16:00"), null = all day
  created_at: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertAvailabilitySchema = createInsertSchema(availabilities).omit({ id: true, created_at: true });
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;
export type Availability = typeof availabilities.$inferSelect;

// Availability Templates (Wöchentliche Vorlagen für Schichtarbeiter)
export const availabilityTemplates = pgTable("availability_templates", {
  id: serial("id").primaryKey(),
  user_id: text("user_id").notNull(),
  name: text("name").notNull(), // e.g., "Frühschicht Mo-Fr"
  weekdays: text("weekdays").array().notNull(), // ["monday", "tuesday", "wednesday", "thursday", "friday"]
  start_time: text("start_time").notNull(), // HH:MM format (e.g., "08:00")
  end_time: text("end_time").notNull(), // HH:MM format (e.g., "16:00")
  status: text("status").notNull().default("available"), // "available", "unavailable"
  active: boolean("active").notNull().default(true), // Whether this template is currently active
  created_at: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertAvailabilityTemplateSchema = createInsertSchema(availabilityTemplates).omit({ id: true, created_at: true });
export type InsertAvailabilityTemplate = z.infer<typeof insertAvailabilityTemplateSchema>;
export type AvailabilityTemplate = typeof availabilityTemplates.$inferSelect;

// User Reminder Settings (Push-Erinnerungen für Verfügbarkeit)
export const userReminderSettings = pgTable("user_reminder_settings", {
  user_id: text("user_id").primaryKey(),
  reminder_enabled: boolean("reminder_enabled").notNull().default(false),
  reminder_time: text("reminder_time").notNull().default("18:00"), // HH:MM format
  reminder_weekdays: text("reminder_weekdays").array().notNull().default(sql`ARRAY['sunday']::text[]`), // Which days to send reminders
  last_reminder_sent: timestamp("last_reminder_sent"), // Track when last reminder was sent
  updated_at: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertUserReminderSettingsSchema = createInsertSchema(userReminderSettings).omit({ updated_at: true });
export type InsertUserReminderSettings = z.infer<typeof insertUserReminderSettingsSchema>;
export type UserReminderSettings = typeof userReminderSettings.$inferSelect;

// Current Assignments (Aktuelle Zuteilung)
export const currentAssignments = pgTable("current_assignments", {
  id: serial("id").primaryKey(),
  user_id: text("user_id").notNull(),
  vehicle_config_id: integer("vehicle_config_id").notNull(),
  position: text("position").notNull(), // e.g., "Truppführer", "Angriffstrupp", "Maschinist"
  assigned_at: timestamp("assigned_at").notNull().default(sql`now()`),
  trupp_partner_id: text("trupp_partner_id"), // Optional partner for Trupp positions
  effective_from: text("effective_from"), // ISO date string for week start (e.g., "2025-11-10")
  effective_to: text("effective_to"), // ISO date string for week end (e.g., "2025-11-16")
  assignment_history_id: integer("assignment_history_id"), // Reference to history entry
});

export const insertCurrentAssignmentSchema = createInsertSchema(currentAssignments).omit({ id: true, assigned_at: true });
export type InsertCurrentAssignment = z.infer<typeof insertCurrentAssignmentSchema>;
export type CurrentAssignment = typeof currentAssignments.$inferSelect;

// Assignment History (Zuweisungshistorie für Fairness-Tracking)
export const assignmentHistory = pgTable("assignment_history", {
  id: serial("id").primaryKey(),
  user_id: text("user_id").notNull(),
  vehicle_config_id: integer("vehicle_config_id"),
  vehicle_name: text("vehicle_name").notNull(), // Denormalized for query performance
  position: text("position").notNull(),
  assigned_for_date: text("assigned_for_date").notNull(), // ISO date string (week start)
  assigned_until_date: text("assigned_until_date"), // ISO date string (week end) or null if ongoing
  assignment_batch_id: text("assignment_batch_id"), // UUID to group assignments from same run
  assigned_by: text("assigned_by"), // "auto" or user_id if manual
  created_at: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertAssignmentHistorySchema = createInsertSchema(assignmentHistory).omit({ id: true, created_at: true });
export type InsertAssignmentHistory = z.infer<typeof insertAssignmentHistorySchema>;
export type AssignmentHistory = typeof assignmentHistory.$inferSelect;

// Assignment Fairness (Fairness-Metriken pro Benutzer)
export const assignmentFairness = pgTable("assignment_fairness", {
  user_id: text("user_id").primaryKey(),
  total_assignments: integer("total_assignments").notNull().default(0),
  per_position_counts: jsonb("per_position_counts").notNull().default(sql`'{}'::jsonb`), // { "Maschinist": 5, "Truppführer": 3, ... }
  last_position: text("last_position"),
  last_assigned_at: timestamp("last_assigned_at"),
  rolling_fairness_score: integer("rolling_fairness_score").notNull().default(0), // Lower is better (fewer assignments)
  updated_at: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertAssignmentFairnessSchema = createInsertSchema(assignmentFairness).omit({ updated_at: true });
export type InsertAssignmentFairness = z.infer<typeof insertAssignmentFairnessSchema>;
export type AssignmentFairness = typeof assignmentFairness.$inferSelect;

// Push Subscriptions for Web Push Notifications
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  user_id: text("user_id").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(), // Public key
  auth: text("auth").notNull(), // Auth secret
  created_at: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true, created_at: true });
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// Push Logs (Logging aller Push-Benachrichtigungen)
export const pushLogs = pgTable("push_logs", {
  id: serial("id").primaryKey(),
  user_id: text("user_id").notNull(),
  message_type: text("message_type").notNull(), // "assignment_change", "test", "reminder", "alarm"
  title: text("title").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull(), // "success", "error", "no_subscription"
  error_message: text("error_message"), // Error details if status = "error"
  subscription_endpoint: text("subscription_endpoint"), // For troubleshooting
  status_code: integer("status_code"), // HTTP status code if applicable
  sent_at: timestamp("sent_at").notNull().default(sql`now()`),
  sent_by: text("sent_by").notNull().default("system"), // "system" or admin user_id for test pushes
});

export const insertPushLogSchema = createInsertSchema(pushLogs).omit({ id: true, sent_at: true });
export type InsertPushLog = z.infer<typeof insertPushLogSchema>;
export type PushLog = typeof pushLogs.$inferSelect;

// Mängelmeldungen (Vehicle Defect Reports)
export const maengelMeldungen = pgTable("maengel_meldungen", {
  id: serial("id").primaryKey(),
  vehicle_id: integer("vehicle_id").notNull(), // Reference to vehicles
  beschreibung: text("beschreibung").notNull(), // Defect description
  status: text("status").notNull().default("offen"), // "offen", "in_bearbeitung", "behoben"
  melder_id: text("melder_id").notNull(), // User who reported (reference to users)
  fotos: text("fotos").array().notNull().default(sql`'{}'`), // Array of photo filenames/base64
  erstellt_am: timestamp("erstellt_am").notNull().default(sql`now()`),
  behoben_am: timestamp("behoben_am"), // When defect was resolved
  bemerkung: text("bemerkung"), // Optional notes/comments
});

export const insertMaengelMeldungSchema = createInsertSchema(maengelMeldungen).omit({ id: true, erstellt_am: true });
export type InsertMaengelMeldung = z.infer<typeof insertMaengelMeldungSchema>;
export type MaengelMeldung = typeof maengelMeldungen.$inferSelect;

// Alarm Events (DE-Alarm Integration)
export const alarmEvents = pgTable("alarm_events", {
  id: serial("id").primaryKey(),
  alarm_id: text("alarm_id").notNull().unique(), // Unique ID from DE-Alarm system
  einsatznummer: text("einsatznummer").notNull(), // Mission number
  alarmierungszeit: timestamp("alarmierungszeit").notNull(), // Alarm timestamp
  ort: text("ort").notNull(), // Location
  ortsteil: text("ortsteil"), // District
  ortslage: text("ortslage"), // Specific location
  strasse: text("strasse"), // Street (optional for privacy)
  hausnummer: text("hausnummer"), // House number (optional for privacy)
  objekt: text("objekt"), // Object/building (optional)
  zusaetzliche_ortsangaben: text("zusaetzliche_ortsangaben"), // Additional location info
  einsatzkoordinaten_lat: text("einsatzkoordinaten_lat"), // Latitude
  einsatzkoordinaten_lon: text("einsatzkoordinaten_lon"), // Longitude
  einsatzart: text("einsatzart").notNull(), // Mission type (e.g., "Brandeinsatz")
  stichwort: text("stichwort").notNull(), // Keyword (e.g., "B:Klein")
  sondersignal: boolean("sondersignal").notNull().default(false), // Emergency signal
  besonderheiten: text("besonderheiten"), // Special notes
  alarmierte_einsatzmittel: text("alarmierte_einsatzmittel").array().notNull().default(sql`'{}'`), // Alarmed units
  alarmierte_wachen: text("alarmierte_wachen").array().notNull().default(sql`'{}'`), // Alarmed stations
  empfangen_am: timestamp("empfangen_am").notNull().default(sql`now()`), // When EVT received the alarm
  verarbeitet: boolean("verarbeitet").notNull().default(false), // Whether alarm was processed
  crew_neu_zugeteilt: boolean("crew_neu_zugeteilt").notNull().default(false), // Whether crew was automatically reassigned
  raw_data: jsonb("raw_data"), // Store complete raw JSON for debugging
});

export const insertAlarmEventSchema = createInsertSchema(alarmEvents).omit({ id: true, empfangen_am: true });
export type InsertAlarmEvent = z.infer<typeof insertAlarmEventSchema>;
export type AlarmEvent = typeof alarmEvents.$inferSelect;

// AAO Stichworte (Alarm- und Ausrückeordnung)
export const aaoStichworte = pgTable("aao_stichworte", {
  id: serial("id").primaryKey(),
  stichwort: text("stichwort").notNull().unique(), // e.g., "B:Klein", "H:VU mit P"
  kategorie: text("kategorie").notNull(), // "Brand" or "Hilfeleistung"
  beschreibung: text("beschreibung").notNull(), // Description/examples
  fahrzeuge: text("fahrzeuge").array().notNull().default(sql`'{}'`), // Array of vehicle names that should respond
  taktische_einheit: text("taktische_einheit"), // e.g., "Staffel", "Gruppe", "Zug"
  bemerkung: text("bemerkung"), // Additional notes
  aktiv: boolean("aktiv").notNull().default(true), // Whether this keyword is active
  erstellt_am: timestamp("erstellt_am").notNull().default(sql`now()`),
});

export const insertAaoStichwortSchema = createInsertSchema(aaoStichworte).omit({ id: true, erstellt_am: true });
export type InsertAaoStichwort = z.infer<typeof insertAaoStichwortSchema>;
export type AaoStichwort = typeof aaoStichworte.$inferSelect;

// Audit Logs (System-weite Event-Logs für Admin-Überwachung)
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  event_time: timestamp("event_time").notNull().default(sql`now()`),
  actor_id: text("actor_id"), // User who performed action (nullable for system actions)
  actor_role: text("actor_role"), // Role at time of action
  actor_ip: text("actor_ip"), // IP address (partially masked if needed)
  actor_agent: text("actor_agent"), // User agent string
  action: text("action").notNull(), // e.g., "login", "logout", "availability_change", "settings_update"
  entity_type: text("entity_type"), // e.g., "user", "vehicle", "termin", "settings"
  entity_id: text("entity_id"), // ID of affected entity
  severity: text("severity").notNull().default("info"), // "info", "warning", "error"
  metadata: jsonb("metadata"), // Additional context (deltas, identifiers, NOT sensitive data)
  request_id: text("request_id"), // For correlation across services
  source: text("source").notNull().default("api"), // "api", "scheduler", "webhook"
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, event_time: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

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
