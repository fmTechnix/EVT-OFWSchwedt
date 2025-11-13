import { randomUUID } from "crypto";
import { hashPasswordSync } from "./password-utils";
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
  PushLog, InsertPushLog,
  MaengelMeldung, InsertMaengelMeldung,
  AssignmentHistory, InsertAssignmentHistory,
  AssignmentFairness, InsertAssignmentFairness,
  AvailabilityTemplate, InsertAvailabilityTemplate,
  UserReminderSettings, InsertUserReminderSettings,
  AlarmEvent, InsertAlarmEvent,
  AaoStichwort, InsertAaoStichwort,
  VehiclePriority, InsertVehiclePriority,
  AuditLog, InsertAuditLog
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
  
  // Push Logs
  createPushLog(log: {
    user_id: string;
    message_type: string;
    title: string;
    body: string;
    status: string;
    error_message?: string;
    subscription_endpoint?: string;
    status_code?: number;
    sent_by: string;
  }): Promise<void>;
  getAllPushLogs(filters?: { userId?: string; status?: string; messageType?: string; limit?: number }): Promise<PushLog[]>;
  
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
  
  // Vehicle Priorities (Fahrzeug-Prioritäten für taktische Besetzung)
  getAllVehiclePriorities(): Promise<VehiclePriority[]>;
  getVehiclePriority(vehicleType: string): Promise<VehiclePriority | undefined>;
  updateVehiclePriority(vehicleType: string, updates: Partial<InsertVehiclePriority>): Promise<VehiclePriority>;
  
  // Audit Logs (System-weite Event-Logs)
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: { 
    startDate?: string; 
    endDate?: string; 
    action?: string; 
    actorId?: string; 
    entityType?: string;
    severity?: string;
    limit?: number; 
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private vehicles: Map<number, Vehicle>;
  private qualifikationen: Map<number, Qualifikation>;
  private termine: Map<number, Termin>;
  private terminZusagen: Map<number, TerminZusage>;
  private maengelMeldungen: Map<number, MaengelMeldung>;
  private pushLogs: Map<number, PushLog>;
  private pushSubscriptions: Map<string, PushSubscription>;
  private auditLogs: AuditLog[];
  private nextPushSubscriptionId: number;
  private einsatz: Einsatz;
  private settings: Settings;
  private nextVehicleId: number;
  private nextQualifikationId: number;
  private nextTerminId: number;
  private nextZusageId: number;
  private nextMaengelMeldungId: number;
  private nextPushLogId: number;
  private nextAuditLogId: number;

  constructor() {
    this.users = new Map();
    this.vehicles = new Map();
    this.qualifikationen = new Map();
    this.termine = new Map();
    this.terminZusagen = new Map();
    this.maengelMeldungen = new Map();
    this.pushLogs = new Map();
    this.pushSubscriptions = new Map();
    this.auditLogs = [];
    this.nextVehicleId = 1;
    this.nextQualifikationId = 1;
    this.nextTerminId = 1;
    this.nextZusageId = 1;
    this.nextMaengelMeldungId = 1;
    this.nextPushLogId = 1;
    this.nextPushSubscriptionId = 1;
    this.nextAuditLogId = 1;

    // Initialize default qualifikationen (must be before users)
    this.initializeQualifikationen();
    
    // Initialize default users (now synchronous with hashPasswordSync)
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
      assignment_mode: "manual",
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
    const usersData: Omit<User, "id">[] = [
      {
        username: "admin",
        password: hashPasswordSync("admin"),
        role: "admin",
        vorname: "Admin",
        nachname: "User",
        qualifikationen: ["TM", "AGT", "Maschinist", "GF"],
        muss_passwort_aendern: false,
      },
      {
        username: "moderator",
        password: hashPasswordSync("moderator123"),
        role: "moderator",
        vorname: "Moderator",
        nachname: "User",
        qualifikationen: ["TM", "Sprechfunker"],
        muss_passwort_aendern: false,
      },
      {
        username: "member",
        password: hashPasswordSync("member123"),
        role: "member",
        vorname: "Member",
        nachname: "User",
        qualifikationen: ["TM"],
        muss_passwort_aendern: false,
      },
      {
        username: "mueller",
        password: hashPasswordSync("demo123"),
        role: "member",
        vorname: "Thomas",
        nachname: "Müller",
        qualifikationen: ["TM", "AGT", "Maschinist"],
        muss_passwort_aendern: false,
      },
      {
        username: "schmidt",
        password: hashPasswordSync("demo123"),
        role: "member",
        vorname: "Anna",
        nachname: "Schmidt",
        qualifikationen: ["TM", "AGT", "San"],
        muss_passwort_aendern: false,
      },
      {
        username: "weber",
        password: hashPasswordSync("demo123"),
        role: "member",
        vorname: "Michael",
        nachname: "Weber",
        qualifikationen: ["TM", "Maschinist", "Sprechfunker"],
        muss_passwort_aendern: false,
      },
      {
        username: "fischer",
        password: hashPasswordSync("demo123"),
        role: "member",
        vorname: "Sarah",
        nachname: "Fischer",
        qualifikationen: ["TM", "AGT"],
        muss_passwort_aendern: false,
      },
      {
        username: "becker",
        password: hashPasswordSync("demo123"),
        role: "member",
        vorname: "Markus",
        nachname: "Becker",
        qualifikationen: ["TM", "GF", "AGT", "Maschinist"],
        muss_passwort_aendern: false,
      },
      {
        username: "hoffmann",
        password: hashPasswordSync("demo123"),
        role: "member",
        vorname: "Lisa",
        nachname: "Hoffmann",
        qualifikationen: ["TM", "San"],
        muss_passwort_aendern: false,
      },
      {
        username: "koch",
        password: hashPasswordSync("demo123"),
        role: "member",
        vorname: "Jan",
        nachname: "Koch",
        qualifikationen: ["TM", "AGT", "Sprechfunker"],
        muss_passwort_aendern: false,
      },
      {
        username: "schneider",
        password: hashPasswordSync("demo123"),
        role: "member",
        vorname: "Julia",
        nachname: "Schneider",
        qualifikationen: ["TM", "Maschinist"],
        muss_passwort_aendern: false,
      },
    ];
    
    for (const userData of usersData) {
      const user: User = {
        id: randomUUID(),
        ...userData,
      };
      this.users.set(user.id, user);
    }
  }

  private initializeVehicles() {
    const vehicles: Omit<Vehicle, "id">[] = [
      { name: "HLF 20", funk: "Florian Schwedt 1/46/1", besatzung: 9 },
      { name: "DLK 23/12", funk: "Florian Schwedt 1/33/1", besatzung: 3 },
      { name: "LF 10", funk: "Florian Schwedt 1/44/1", besatzung: 9 },
      { name: "RW 1", funk: "Florian Schwedt 1/52/1", besatzung: 3 },
      { name: "MTW 1", funk: "Florian Schwedt 1/19/1", besatzung: 6 },
      { name: "ELW 1", funk: "Florian Schwedt 1/11/1", besatzung: 3 },
    ];
    
    for (const vehicleData of vehicles) {
      const vehicle: Vehicle = {
        id: this.nextVehicleId++,
        ...vehicleData,
      };
      this.vehicles.set(vehicle.id, vehicle);
    }
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
    throw new Error("Vehicle configs not available in development mode");
  }

  async updateVehicleConfig(_id: number, _updates: Partial<InsertVehicleConfig>): Promise<VehicleConfig> {
    throw new Error("Vehicle configs not available in development mode");
  }

  async deleteVehicleConfig(_id: number): Promise<void> {
    throw new Error("Vehicle configs not available in development mode");
  }

  // Availabilities - Development stubs
  async getUserAvailability(_userId: string, _date: string): Promise<Availability | undefined> {
    return undefined;
  }

  async getUserAvailabilities(_userId: string): Promise<Availability[]> {
    return [];
  }

  async setAvailability(_availability: InsertAvailability): Promise<Availability> {
    throw new Error("Availability management not available in development mode");
  }

  async deleteAvailability(_id: number): Promise<void> {
    throw new Error("Availability management not available in development mode");
  }

  async getAvailableUsers(_date: string): Promise<User[]> {
    return [];
  }

  // Current Assignments (in-memory stubs for development)
  async getCurrentAssignments(): Promise<CurrentAssignment[]> {
    return [];
  }

  async getUserAssignment(_userId: string): Promise<CurrentAssignment | undefined> {
    return undefined;
  }

  async setCurrentAssignments(_assignments: InsertCurrentAssignment[]): Promise<CurrentAssignment[]> {
    return [];
  }

  async clearCurrentAssignments(): Promise<void> {
    return;
  }

  // Push Subscriptions (in-memory storage)
  async savePushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    const pushSubscription: PushSubscription = {
      id: this.nextPushSubscriptionId++,
      user_id: subscription.user_id,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      created_at: new Date(),
    };
    this.pushSubscriptions.set(subscription.endpoint, pushSubscription);
    return pushSubscription;
  }

  async getUserPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    return Array.from(this.pushSubscriptions.values()).filter(
      (sub) => sub.user_id === userId
    );
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    this.pushSubscriptions.delete(endpoint);
  }

  // Push Logs
  async createPushLog(log: {
    user_id: string;
    message_type: string;
    title: string;
    body: string;
    status: string;
    error_message?: string;
    subscription_endpoint?: string;
    status_code?: number;
    sent_by: string;
  }): Promise<void> {
    const pushLog: PushLog = {
      id: this.nextPushLogId++,
      user_id: log.user_id,
      message_type: log.message_type,
      title: log.title,
      body: log.body,
      status: log.status,
      error_message: log.error_message || null,
      subscription_endpoint: log.subscription_endpoint || null,
      status_code: log.status_code || null,
      sent_at: new Date(),
      sent_by: log.sent_by,
    };
    this.pushLogs.set(pushLog.id, pushLog);
    console.log('📝 Push Log created:', pushLog);
  }

  async getAllPushLogs(filters?: { userId?: string; status?: string; messageType?: string; limit?: number }): Promise<PushLog[]> {
    let logs = Array.from(this.pushLogs.values());

    // Apply filters
    if (filters?.userId) {
      logs = logs.filter(log => log.user_id === filters.userId);
    }
    if (filters?.status) {
      logs = logs.filter(log => log.status === filters.status);
    }
    if (filters?.messageType) {
      logs = logs.filter(log => log.message_type === filters.messageType);
    }

    // Sort by sent_at descending (newest first)
    logs.sort((a, b) => b.sent_at.getTime() - a.sent_at.getTime());

    // Apply limit (default 100)
    const limit = filters?.limit || 100;
    return logs.slice(0, limit);
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

  // Assignment History (Fairness-Tracking) - Development stubs
  async createAssignmentHistory(_insertHistory: InsertAssignmentHistory): Promise<AssignmentHistory> {
    throw new Error("Assignment history not available in development mode");
  }

  async getAssignmentHistory(_userId: string, _weeks?: number): Promise<AssignmentHistory[]> {
    return [];
  }

  async getRecentAssignmentsByPosition(_userId: string, _position: string, _weeks?: number): Promise<AssignmentHistory[]> {
    return [];
  }

  // Assignment Fairness - Development stubs
  async getFairnessMetrics(_userId: string): Promise<AssignmentFairness | undefined> {
    return undefined;
  }

  async getAllFairnessMetrics(): Promise<AssignmentFairness[]> {
    return [];
  }

  async updateFairnessMetrics(_userId: string, _position: string): Promise<AssignmentFairness> {
    throw new Error("Fairness metrics not available in development mode");
  }

  async resetFairnessMetrics(_userId: string): Promise<void> {
    return;
  }

  // Alarm Events (DE-Alarm Integration) - Development stubs
  async getAllAlarmEvents(): Promise<AlarmEvent[]> {
    return [];
  }

  async getAlarmEvent(_id: number): Promise<AlarmEvent | undefined> {
    return undefined;
  }

  async getUnprocessedAlarmEvents(): Promise<AlarmEvent[]> {
    return [];
  }

  async createAlarmEvent(_event: InsertAlarmEvent): Promise<AlarmEvent> {
    throw new Error("Alarm event creation not available in development mode");
  }

  async markAlarmAsProcessed(_id: number, _crewReassigned: boolean): Promise<AlarmEvent> {
    throw new Error("Alarm event management not available in development mode");
  }

  // AAO Stichworte (Alarm- und Ausrückeordnung) - Development stubs
  async getAllAaoStichworte(): Promise<AaoStichwort[]> {
    return [];
  }

  async getAaoStichwort(_id: number): Promise<AaoStichwort | undefined> {
    return undefined;
  }

  async getAaoStichwortByName(_stichwort: string): Promise<AaoStichwort | undefined> {
    return undefined;
  }

  async createAaoStichwort(_stichwort: InsertAaoStichwort): Promise<AaoStichwort> {
    throw new Error("AAO management not available in development mode");
  }

  async updateAaoStichwort(_id: number, _updates: Partial<InsertAaoStichwort>): Promise<AaoStichwort> {
    throw new Error("AAO management not available in development mode");
  }

  async deleteAaoStichwort(_id: number): Promise<void> {
    throw new Error("AAO management not available in development mode");
  }

  // Availability Templates - Development stubs
  async getUserTemplates(_userId: string): Promise<AvailabilityTemplate[]> {
    return [];
  }

  async createTemplate(_template: InsertAvailabilityTemplate): Promise<AvailabilityTemplate> {
    throw new Error("Templates not available in development mode");
  }

  async updateTemplate(_id: number, _updates: Partial<InsertAvailabilityTemplate>): Promise<AvailabilityTemplate> {
    throw new Error("Templates not available in development mode");
  }

  async deleteTemplate(_id: number): Promise<void> {
    throw new Error("Templates not available in development mode");
  }

  async applyTemplateToWeek(_userId: string, _templateId: number, _weekStartDate: string): Promise<Availability[]> {
    throw new Error("Templates not available in development mode");
  }

  // User Reminder Settings - Development stubs
  async getReminderSettings(_userId: string): Promise<UserReminderSettings | undefined> {
    return undefined;
  }

  async updateReminderSettings(_userId: string, _settings: Partial<InsertUserReminderSettings>): Promise<UserReminderSettings> {
    throw new Error("Reminder settings not available in development mode");
  }

  async getUsersWithRemindersEnabled(): Promise<UserReminderSettings[]> {
    // For development, return empty array (no reminder settings in MemStorage)
    return [];
  }

  // Audit Logs
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const auditLog: AuditLog = {
      id: this.nextAuditLogId++,
      event_time: new Date(),
      actor_id: log.actor_id ?? null,
      actor_role: log.actor_role ?? null,
      actor_ip: log.actor_ip ?? null,
      actor_agent: log.actor_agent ?? null,
      action: log.action,
      entity_type: log.entity_type ?? null,
      entity_id: log.entity_id ?? null,
      severity: log.severity ?? "info",
      metadata: log.metadata ?? null,
      request_id: log.request_id ?? null,
      source: log.source ?? "api",
    };
    this.auditLogs.push(auditLog);
    return auditLog;
  }

  async getAuditLogs(filters?: {
    startDate?: string;
    endDate?: string;
    action?: string;
    actorId?: string;
    entityType?: string;
    severity?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    let filtered = [...this.auditLogs];

    // Apply filters
    if (filters?.startDate) {
      const start = new Date(filters.startDate);
      filtered = filtered.filter(log => log.event_time >= start);
    }
    if (filters?.endDate) {
      const end = new Date(filters.endDate);
      filtered = filtered.filter(log => log.event_time <= end);
    }
    if (filters?.action) {
      filtered = filtered.filter(log => log.action === filters.action);
    }
    if (filters?.actorId) {
      filtered = filtered.filter(log => log.actor_id === filters.actorId);
    }
    if (filters?.entityType) {
      filtered = filtered.filter(log => log.entity_type === filters.entityType);
    }
    if (filters?.severity) {
      filtered = filtered.filter(log => log.severity === filters.severity);
    }

    // Sort by event_time DESC (newest first)
    filtered.sort((a, b) => b.event_time.getTime() - a.event_time.getTime());

    const total = filtered.length;

    // Apply pagination
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 100;
    const paginated = filtered.slice(offset, offset + limit);

    return { logs: paginated, total };
  }

  // Vehicle Priorities (stubs - not used, only PostgresStorage is used)
  async getAllVehiclePriorities(): Promise<VehiclePriority[]> {
    return [];
  }

  async getVehiclePriority(vehicleType: string): Promise<VehiclePriority | undefined> {
    return undefined;
  }

  async updateVehiclePriority(vehicleType: string, updates: Partial<InsertVehiclePriority>): Promise<VehiclePriority> {
    throw new Error("MemStorage does not support vehicle priorities");
  }
}

// Use PostgresStorage if DATABASE_URL is available, otherwise MemStorage
// This allows using the real database even in development mode
export const storage = process.env.DATABASE_URL
  ? new PostgresStorage()
  : new MemStorage();

// Initialize database on startup if using PostgresStorage
if (process.env.DATABASE_URL) {
  initializeDatabase().catch(console.error);
}
