import { db } from "./db";
import { eq, sql, ilike, or, desc, asc } from "drizzle-orm";
import {
  users,
  vehicles,
  einsatz,
  settings,
  qualifikationen,
  termine,
  terminZusagen,
  type User,
  type InsertUser,
  type Vehicle,
  type InsertVehicle,
  type Einsatz,
  type InsertEinsatz,
  type Settings,
  type InsertSettings,
  type Qualifikation,
  type InsertQualifikation,
  type Termin,
  type TerminZusage,
  type InsertTerminZusage,
  type BesetzungscheckResult,
} from "@shared/schema";
import type { IStorage } from "./storage";
import { hashPassword } from "./password-utils";

export class PostgresStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await hashPassword(insertUser.password);
    const result = await db.insert(users).values({ ...insertUser, password: hashedPassword }).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<Omit<User, 'id'>>): Promise<User> {
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    if (!result[0]) throw new Error("User not found");
    return result[0];
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const result = await db.update(users).set({ role }).where(eq(users.id, id)).returning();
    if (!result[0]) throw new Error("User not found");
    return result[0];
  }

  async updateUserQualifikationen(id: string, qualifikationenList: string[]): Promise<User> {
    const result = await db.update(users).set({ qualifikationen: qualifikationenList }).where(eq(users.id, id)).returning();
    if (!result[0]) throw new Error("User not found");
    return result[0];
  }

  async changePassword(id: string, newPassword: string): Promise<User> {
    const hashedPassword = await hashPassword(newPassword);
    const result = await db.update(users).set({ password: hashedPassword, muss_passwort_aendern: false }).where(eq(users.id, id)).returning();
    if (!result[0]) throw new Error("User not found");
    return result[0];
  }

  async resetPassword(id: string): Promise<User> {
    const hashedPassword = await hashPassword("Feuer123");
    const result = await db.update(users).set({ password: hashedPassword, muss_passwort_aendern: true }).where(eq(users.id, id)).returning();
    if (!result[0]) throw new Error("User not found");
    return result[0];
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Vehicles
  async getAllVehicles(): Promise<Vehicle[]> {
    return await db.select().from(vehicles);
  }

  async createVehicle(insertVehicle: InsertVehicle): Promise<Vehicle> {
    const result = await db.insert(vehicles).values(insertVehicle).returning();
    return result[0];
  }

  async deleteVehicle(id: number): Promise<void> {
    await db.delete(vehicles).where(eq(vehicles.id, id));
  }

  // Einsatz
  async getEinsatz(): Promise<Einsatz> {
    const result = await db.select().from(einsatz).where(eq(einsatz.id, 1));
    if (!result[0]) {
      // Initialize default einsatz if not exists
      const newEinsatz = await db.insert(einsatz).values({
        id: 1,
        stichwort: "B: Kleinbrand",
        bemerkung: "",
        mannschaftsbedarf: 9,
      }).returning();
      return newEinsatz[0];
    }
    return result[0];
  }

  async updateEinsatz(insertEinsatz: InsertEinsatz): Promise<Einsatz> {
    const result = await db.update(einsatz).set(insertEinsatz).where(eq(einsatz.id, 1)).returning();
    if (!result[0]) {
      // Create if not exists
      const newEinsatz = await db.insert(einsatz).values({ ...insertEinsatz, id: 1 }).returning();
      return newEinsatz[0];
    }
    return result[0];
  }

  // Settings
  async getSettings(): Promise<Settings> {
    const result = await db.select().from(settings).where(eq(settings.id, 1));
    if (!result[0]) {
      // Initialize default settings if not exists
      const newSettings = await db.insert(settings).values({
        id: 1,
        schichtlaenge_std: 12,
        min_agt: 2,
        min_maschinist: 1,
        min_gf: 1,
      }).returning();
      return newSettings[0];
    }
    return result[0];
  }

  async updateSettings(insertSettings: InsertSettings): Promise<Settings> {
    const result = await db.update(settings).set(insertSettings).where(eq(settings.id, 1)).returning();
    if (!result[0]) {
      // Create if not exists
      const newSettings = await db.insert(settings).values({ ...insertSettings, id: 1 }).returning();
      return newSettings[0];
    }
    return result[0];
  }

  // Qualifikationen
  async getAllQualifikationen(): Promise<Qualifikation[]> {
    return await db.select().from(qualifikationen);
  }

  async createQualifikation(insertQualifikation: InsertQualifikation): Promise<Qualifikation> {
    const result = await db.insert(qualifikationen).values(insertQualifikation).returning();
    return result[0];
  }

  async deleteQualifikation(id: number): Promise<void> {
    const qual = await db.select().from(qualifikationen).where(eq(qualifikationen.id, id));
    if (qual[0]) {
      // Remove this qualification from all users
      const allUsers = await db.select().from(users);
      for (const user of allUsers) {
        const updatedQuals = user.qualifikationen.filter((q: string) => q !== qual[0].kuerzel);
        await db.update(users).set({ qualifikationen: updatedQuals }).where(eq(users.id, user.id));
      }
    }
    await db.delete(qualifikationen).where(eq(qualifikationen.id, id));
  }

  // Termine
  async getAllTermine(): Promise<Termin[]> {
    return await db.select().from(termine).orderBy(asc(termine.datum), asc(termine.uhrzeit));
  }

  async getTermin(id: number): Promise<Termin | undefined> {
    const result = await db.select().from(termine).where(eq(termine.id, id));
    return result[0];
  }

  async createTermin(terminData: Omit<Termin, 'id'>): Promise<Termin> {
    const result = await db.insert(termine).values(terminData).returning();
    return result[0];
  }

  async updateTermin(id: number, terminData: Omit<Termin, 'id'>): Promise<Termin> {
    const result = await db.update(termine).set(terminData).where(eq(termine.id, id)).returning();
    if (!result[0]) throw new Error("Termin not found");
    return result[0];
  }

  async deleteTermin(id: number): Promise<void> {
    await db.delete(terminZusagen).where(eq(terminZusagen.termin_id, id));
    await db.delete(termine).where(eq(termine.id, id));
  }

  // Termin Zusagen
  async getTerminZusagen(terminId: number): Promise<TerminZusage[]> {
    return await db.select().from(terminZusagen).where(eq(terminZusagen.termin_id, terminId));
  }

  async getUserZusage(terminId: number, userId: string): Promise<TerminZusage | undefined> {
    const result = await db.select().from(terminZusagen).where(
      sql`${terminZusagen.termin_id} = ${terminId} AND ${terminZusagen.user_id} = ${userId}`
    );
    return result[0];
  }

  async createOrUpdateZusage(insertZusage: InsertTerminZusage): Promise<TerminZusage> {
    const existing = await this.getUserZusage(insertZusage.termin_id, insertZusage.user_id);
    
    if (existing) {
      const result = await db.update(terminZusagen).set({ status: insertZusage.status }).where(eq(terminZusagen.id, existing.id)).returning();
      return result[0];
    } else {
      const result = await db.insert(terminZusagen).values(insertZusage).returning();
      return result[0];
    }
  }

  // Besetzungscheck
  async getBesetzungscheck(): Promise<BesetzungscheckResult> {
    const allUsers = await db.select().from(users);
    const currentSettings = await this.getSettings();

    let agtCount = 0;
    let maschinistCount = 0;
    let gfCount = 0;

    for (const user of allUsers) {
      if (user.qualifikationen.includes("AGT")) agtCount++;
      if (user.qualifikationen.includes("Maschinist")) maschinistCount++;
      if (user.qualifikationen.includes("GF")) gfCount++;
    }

    return {
      vorhanden: {
        agt: agtCount,
        maschinist: maschinistCount,
        gf: gfCount,
        gesamt: allUsers.length,
      },
      minima: {
        min_agt: currentSettings.min_agt,
        min_maschinist: currentSettings.min_maschinist,
        min_gf: currentSettings.min_gf,
        mannschaftsbedarf: 0,
      },
      fehlt: {
        agt: Math.max(0, currentSettings.min_agt - agtCount),
        maschinist: Math.max(0, currentSettings.min_maschinist - maschinistCount),
        gf: Math.max(0, currentSettings.min_gf - gfCount),
      },
      status: "ok",
    };
  }
}
