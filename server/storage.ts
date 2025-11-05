import { randomUUID } from "crypto";
import type {
  User, InsertUser,
  Vehicle, InsertVehicle,
  Einsatz, InsertEinsatz,
  Settings, InsertSettings,
  Qualifikation, InsertQualifikation,
  Termin, InsertTermin,
  TerminZusage, InsertTerminZusage,
  BesetzungscheckResult,
  VehicleConfig, InsertVehicleConfig,
  Availability, InsertAvailability,
  CurrentAssignment, InsertCurrentAssignment,
  PushSubscription, InsertPushSubscription,
  MaengelMeldung, InsertMaengelMeldung,
  AssignmentHistory, InsertAssignmentHistory,
  AssignmentFairness, InsertAssignmentFairness,
  AvailabilityTemplate, InsertAvailabilityTemplate,
  UserReminderSettings, InsertUserReminderSettings,
  AlarmEvent, InsertAlarmEvent,
  AaoStichwort, InsertAaoStichwort
} from "@shared/schema";
import { PostgresStorage } from "./pg-storage";
import { initializeDatabase } from "./init-db";

export interface IStorage {
  // Users (unified Benutzer with qualifications)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<Omit<User, 'id'>>): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User>;
  updateUserQualifikationen(id: string, qualifikationen: string[]): Promise<User>;
  changePassword(id: string, newPassword: string): Promise<User>;
  resetPassword(id: string): Promise<User>;
  deleteUser(id: string): Promise<void>;
  
  // Vehicles
  getAllVehicles(): Promise<Vehicle[]>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: number, data: InsertVehicle): Promise<Vehicle>;
  deleteVehicle(id: number): Promise<void>;
  
  // Einsatz
  getEinsatz(): Promise<Einsatz>;
  updateEinsatz(einsatz: InsertEinsatz): Promise<Einsatz>;
  
  // Settings
  getSettings(): Promise<Settings>;
  updateSettings(settings: InsertSettings): Promise<Settings>;
  
  // Qualifikationen
  getAllQualifikationen(): Promise<Qualifikation[]>;
  createQualifikation(qualifikation: InsertQualifikation): Promise<Qualifikation>;
  deleteQualifikation(id: number): Promise<void>;
  
  // Termine
  getAllTermine(): Promise<Termin[]>;
  getTermin(id: number): Promise<Termin | undefined>;
  createTermin(termin: Omit<Termin, 'id'>): Promise<Termin>;
  updateTermin(id: number, termin: Omit<Termin, 'id'>): Promise<Termin>;
  deleteTermin(id: number): Promise<void>;
  
  // Termin Zusagen
  getTerminZusagen(terminId: number): Promise<TerminZusage[]>;
  getUserZusage(terminId: number, userId: string): Promise<TerminZusage | undefined>;
  createOrUpdateZusage(zusage: InsertTerminZusage): Promise<TerminZusage>;
  
  // Besetzungscheck
  getBesetzungscheck(): Promise<BesetzungscheckResult>;
  
  // Vehicle Configurations
  getAllVehicleConfigs(): Promise<VehicleConfig[]>;
  getVehicleConfig(id: number): Promise<VehicleConfig | undefined>;
  getVehicleConfigByName(name: string): Promise<VehicleConfig | undefined>;
  createVehicleConfig(config: InsertVehicleConfig): Promise<VehicleConfig>;
  updateVehicleConfig(id: number, updates: Partial<InsertVehicleConfig>): Promise<VehicleConfig>;
  deleteVehicleConfig(id: number): Promise<void>;
  
  // Availabilities
  getUserAvailability(userId: string, date: string): Promise<Availability | undefined>;
  getUserAvailabilities(userId: string): Promise<Availability[]>;
  setAvailability(availability: InsertAvailability): Promise<Availability>;
  deleteAvailability(id: number): Promise<void>;
  getAvailableUsers(date: string): Promise<User[]>;
  
  // Availability Templates
  getUserTemplates(userId: string): Promise<AvailabilityTemplate[]>;
  createTemplate(template: InsertAvailabilityTemplate): Promise<AvailabilityTemplate>;
  updateTemplate(id: number, updates: Partial<InsertAvailabilityTemplate>): Promise<AvailabilityTemplate>;
  deleteTemplate(id: number): Promise<void>;
  applyTemplateToWeek(userId: string, templateId: number, weekStartDate: string): Promise<Availability[]>;
  
  // User Reminder Settings
  getReminderSettings(userId: string): Promise<UserReminderSettings | undefined>;
  updateReminderSettings(userId: string, settings: Partial<InsertUserReminderSettings>): Promise<UserReminderSettings>;
  getUsersWithRemindersEnabled(): Promise<UserReminderSettings[]>;
  
  // Current Assignments
  getCurrentAssignments(): Promise<CurrentAssignment[]>;
  getUserAssignment(userId: string): Promise<CurrentAssignment | undefined>;
  setCurrentAssignments(assignments: InsertCurrentAssignment[]): Promise<CurrentAssignment[]>;
  clearCurrentAssignments(): Promise<void>;
  
  // Push Subscriptions
  savePushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  getUserPushSubscriptions(userId: string): Promise<PushSubscription[]>;
  deletePushSubscription(endpoint: string): Promise<void>;
  
  // Mängelmeldungen
  getAllMaengelMeldungen(): Promise<MaengelMeldung[]>;
  getMaengelMeldung(id: number): Promise<MaengelMeldung | undefined>;
  getMaengelMeldungenByVehicle(vehicleId: number): Promise<MaengelMeldung[]>;
  createMaengelMeldung(meldung: InsertMaengelMeldung): Promise<MaengelMeldung>;
  updateMaengelMeldung(id: number, updates: Partial<InsertMaengelMeldung>): Promise<MaengelMeldung>;
  deleteMaengelMeldung(id: number): Promise<void>;
  
  // Assignment History (Fairness-Tracking)
  createAssignmentHistory(insertHistory: InsertAssignmentHistory): Promise<AssignmentHistory>;
  getAssignmentHistory(userId: string, weeks?: number): Promise<AssignmentHistory[]>;
  getRecentAssignmentsByPosition(userId: string, position: string, weeks?: number): Promise<AssignmentHistory[]>;
  
  // Assignment Fairness
  getFairnessMetrics(userId: string): Promise<AssignmentFairness | undefined>;
  getAllFairnessMetrics(): Promise<AssignmentFairness[]>;
  updateFairnessMetrics(userId: string, position: string): Promise<AssignmentFairness>;
  resetFairnessMetrics(userId: string): Promise<void>;
  
  // Alarm Events (DE-Alarm Integration)
  getAllAlarmEvents(): Promise<AlarmEvent[]>;
  getAlarmEvent(id: number): Promise<AlarmEvent | undefined>;
  getUnprocessedAlarmEvents(): Promise<AlarmEvent[]>;
  createAlarmEvent(event: InsertAlarmEvent): Promise<AlarmEvent>;
  markAlarmAsProcessed(id: number, crewReassigned: boolean): Promise<AlarmEvent>;
  
  // AAO Stichworte (Alarm- und Ausrückeordnung)
  getAllAaoStichworte(): Promise<AaoStichwort[]>;
  getAaoStichwort(id: number): Promise<AaoStichwort | undefined>;
  getAaoStichwortByName(stichwort: string): Promise<AaoStichwort | undefined>;
  createAaoStichwort(stichwort: InsertAaoStichwort): Promise<AaoStichwort>;
  updateAaoStichwort(id: number, updates: Partial<InsertAaoStichwort>): Promise<AaoStichwort>;
  deleteAaoStichwort(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private vehicles: Map<number, Vehicle>;
  private qualifikationen: Map<number, Qualifikation>;
  private termine: Map<number, Termin>;
  private terminZusagen: Map<number, TerminZusage>;
  private maengelMeldungen: Map<number, MaengelMeldung>;
  private einsatz: Einsatz;
  private settings: Settings;
  private nextVehicleId: number;
  private nextQualifikationId: number;
  private nextTerminId: number;
  private nextZusageId: number;
  private nextMaengelMeldungId: number;

  constructor() {
    this.users = new Map();
    this.vehicles = new Map();
    this.qualifikationen = new Map();
    this.termine = new Map();
    this.terminZusagen = new Map();
    this.maengelMeldungen = new Map();
    this.nextVehicleId = 1;
    this.nextQualifikationId = 1;
    this.nextTerminId = 1;
    this.nextZusageId = 1;
    this.nextMaengelMeldungId = 1;

    // Initialize default qualifikationen (must be before users)
    this.initializeQualifikationen();
    
    // Initialize default users with qualifikationen
    this.initializeUsers();
    
    // Initialize default vehicles
    this.initializeVehicles();
    
    // Initialize default einsatz
    this.einsatz = {
      id: 1,
      stichwort: "B: Kleinbrand",
      bemerkung: "",
      mannschaftsbedarf: 9,
    };
    
    // Initialize default settings
    this.settings = {
      id: 1,
      min_agt: 2,
      min_maschinist: 1,
      min_gf: 1,
      rotation_window: 4,
      rotation_weights: null,
    };
  }

  private initializeQualifikationen() {
    const qualifikationen: Omit<Qualifikation, "id">[] = [
      { kuerzel: "TM", name: "Truppmann", beschreibung: "Grundausbildung für Feuerwehrleute" },
      { kuerzel: "AGT", name: "Atemschutzgeräteträger", beschreibung: "Berechtigung zum Tragen von Atemschutzgeräten" },
      { kuerzel: "Maschinist", name: "Maschinist", beschreibung: "Befähigung zur Bedienung von Feuerwehrfahrzeugen" },
      { kuerzel: "GF", name: "Gruppenführer", beschreibung: "Führungsausbildung für Gruppen" },
      { kuerzel: "Sprechfunker", name: "Sprechfunker", beschreibung: "Berechtigung zur Funkkommunikation" },
      { kuerzel: "San", name: "Sanitäter", beschreibung: "Sanitätsausbildung" },
    ];

    for (const qual of qualifikationen) {
      const qualifikation: Qualifikation = {
        id: this.nextQualifikationId++,
        ...qual,
      };
      this.qualifikationen.set(qualifikation.id, qualifikation);
    }
  }

  private initializeUsers() {
    const admin: User = {
      id: randomUUID(),
      username: "admin",
      password: "admin",
      role: "admin",
      vorname: "Admin",
      nachname: "User",
      qualifikationen: ["TM", "AGT", "Maschinist", "GF"],
      muss_passwort_aendern: false,
    };
    
    const moderator: User = {
      id: randomUUID(),
      username: "moderator",
      password: "moderator123",
      role: "moderator",
      vorname: "Moderator",
      nachname: "User",
      qualifikationen: ["TM", "Sprechfunker"],
      muss_passwort_aendern: false,
    };
    
    const member: User = {
      id: randomUUID(),
      username: "member",
      password: "member123",
      role: "member",
      vorname: "Member",
      nachname: "User",
      qualifikationen: ["TM"],
      muss_passwort_aendern: false,
    };
    
    this.users.set(admin.id, admin);
    this.users.set(moderator.id, moderator);
    this.users.set(member.id, member);
  }

  private initializeVehicles() {
    const vehicle1: Vehicle = {
      id: this.nextVehicleId++,
      name: "HLF 20",
      funk: "Florian Schwedt 1/46/1",
      besatzung: 9,
    };
    
    const vehicle2: Vehicle = {
      id: this.nextVehicleId++,
      name: "DLK 23/12",
      funk: "Florian Schwedt 1/33/1",
      besatzung: 3,
    };
    
    this.vehicles.set(vehicle1.id, vehicle1);
    this.vehicles.set(vehicle2.id, vehicle2);
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser,
      id,
      qualifikationen: insertUser.qualifikationen || [],
      muss_passwort_aendern: insertUser.muss_passwort_aendern ?? false,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<Omit<User, 'id'>>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error("User not found");
    }
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error("User not found");
    }
    user.role = role;
    this.users.set(id, user);
    return user;
  }

  async updateUserQualifikationen(id: string, qualifikationen: string[]): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error("User not found");
    }
    user.qualifikationen = qualifikationen;
    this.users.set(id, user);
    return user;
  }

  async changePassword(id: string, newPassword: string): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error("User not found");
    }
    user.password = newPassword;
    user.muss_passwort_aendern = false;
    this.users.set(id, user);
    return user;
  }

  async resetPassword(id: string): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error("User not found");
    }
    user.password = "Feuer123";
    user.muss_passwort_aendern = true;
    this.users.set(id, user);
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    this.users.delete(id);
  }

  // Vehicle methods
  async getAllVehicles(): Promise<Vehicle[]> {
    return Array.from(this.vehicles.values());
  }

  async createVehicle(insertVehicle: InsertVehicle): Promise<Vehicle> {
    const id = this.nextVehicleId++;
    const vehicle: Vehicle = { id, ...insertVehicle };
    this.vehicles.set(id, vehicle);
    return vehicle;
  }

  async updateVehicle(id: number, data: InsertVehicle): Promise<Vehicle> {
    const vehicle: Vehicle = { id, ...data };
    this.vehicles.set(id, vehicle);
    return vehicle;
  }

  async deleteVehicle(id: number): Promise<void> {
    this.vehicles.delete(id);
  }

  // Einsatz methods
  async getEinsatz(): Promise<Einsatz> {
    return this.einsatz;
  }

  async updateEinsatz(insertEinsatz: InsertEinsatz): Promise<Einsatz> {
    this.einsatz = { id: 1, ...insertEinsatz };
    return this.einsatz;
  }

  // Settings methods
  async getSettings(): Promise<Settings> {
    return this.settings;
  }

  async updateSettings(insertSettings: InsertSettings): Promise<Settings> {
    this.settings = { 
      id: 1, 
      ...insertSettings,
      rotation_window: insertSettings.rotation_window ?? 4,
      rotation_weights: insertSettings.rotation_weights ?? null,
    };
    return this.settings;
  }

  // Qualifikationen methods
  async getAllQualifikationen(): Promise<Qualifikation[]> {
    return Array.from(this.qualifikationen.values());
  }

  async createQualifikation(insertQualifikation: InsertQualifikation): Promise<Qualifikation> {
    const id = this.nextQualifikationId++;
    const qualifikation: Qualifikation = { ...insertQualifikation, id };
    this.qualifikationen.set(id, qualifikation);
    return qualifikation;
  }

  async deleteQualifikation(id: number): Promise<void> {
    const qual = this.qualifikationen.get(id);
    if (qual) {
      // Remove this qualification from all users
      const users = Array.from(this.users.values());
      for (const user of users) {
        user.qualifikationen = user.qualifikationen.filter((q: string) => q !== qual.kuerzel);
      }
    }
    this.qualifikationen.delete(id);
  }

  // Termine methods
  async getAllTermine(): Promise<Termin[]> {
    return Array.from(this.termine.values()).sort((a, b) => {
      if (a.datum !== b.datum) {
        return a.datum.localeCompare(b.datum);
      }
      return a.uhrzeit.localeCompare(b.uhrzeit);
    });
  }

  async getTermin(id: number): Promise<Termin | undefined> {
    return this.termine.get(id);
  }

  async createTermin(terminData: Omit<Termin, 'id'>): Promise<Termin> {
    const id = this.nextTerminId++;
    const termin: Termin = { id, ...terminData };
    this.termine.set(id, termin);
    return termin;
  }

  async updateTermin(id: number, terminData: Omit<Termin, 'id'>): Promise<Termin> {
    const termin: Termin = { id, ...terminData };
    this.termine.set(id, termin);
    return termin;
  }

  async deleteTermin(id: number): Promise<void> {
    this.termine.delete(id);
    const zusagen = Array.from(this.terminZusagen.values()).filter(z => z.termin_id === id);
    for (const zusage of zusagen) {
      this.terminZusagen.delete(zusage.id);
    }
  }

  // Termin Zusagen methods
  async getTerminZusagen(terminId: number): Promise<TerminZusage[]> {
    return Array.from(this.terminZusagen.values()).filter(
      (zusage) => zusage.termin_id === terminId
    );
  }

  async getUserZusage(terminId: number, userId: string): Promise<TerminZusage | undefined> {
    return Array.from(this.terminZusagen.values()).find(
      (zusage) => zusage.termin_id === terminId && zusage.user_id === userId
    );
  }

  async createOrUpdateZusage(insertZusage: InsertTerminZusage): Promise<TerminZusage> {
    const existing = await this.getUserZusage(insertZusage.termin_id, insertZusage.user_id);
    
    if (existing) {
      existing.status = insertZusage.status;
      this.terminZusagen.set(existing.id, existing);
      return existing;
    } else {
      const id = this.nextZusageId++;
      const zusage: TerminZusage = { id, ...insertZusage };
      this.terminZusagen.set(id, zusage);
      return zusage;
    }
  }

  // Besetzungscheck - now uses users instead of kameraden
  async getBesetzungscheck(): Promise<BesetzungscheckResult> {
    const users = await this.getAllUsers();
    const settings = await this.getSettings();
    const einsatz = await this.getEinsatz();
    
    const countWithQual = (qual: string): number => {
      return users.filter(u => u.qualifikationen.includes(qual)).length;
    };
    
    const vorhanden = {
      agt: countWithQual("AGT"),
      maschinist: countWithQual("Maschinist"),
      gf: countWithQual("GF"),
      gesamt: users.length,
    };
    
    const minima = {
      min_agt: settings.min_agt,
      min_maschinist: settings.min_maschinist,
      min_gf: settings.min_gf,
      mannschaftsbedarf: einsatz.mannschaftsbedarf,
    };
    
    const erfuellt = (
      vorhanden.agt >= minima.min_agt &&
      vorhanden.maschinist >= minima.min_maschinist &&
      vorhanden.gf >= minima.min_gf &&
      vorhanden.gesamt >= minima.mannschaftsbedarf
    );
    
    return { vorhanden, minima, erfuellt };
  }

  // Vehicle Configurations (stub implementation - not used)
  async getAllVehicleConfigs(): Promise<VehicleConfig[]> {
    return [];
  }

  async getVehicleConfig(_id: number): Promise<VehicleConfig | undefined> {
    return undefined;
  }

  async getVehicleConfigByName(_name: string): Promise<VehicleConfig | undefined> {
    return undefined;
  }

  async createVehicleConfig(_config: InsertVehicleConfig): Promise<VehicleConfig> {
    throw new Error("Not implemented in MemStorage");
  }

  async updateVehicleConfig(_id: number, _updates: Partial<InsertVehicleConfig>): Promise<VehicleConfig> {
    throw new Error("Not implemented in MemStorage");
  }

  async deleteVehicleConfig(_id: number): Promise<void> {
    throw new Error("Not implemented in MemStorage");
  }

  // Availabilities
  async getUserAvailability(_userId: string, _date: string): Promise<Availability | undefined> {
    throw new Error("Not implemented in MemStorage");
  }

  async getUserAvailabilities(_userId: string): Promise<Availability[]> {
    throw new Error("Not implemented in MemStorage");
  }

  async setAvailability(_availability: InsertAvailability): Promise<Availability> {
    throw new Error("Not implemented in MemStorage");
  }

  async deleteAvailability(_id: number): Promise<void> {
    throw new Error("Not implemented in MemStorage");
  }

  async getAvailableUsers(_date: string): Promise<User[]> {
    throw new Error("Not implemented in MemStorage");
  }

  // Current Assignments
  async getCurrentAssignments(): Promise<CurrentAssignment[]> {
    throw new Error("Not implemented in MemStorage");
  }

  async getUserAssignment(_userId: string): Promise<CurrentAssignment | undefined> {
    throw new Error("Not implemented in MemStorage");
  }

  async setCurrentAssignments(_assignments: InsertCurrentAssignment[]): Promise<CurrentAssignment[]> {
    throw new Error("Not implemented in MemStorage");
  }

  async clearCurrentAssignments(): Promise<void> {
    throw new Error("Not implemented in MemStorage");
  }

  // Push Subscriptions (stub)
  async savePushSubscription(_subscription: InsertPushSubscription): Promise<PushSubscription> {
    throw new Error("Not implemented in MemStorage");
  }

  async getUserPushSubscriptions(_userId: string): Promise<PushSubscription[]> {
    throw new Error("Not implemented in MemStorage");
  }

  async deletePushSubscription(_endpoint: string): Promise<void> {
    throw new Error("Not implemented in MemStorage");
  }

  // Mängelmeldungen
  async getAllMaengelMeldungen(): Promise<MaengelMeldung[]> {
    return Array.from(this.maengelMeldungen.values());
  }

  async getMaengelMeldung(id: number): Promise<MaengelMeldung | undefined> {
    return this.maengelMeldungen.get(id);
  }

  async getMaengelMeldungenByVehicle(vehicleId: number): Promise<MaengelMeldung[]> {
    return Array.from(this.maengelMeldungen.values()).filter(
      (meldung) => meldung.vehicle_id === vehicleId
    );
  }

  async createMaengelMeldung(insertMeldung: InsertMaengelMeldung): Promise<MaengelMeldung> {
    const id = this.nextMaengelMeldungId++;
    const meldung: MaengelMeldung = {
      id,
      vehicle_id: insertMeldung.vehicle_id,
      beschreibung: insertMeldung.beschreibung,
      status: insertMeldung.status || "offen",
      melder_id: insertMeldung.melder_id,
      fotos: insertMeldung.fotos || [],
      bemerkung: insertMeldung.bemerkung || null,
      erstellt_am: new Date(),
      behoben_am: null,
    };
    this.maengelMeldungen.set(id, meldung);
    return meldung;
  }

  async updateMaengelMeldung(id: number, updates: Partial<InsertMaengelMeldung>): Promise<MaengelMeldung> {
    const meldung = this.maengelMeldungen.get(id);
    if (!meldung) {
      throw new Error(`Mängelmeldung mit ID ${id} nicht gefunden`);
    }
    
    // Only update fields that are provided (not undefined)
    const updatedMeldung: MaengelMeldung = { ...meldung };
    
    if (updates.status !== undefined) updatedMeldung.status = updates.status;
    if (updates.bemerkung !== undefined) updatedMeldung.bemerkung = updates.bemerkung;
    
    // If status is being set to "behoben", set behoben_am
    if (updates.status === "behoben" && !meldung.behoben_am) {
      updatedMeldung.behoben_am = new Date();
    }
    
    this.maengelMeldungen.set(id, updatedMeldung);
    return updatedMeldung;
  }

  async deleteMaengelMeldung(id: number): Promise<void> {
    this.maengelMeldungen.delete(id);
  }

  // Assignment History (Fairness-Tracking) - Stub implementations
  async createAssignmentHistory(_insertHistory: InsertAssignmentHistory): Promise<AssignmentHistory> {
    throw new Error("Not implemented in MemStorage");
  }

  async getAssignmentHistory(_userId: string, _weeks?: number): Promise<AssignmentHistory[]> {
    throw new Error("Not implemented in MemStorage");
  }

  async getRecentAssignmentsByPosition(_userId: string, _position: string, _weeks?: number): Promise<AssignmentHistory[]> {
    throw new Error("Not implemented in MemStorage");
  }

  // Assignment Fairness - Stub implementations
  async getFairnessMetrics(_userId: string): Promise<AssignmentFairness | undefined> {
    throw new Error("Not implemented in MemStorage");
  }

  async getAllFairnessMetrics(): Promise<AssignmentFairness[]> {
    throw new Error("Not implemented in MemStorage");
  }

  async updateFairnessMetrics(_userId: string, _position: string): Promise<AssignmentFairness> {
    throw new Error("Not implemented in MemStorage");
  }

  async resetFairnessMetrics(_userId: string): Promise<void> {
    throw new Error("Not implemented in MemStorage");
  }

  // Alarm Events (DE-Alarm Integration)
  async getAllAlarmEvents(): Promise<AlarmEvent[]> {
    throw new Error("Not implemented in MemStorage - use PostgresStorage");
  }

  async getAlarmEvent(_id: number): Promise<AlarmEvent | undefined> {
    throw new Error("Not implemented in MemStorage - use PostgresStorage");
  }

  async getUnprocessedAlarmEvents(): Promise<AlarmEvent[]> {
    throw new Error("Not implemented in MemStorage - use PostgresStorage");
  }

  async createAlarmEvent(_event: InsertAlarmEvent): Promise<AlarmEvent> {
    throw new Error("Not implemented in MemStorage - use PostgresStorage");
  }

  async markAlarmAsProcessed(_id: number, _crewReassigned: boolean): Promise<AlarmEvent> {
    throw new Error("Not implemented in MemStorage - use PostgresStorage");
  }

  // AAO Stichworte (Alarm- und Ausrückeordnung)
  async getAllAaoStichworte(): Promise<AaoStichwort[]> {
    throw new Error("Not implemented in MemStorage - use PostgresStorage");
  }

  async getAaoStichwort(_id: number): Promise<AaoStichwort | undefined> {
    throw new Error("Not implemented in MemStorage - use PostgresStorage");
  }

  async getAaoStichwortByName(_stichwort: string): Promise<AaoStichwort | undefined> {
    throw new Error("Not implemented in MemStorage - use PostgresStorage");
  }

  async createAaoStichwort(_stichwort: InsertAaoStichwort): Promise<AaoStichwort> {
    throw new Error("Not implemented in MemStorage - use PostgresStorage");
  }

  async updateAaoStichwort(_id: number, _updates: Partial<InsertAaoStichwort>): Promise<AaoStichwort> {
    throw new Error("Not implemented in MemStorage - use PostgresStorage");
  }

  async deleteAaoStichwort(_id: number): Promise<void> {
    throw new Error("Not implemented in MemStorage - use PostgresStorage");
  }

  // Availability Templates
  async getUserTemplates(_userId: string): Promise<AvailabilityTemplate[]> {
    throw new Error("Not implemented in MemStorage");
  }

  async createTemplate(_template: InsertAvailabilityTemplate): Promise<AvailabilityTemplate> {
    throw new Error("Not implemented in MemStorage");
  }

  async updateTemplate(_id: number, _updates: Partial<InsertAvailabilityTemplate>): Promise<AvailabilityTemplate> {
    throw new Error("Not implemented in MemStorage");
  }

  async deleteTemplate(_id: number): Promise<void> {
    throw new Error("Not implemented in MemStorage");
  }

  async applyTemplateToWeek(_userId: string, _templateId: number, _weekStartDate: string): Promise<Availability[]> {
    throw new Error("Not implemented in MemStorage");
  }

  // User Reminder Settings
  async getReminderSettings(_userId: string): Promise<UserReminderSettings | undefined> {
    throw new Error("Not implemented in MemStorage");
  }

  async updateReminderSettings(_userId: string, _settings: Partial<InsertUserReminderSettings>): Promise<UserReminderSettings> {
    throw new Error("Not implemented in MemStorage");
  }

  async getUsersWithRemindersEnabled(): Promise<UserReminderSettings[]> {
    throw new Error("Not implemented in MemStorage");
  }
}

// Use PostgresStorage for persistent data storage
export const storage = new PostgresStorage();

// Initialize database on startup
initializeDatabase().catch(console.error);
