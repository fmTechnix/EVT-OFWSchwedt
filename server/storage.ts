import { randomUUID } from "crypto";
import type {
  User, InsertUser,
  Vehicle, InsertVehicle,
  Kamerad, InsertKamerad,
  Einsatz, InsertEinsatz,
  Settings, InsertSettings,
  Qualifikation, InsertQualifikation,
  Termin, InsertTermin,
  TerminZusage, InsertTerminZusage,
  BesetzungscheckResult
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User>;
  changePassword(id: string, newPassword: string): Promise<User>;
  
  // Vehicles
  getAllVehicles(): Promise<Vehicle[]>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  deleteVehicle(id: number): Promise<void>;
  
  // Kameraden
  getAllKameraden(): Promise<Kamerad[]>;
  createKamerad(kamerad: InsertKamerad): Promise<Kamerad>;
  deleteKamerad(id: number): Promise<void>;
  seedKameraden(): Promise<void>;
  
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
  createTermin(termin: InsertTermin): Promise<Termin>;
  updateTermin(id: number, termin: InsertTermin): Promise<Termin>;
  deleteTermin(id: number): Promise<void>;
  
  // Termin Zusagen
  getTerminZusagen(terminId: number): Promise<TerminZusage[]>;
  getUserZusage(terminId: number, userId: string): Promise<TerminZusage | undefined>;
  createOrUpdateZusage(zusage: InsertTerminZusage): Promise<TerminZusage>;
  
  // Besetzungscheck
  getBesetzungscheck(): Promise<BesetzungscheckResult>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private vehicles: Map<number, Vehicle>;
  private kameraden: Map<number, Kamerad>;
  private qualifikationen: Map<number, Qualifikation>;
  private termine: Map<number, Termin>;
  private terminZusagen: Map<number, TerminZusage>;
  private einsatz: Einsatz;
  private settings: Settings;
  private nextVehicleId: number;
  private nextKameradId: number;
  private nextQualifikationId: number;
  private nextTerminId: number;
  private nextZusageId: number;

  constructor() {
    this.users = new Map();
    this.vehicles = new Map();
    this.kameraden = new Map();
    this.qualifikationen = new Map();
    this.termine = new Map();
    this.terminZusagen = new Map();
    this.nextVehicleId = 1;
    this.nextKameradId = 1;
    this.nextQualifikationId = 1;
    this.nextTerminId = 1;
    this.nextZusageId = 1;

    // Initialize default users
    this.initializeUsers();
    
    // Initialize default qualifikationen (must be before kameraden)
    this.initializeQualifikationen();
    
    // Initialize default vehicles
    this.initializeVehicles();
    
    // Initialize default kameraden
    this.initializeKameraden();
    
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
      schichtlaenge_std: 12,
      min_agt: 2,
      min_maschinist: 1,
      min_gf: 1,
    };
  }

  private initializeUsers() {
    const admin: User = {
      id: randomUUID(),
      username: "admin",
      password: "admin", // In production, this should be hashed
      role: "admin",
      name: "Admin",
      muss_passwort_aendern: false,
    };
    
    const moderator: User = {
      id: randomUUID(),
      username: "moderator",
      password: "moderator", // In production, this should be hashed
      role: "moderator",
      name: "Moderator",
      muss_passwort_aendern: false,
    };
    
    const member: User = {
      id: randomUUID(),
      username: "member",
      password: "member", // In production, this should be hashed
      role: "member",
      name: "Mitglied",
      muss_passwort_aendern: false,
    };
    
    this.users.set(admin.id, admin);
    this.users.set(moderator.id, moderator);
    this.users.set(member.id, member);
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

  private initializeKameraden() {
    const kamerad1: Kamerad = {
      id: this.nextKameradId++,
      name: "Max Mustermann",
      qualifikationen: ["TM", "Sprechfunker"],
    };
    
    const kamerad2: Kamerad = {
      id: this.nextKameradId++,
      name: "Anna Beispiel",
      qualifikationen: ["TM", "AGT"],
    };
    
    this.kameraden.set(kamerad1.id, kamerad1);
    this.kameraden.set(kamerad2.id, kamerad2);
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
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
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

  async changePassword(id: string, newPassword: string): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error("User not found");
    }
    user.password = newPassword; // In production, this should be hashed
    user.muss_passwort_aendern = false;
    this.users.set(id, user);
    return user;
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

  async deleteVehicle(id: number): Promise<void> {
    this.vehicles.delete(id);
  }

  // Kamerad methods
  async getAllKameraden(): Promise<Kamerad[]> {
    return Array.from(this.kameraden.values());
  }

  async createKamerad(insertKamerad: InsertKamerad): Promise<Kamerad> {
    const id = this.nextKameradId++;
    const kamerad: Kamerad = { id, ...insertKamerad };
    this.kameraden.set(id, kamerad);
    return kamerad;
  }

  async deleteKamerad(id: number): Promise<void> {
    this.kameraden.delete(id);
  }

  async seedKameraden(): Promise<void> {
    // Clear existing kameraden
    this.kameraden.clear();
    this.nextKameradId = 1;
    
    const firstNames = [
      "Max", "Anna", "Felix", "Laura", "Uwe", "Marco", "Sebastian", "Lisa",
      "Markus", "Nina", "Timo", "Kevin", "Julia", "Tom", "Sarah", "Jonas",
      "Miriam", "Kai", "Sven", "Lea"
    ];
    
    const lastNames = [
      "Müller", "Schmidt", "Meier", "Schulz", "Fischer", "Weber", "Wagner",
      "Becker", "Hoffmann", "Keller", "König", "Krause", "Brandt", "Jäger",
      "Vogel", "Berg", "Arnold", "Lorenz", "Roth", "Pohl"
    ];
    
    const allQuals = ["TM", "AGT", "Maschinist", "GF", "Sprechfunker", "San"];
    
    for (let i = 0; i < 77; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const name = `${firstName} ${lastName}`;
      
      const qualifikationen = new Set<string>();
      
      // Always TM
      qualifikationen.add("TM");
      
      // Randomly assign others with weighted variety
      if (Math.random() < 0.45) qualifikationen.add("AGT");
      if (Math.random() < 0.25) qualifikationen.add("Maschinist");
      if (Math.random() < 0.15) qualifikationen.add("GF");
      if (Math.random() < 0.55) qualifikationen.add("Sprechfunker");
      if (Math.random() < 0.30) qualifikationen.add("San");
      
      const kamerad: Kamerad = {
        id: this.nextKameradId++,
        name,
        qualifikationen: Array.from(qualifikationen).sort(),
      };
      
      this.kameraden.set(kamerad.id, kamerad);
    }
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
    this.settings = { id: 1, ...insertSettings };
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
    // Get the qualification to find its kuerzel
    const qual = this.qualifikationen.get(id);
    if (qual) {
      // Remove this qualification from all kameraden
      const kameraden = Array.from(this.kameraden.values());
      for (const kamerad of kameraden) {
        kamerad.qualifikationen = kamerad.qualifikationen.filter((q: string) => q !== qual.kuerzel);
      }
    }
    this.qualifikationen.delete(id);
  }

  // Termine methods
  async getAllTermine(): Promise<Termin[]> {
    return Array.from(this.termine.values()).sort((a, b) => {
      // Sort by date, then by time
      if (a.datum !== b.datum) {
        return a.datum.localeCompare(b.datum);
      }
      return a.uhrzeit.localeCompare(b.uhrzeit);
    });
  }

  async getTermin(id: number): Promise<Termin | undefined> {
    return this.termine.get(id);
  }

  async createTermin(insertTermin: InsertTermin): Promise<Termin> {
    const id = this.nextTerminId++;
    const termin: Termin = { id, ...insertTermin };
    this.termine.set(id, termin);
    return termin;
  }

  async updateTermin(id: number, insertTermin: InsertTermin): Promise<Termin> {
    const termin: Termin = { id, ...insertTermin };
    this.termine.set(id, termin);
    return termin;
  }

  async deleteTermin(id: number): Promise<void> {
    this.termine.delete(id);
    // Also delete all associated Zusagen
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
    // Check if a zusage already exists for this user and termin
    const existing = await this.getUserZusage(insertZusage.termin_id, insertZusage.user_id);
    
    if (existing) {
      // Update existing
      existing.status = insertZusage.status;
      this.terminZusagen.set(existing.id, existing);
      return existing;
    } else {
      // Create new
      const id = this.nextZusageId++;
      const zusage: TerminZusage = { id, ...insertZusage };
      this.terminZusagen.set(id, zusage);
      return zusage;
    }
  }

  // Besetzungscheck
  async getBesetzungscheck(): Promise<BesetzungscheckResult> {
    const kameraden = await this.getAllKameraden();
    const settings = await this.getSettings();
    const einsatz = await this.getEinsatz();
    
    const countWithQual = (qual: string): number => {
      return kameraden.filter(k => k.qualifikationen.includes(qual)).length;
    };
    
    const vorhanden = {
      agt: countWithQual("AGT"),
      maschinist: countWithQual("Maschinist"),
      gf: countWithQual("GF"),
      gesamt: kameraden.length,
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
}

export const storage = new MemStorage();
