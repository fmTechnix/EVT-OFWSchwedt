import { db } from "./db";
import { eq, sql, ilike, or, desc, asc, inArray, and, gte, lte } from "drizzle-orm";
import {
  users,
  vehicles,
  einsatz,
  settings,
  qualifikationen,
  termine,
  terminZusagen,
  vehicleConfigs,
  availabilities,
  currentAssignments,
  pushSubscriptions,
  pushLogs,
  maengelMeldungen,
  assignmentHistory,
  assignmentFairness,
  availabilityTemplates,
  userReminderSettings,
  alarmEvents,
  aaoStichworte,
  auditLogs,
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
  type VehicleConfig,
  type InsertVehicleConfig,
  type Availability,
  type InsertAvailability,
  type CurrentAssignment,
  type InsertCurrentAssignment,
  type PushSubscription,
  type InsertPushSubscription,
  type PushLog,
  type MaengelMeldung,
  type InsertMaengelMeldung,
  type AssignmentHistory,
  type InsertAssignmentHistory,
  type AssignmentFairness,
  type InsertAssignmentFairness,
  type AvailabilityTemplate,
  type InsertAvailabilityTemplate,
  type UserReminderSettings,
  type InsertUserReminderSettings,
  type AlarmEvent,
  type InsertAlarmEvent,
  type AaoStichwort,
  type InsertAaoStichwort,
  type AuditLog,
  type InsertAuditLog,
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

  async updateVehicle(id: number, data: InsertVehicle): Promise<Vehicle> {
    const result = await db.update(vehicles).set(data).where(eq(vehicles.id, id)).returning();
    if (!result[0]) throw new Error("Fahrzeug nicht gefunden");
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
        min_agt: 2,
        min_maschinist: 1,
        min_gf: 1,
        rotation_window: 4,
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
      if (user.qualifikationen.includes("MASCH")) maschinistCount++;
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
      erfuellt: agtCount >= currentSettings.min_agt && 
                maschinistCount >= currentSettings.min_maschinist && 
                gfCount >= currentSettings.min_gf,
    };
  }

  // Vehicle Configurations
  async getAllVehicleConfigs(): Promise<VehicleConfig[]> {
    return await db.select().from(vehicleConfigs).orderBy(asc(vehicleConfigs.type), asc(vehicleConfigs.vehicle));
  }

  async getVehicleConfig(id: number): Promise<VehicleConfig | undefined> {
    const result = await db.select().from(vehicleConfigs).where(eq(vehicleConfigs.id, id));
    return result[0];
  }

  async getVehicleConfigByName(name: string): Promise<VehicleConfig | undefined> {
    const result = await db.select().from(vehicleConfigs).where(eq(vehicleConfigs.vehicle, name));
    return result[0];
  }

  async createVehicleConfig(insertConfig: InsertVehicleConfig): Promise<VehicleConfig> {
    const result = await db.insert(vehicleConfigs).values(insertConfig).returning();
    return result[0];
  }

  async updateVehicleConfig(id: number, updates: Partial<InsertVehicleConfig>): Promise<VehicleConfig> {
    const result = await db.update(vehicleConfigs).set(updates).where(eq(vehicleConfigs.id, id)).returning();
    if (!result[0]) throw new Error("Vehicle config not found");
    return result[0];
  }

  async deleteVehicleConfig(id: number): Promise<void> {
    await db.delete(vehicleConfigs).where(eq(vehicleConfigs.id, id));
  }

  // Availabilities
  async getUserAvailability(userId: string, date: string): Promise<Availability | undefined> {
    const result = await db.select().from(availabilities)
      .where(sql`${availabilities.user_id} = ${userId} AND ${availabilities.date} = ${date}`);
    return result[0];
  }

  async getUserAvailabilities(userId: string): Promise<Availability[]> {
    return await db.select().from(availabilities)
      .where(eq(availabilities.user_id, userId))
      .orderBy(desc(availabilities.date));
  }

  async setAvailability(insertAvailability: InsertAvailability): Promise<Availability> {
    const existing = await this.getUserAvailability(insertAvailability.user_id, insertAvailability.date);
    
    if (existing) {
      const result = await db.update(availabilities)
        .set({ status: insertAvailability.status, reason: insertAvailability.reason })
        .where(eq(availabilities.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(availabilities).values(insertAvailability).returning();
      return result[0];
    }
  }

  async deleteAvailability(id: number): Promise<void> {
    await db.delete(availabilities).where(eq(availabilities.id, id));
  }

  async getAvailableUsers(date: string): Promise<User[]> {
    const unavailableUserIds = await db.select({ user_id: availabilities.user_id })
      .from(availabilities)
      .where(sql`${availabilities.date} = ${date} AND ${availabilities.status} = 'unavailable'`);
    
    const unavailableIds = unavailableUserIds.map(row => row.user_id);
    
    // Filter admin users - they should never be considered "available" for crew assignments
    if (unavailableIds.length === 0) {
      return await db.select().from(users)
        .where(sql`${users.role} != 'admin'`);
    }
    
    return await db.select().from(users)
      .where(sql`${users.id} NOT IN (${sql.join(unavailableIds.map(id => sql`${id}`), sql`, `)}) AND ${users.role} != 'admin'`);
  }

  // Availability Templates
  async getUserTemplates(userId: string): Promise<AvailabilityTemplate[]> {
    return await db.select().from(availabilityTemplates)
      .where(eq(availabilityTemplates.user_id, userId))
      .orderBy(desc(availabilityTemplates.created_at));
  }

  async createTemplate(template: InsertAvailabilityTemplate): Promise<AvailabilityTemplate> {
    const result = await db.insert(availabilityTemplates).values(template).returning();
    return result[0];
  }

  async updateTemplate(id: number, updates: Partial<InsertAvailabilityTemplate>): Promise<AvailabilityTemplate> {
    const result = await db.update(availabilityTemplates).set(updates).where(eq(availabilityTemplates.id, id)).returning();
    if (!result[0]) throw new Error("Template nicht gefunden");
    return result[0];
  }

  async deleteTemplate(id: number): Promise<void> {
    await db.delete(availabilityTemplates).where(eq(availabilityTemplates.id, id));
  }

  async applyTemplateToWeek(userId: string, templateId: number, weekStartDate: string): Promise<Availability[]> {
    const template = await db.select().from(availabilityTemplates)
      .where(eq(availabilityTemplates.id, templateId))
      .limit(1);
    
    if (!template[0]) {
      throw new Error("Template nicht gefunden");
    }

    const templateData = template[0];
    const weekdayMap: Record<string, number> = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6
    };

    const startDate = new Date(weekStartDate);
    const results: Availability[] = [];

    for (const weekday of templateData.weekdays) {
      const targetDay = weekdayMap[weekday];
      const currentDay = startDate.getDay();
      const daysToAdd = (targetDay - currentDay + 7) % 7;
      
      const targetDate = new Date(startDate);
      targetDate.setDate(startDate.getDate() + daysToAdd);
      const dateString = targetDate.toISOString().split('T')[0];

      const existingAvailability = await db.select().from(availabilities)
        .where(sql`${availabilities.user_id} = ${userId} AND ${availabilities.date} = ${dateString}`)
        .limit(1);

      if (existingAvailability.length > 0) {
        const updated = await db.update(availabilities)
          .set({
            status: templateData.status,
            start_time: templateData.start_time,
            end_time: templateData.end_time,
          })
          .where(eq(availabilities.id, existingAvailability[0].id))
          .returning();
        results.push(updated[0]);
      } else {
        const inserted = await db.insert(availabilities)
          .values({
            user_id: userId,
            date: dateString,
            status: templateData.status,
            start_time: templateData.start_time,
            end_time: templateData.end_time,
            reason: null,
          })
          .returning();
        results.push(inserted[0]);
      }
    }

    return results;
  }

  // User Reminder Settings
  async getReminderSettings(userId: string): Promise<UserReminderSettings | undefined> {
    const result = await db.select().from(userReminderSettings)
      .where(eq(userReminderSettings.user_id, userId));
    return result[0];
  }

  async updateReminderSettings(userId: string, settings: Partial<InsertUserReminderSettings>): Promise<UserReminderSettings> {
    const existing = await this.getReminderSettings(userId);
    
    if (existing) {
      const result = await db.update(userReminderSettings)
        .set({ ...settings, updated_at: sql`now()` })
        .where(eq(userReminderSettings.user_id, userId))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(userReminderSettings)
        .values({ user_id: userId, ...settings })
        .returning();
      return result[0];
    }
  }

  async getUsersWithRemindersEnabled(): Promise<UserReminderSettings[]> {
    return await db.select().from(userReminderSettings)
      .where(eq(userReminderSettings.reminder_enabled, true));
  }

  // Current Assignments
  async getCurrentAssignments(): Promise<CurrentAssignment[]> {
    // CRITICAL: Filter out system_admin users from assignments (they should never appear in operational context)
    // This includes both user_id and trupp_partner_id - system_admins must not appear anywhere
    // Note: Regular "admin" role (operative admins) ARE included in assignments
    const result = await db
      .select({
        assignment: currentAssignments,
        userRole: users.role,
        partnerRole: sql<string | null>`partner.role`.as('partner_role'),
      })
      .from(currentAssignments)
      .leftJoin(users, eq(currentAssignments.user_id, users.id))
      .leftJoin(sql`users as partner`, sql`${currentAssignments.trupp_partner_id} = partner.id`)
      .where(
        and(
          // Exclude assignments where user is system_admin
          or(
            sql`${users.role} IS NULL`,
            sql`${users.role} != 'system_admin'`
          ),
          // Exclude assignments where trupp_partner is system_admin
          or(
            sql`partner.role IS NULL`,
            sql`partner.role != 'system_admin'`
          )
        )
      );
    
    return result.map(r => r.assignment);
  }

  async getUserAssignment(userId: string): Promise<CurrentAssignment | undefined> {
    const result = await db.select().from(currentAssignments)
      .where(eq(currentAssignments.user_id, userId));
    return result[0];
  }

  async setCurrentAssignments(insertAssignments: InsertCurrentAssignment[]): Promise<CurrentAssignment[]> {
    await this.clearCurrentAssignments();
    
    if (insertAssignments.length === 0) {
      return [];
    }
    
    // CRITICAL: Filter out system_admin users before saving assignments
    // System admin accounts must NEVER be assigned to vehicles (neither as user_id nor trupp_partner_id)
    // Note: Regular "admin" role (operative admins) ARE included in assignments
    const validAssignments: InsertCurrentAssignment[] = [];
    
    // Batch fetch all user IDs to check roles (performance optimization)
    const allUserIds = new Set<string>();
    for (const assignment of insertAssignments) {
      if (assignment.user_id) allUserIds.add(assignment.user_id);
      if (assignment.trupp_partner_id) allUserIds.add(assignment.trupp_partner_id);
    }
    
    const allUsers = await db.select().from(users)
      .where(inArray(users.id, Array.from(allUserIds)));
    
    const userRoleMap = new Map<string, string>();
    for (const user of allUsers) {
      userRoleMap.set(user.id, user.role);
    }
    
    for (const assignment of insertAssignments) {
      // Check if user_id is system_admin
      if (assignment.user_id) {
        const userRole = userRoleMap.get(assignment.user_id);
        if (!userRole) {
          console.warn(`⚠️  setCurrentAssignments: User ${assignment.user_id} not found, skipping assignment`);
          continue;
        }
        
        if (userRole === "system_admin") {
          const user = allUsers.find(u => u.id === assignment.user_id);
          console.warn(`⚠️  setCurrentAssignments: Blocked system_admin user ${user?.vorname} ${user?.nachname} (${assignment.user_id}) from being assigned to vehicle`);
          continue;
        }
      }
      
      // Check if trupp_partner_id is system_admin
      if (assignment.trupp_partner_id) {
        const partnerRole = userRoleMap.get(assignment.trupp_partner_id);
        if (partnerRole === "system_admin") {
          const partner = allUsers.find(u => u.id === assignment.trupp_partner_id);
          console.warn(`⚠️  setCurrentAssignments: Blocked system_admin user ${partner?.vorname} ${partner?.nachname} (${assignment.trupp_partner_id}) from being trupp_partner`);
          // Null out the partner instead of skipping entire assignment
          assignment.trupp_partner_id = null;
        }
      }
      
      validAssignments.push(assignment);
    }
    
    if (validAssignments.length === 0) {
      return [];
    }
    
    return await db.insert(currentAssignments).values(validAssignments).returning();
  }

  async clearCurrentAssignments(): Promise<void> {
    await db.delete(currentAssignments);
  }

  // Push Subscriptions
  async savePushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    const existing = await db.select().from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
    
    if (existing.length > 0) {
      const result = await db.update(pushSubscriptions)
        .set(subscription)
        .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
        .returning();
      return result[0];
    }
    
    const result = await db.insert(pushSubscriptions).values(subscription).returning();
    return result[0];
  }

  async getUserPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    return await db.select().from(pushSubscriptions)
      .where(eq(pushSubscriptions.user_id, userId));
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
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
    await db.insert(pushLogs).values(log);
  }

  async getAllPushLogs(filters?: { userId?: string; status?: string; messageType?: string; limit?: number }): Promise<PushLog[]> {
    // Build WHERE conditions
    const conditions: any[] = [];
    if (filters?.userId) {
      conditions.push(eq(pushLogs.user_id, filters.userId));
    }
    if (filters?.status) {
      conditions.push(eq(pushLogs.status, filters.status));
    }
    if (filters?.messageType) {
      conditions.push(eq(pushLogs.message_type, filters.messageType));
    }

    // Build query with combined conditions
    let query = db.select().from(pushLogs);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    query = query.orderBy(desc(pushLogs.sent_at)) as any;
    
    // Apply limit
    const limit = filters?.limit || 100;
    query = query.limit(limit) as any;

    return await query;
  }

  // Mängelmeldungen
  async getAllMaengelMeldungen(): Promise<MaengelMeldung[]> {
    return await db.select().from(maengelMeldungen).orderBy(desc(maengelMeldungen.erstellt_am));
  }

  async getMaengelMeldung(id: number): Promise<MaengelMeldung | undefined> {
    const result = await db.select().from(maengelMeldungen)
      .where(eq(maengelMeldungen.id, id));
    return result[0];
  }

  async getMaengelMeldungenByVehicle(vehicleId: number): Promise<MaengelMeldung[]> {
    return await db.select().from(maengelMeldungen)
      .where(eq(maengelMeldungen.vehicle_id, vehicleId))
      .orderBy(desc(maengelMeldungen.erstellt_am));
  }

  async createMaengelMeldung(insertMeldung: InsertMaengelMeldung): Promise<MaengelMeldung> {
    const result = await db.insert(maengelMeldungen).values(insertMeldung).returning();
    return result[0];
  }

  async updateMaengelMeldung(id: number, updates: Partial<InsertMaengelMeldung>): Promise<MaengelMeldung> {
    // Filter out undefined values to prevent setting columns to NULL
    const cleanUpdates: any = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }
    
    // If status is being set to "behoben", also set behoben_am
    if (cleanUpdates.status === "behoben") {
      const current = await this.getMaengelMeldung(id);
      if (current && !current.behoben_am) {
        cleanUpdates.behoben_am = new Date();
      }
    }
    
    const result = await db.update(maengelMeldungen)
      .set(cleanUpdates)
      .where(eq(maengelMeldungen.id, id))
      .returning();
    
    if (!result[0]) throw new Error("Mängelmeldung not found");
    return result[0];
  }

  async deleteMaengelMeldung(id: number): Promise<void> {
    await db.delete(maengelMeldungen).where(eq(maengelMeldungen.id, id));
  }

  // Assignment History (Fairness-Tracking)
  async createAssignmentHistory(insertHistory: InsertAssignmentHistory): Promise<AssignmentHistory> {
    const result = await db.insert(assignmentHistory).values(insertHistory).returning();
    return result[0];
  }

  async getAssignmentHistory(userId: string, weeks: number = 4): Promise<AssignmentHistory[]> {
    const weeksAgo = new Date();
    weeksAgo.setDate(weeksAgo.getDate() - (weeks * 7));
    const dateThreshold = weeksAgo.toISOString().split('T')[0];

    return await db.select().from(assignmentHistory)
      .where(sql`${assignmentHistory.user_id} = ${userId} AND ${assignmentHistory.assigned_for_date} >= ${dateThreshold}`)
      .orderBy(desc(assignmentHistory.created_at));
  }

  async getRecentAssignmentsByPosition(userId: string, position: string, weeks: number = 4): Promise<AssignmentHistory[]> {
    const weeksAgo = new Date();
    weeksAgo.setDate(weeksAgo.getDate() - (weeks * 7));
    const dateThreshold = weeksAgo.toISOString().split('T')[0];

    return await db.select().from(assignmentHistory)
      .where(sql`${assignmentHistory.user_id} = ${userId} AND ${assignmentHistory.position} = ${position} AND ${assignmentHistory.assigned_for_date} >= ${dateThreshold}`)
      .orderBy(desc(assignmentHistory.created_at));
  }

  // Assignment Fairness
  async getFairnessMetrics(userId: string): Promise<AssignmentFairness | undefined> {
    const result = await db.select().from(assignmentFairness)
      .where(eq(assignmentFairness.user_id, userId));
    return result[0];
  }

  async getAllFairnessMetrics(): Promise<AssignmentFairness[]> {
    return await db.select().from(assignmentFairness);
  }

  async updateFairnessMetrics(userId: string, position: string): Promise<AssignmentFairness> {
    const existing = await this.getFairnessMetrics(userId);

    if (existing) {
      // Update existing metrics
      const perPositionCounts = existing.per_position_counts as any || {};
      perPositionCounts[position] = (perPositionCounts[position] || 0) + 1;

      const result = await db.update(assignmentFairness)
        .set({
          total_assignments: existing.total_assignments + 1,
          per_position_counts: perPositionCounts,
          last_position: position,
          last_assigned_at: new Date(),
          rolling_fairness_score: existing.total_assignments + 1,
          updated_at: new Date(),
        })
        .where(eq(assignmentFairness.user_id, userId))
        .returning();
      return result[0];
    } else {
      // Create new entry
      const result = await db.insert(assignmentFairness)
        .values({
          user_id: userId,
          total_assignments: 1,
          per_position_counts: { [position]: 1 },
          last_position: position,
          last_assigned_at: new Date(),
          rolling_fairness_score: 1,
        })
        .returning();
      return result[0];
    }
  }

  async resetFairnessMetrics(userId: string): Promise<void> {
    await db.delete(assignmentFairness).where(eq(assignmentFairness.user_id, userId));
  }

  // Alarm Events (DE-Alarm Integration)
  async getAllAlarmEvents(): Promise<AlarmEvent[]> {
    return await db.select().from(alarmEvents).orderBy(desc(alarmEvents.alarmierungszeit));
  }

  async getAlarmEvent(id: number): Promise<AlarmEvent | undefined> {
    const result = await db.select().from(alarmEvents).where(eq(alarmEvents.id, id));
    return result[0];
  }

  async getUnprocessedAlarmEvents(): Promise<AlarmEvent[]> {
    return await db.select().from(alarmEvents)
      .where(eq(alarmEvents.verarbeitet, false))
      .orderBy(asc(alarmEvents.alarmierungszeit));
  }

  async createAlarmEvent(event: InsertAlarmEvent): Promise<AlarmEvent> {
    const result = await db.insert(alarmEvents).values(event).returning();
    return result[0];
  }

  async markAlarmAsProcessed(id: number, crewReassigned: boolean): Promise<AlarmEvent> {
    const result = await db.update(alarmEvents)
      .set({
        verarbeitet: true,
        crew_neu_zugeteilt: crewReassigned,
      })
      .where(eq(alarmEvents.id, id))
      .returning();
    
    if (!result[0]) throw new Error("Alarm event not found");
    return result[0];
  }

  // AAO Stichworte (Alarm- und Ausrückeordnung)
  async getAllAaoStichworte(): Promise<AaoStichwort[]> {
    return await db.select().from(aaoStichworte).orderBy(asc(aaoStichworte.stichwort));
  }

  async getAaoStichwort(id: number): Promise<AaoStichwort | undefined> {
    const result = await db.select().from(aaoStichworte).where(eq(aaoStichworte.id, id));
    return result[0];
  }

  async getAaoStichwortByName(stichwort: string): Promise<AaoStichwort | undefined> {
    const result = await db.select().from(aaoStichworte).where(eq(aaoStichworte.stichwort, stichwort));
    return result[0];
  }

  async createAaoStichwort(insertStichwort: InsertAaoStichwort): Promise<AaoStichwort> {
    const result = await db.insert(aaoStichworte).values(insertStichwort).returning();
    return result[0];
  }

  async updateAaoStichwort(id: number, updates: Partial<InsertAaoStichwort>): Promise<AaoStichwort> {
    const result = await db.update(aaoStichworte)
      .set(updates)
      .where(eq(aaoStichworte.id, id))
      .returning();
    
    if (!result[0]) throw new Error("AAO Stichwort not found");
    return result[0];
  }

  async deleteAaoStichwort(id: number): Promise<void> {
    await db.delete(aaoStichworte).where(eq(aaoStichworte.id, id));
  }

  // Audit Logs (System-weite Event-Logs)
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const result = await db.insert(auditLogs).values(log).returning();
    return result[0];
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
    // Build WHERE conditions
    const conditions = [];
    
    if (filters?.startDate) {
      conditions.push(gte(auditLogs.event_time, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      conditions.push(lte(auditLogs.event_time, new Date(filters.endDate)));
    }
    if (filters?.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    if (filters?.actorId) {
      conditions.push(eq(auditLogs.actor_id, filters.actorId));
    }
    if (filters?.entityType) {
      conditions.push(eq(auditLogs.entity_type, filters.entityType));
    }
    if (filters?.severity) {
      conditions.push(eq(auditLogs.severity, filters.severity));
    }

    // Get total count
    const countQuery = conditions.length > 0
      ? db.select({ count: sql<number>`count(*)::int` }).from(auditLogs).where(and(...conditions))
      : db.select({ count: sql<number>`count(*)::int` }).from(auditLogs);
    
    const countResult = await countQuery;
    const total = countResult[0]?.count || 0;

    // Get paginated results
    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;

    const logsQuery = conditions.length > 0
      ? db.select().from(auditLogs).where(and(...conditions)).orderBy(desc(auditLogs.event_time)).limit(limit).offset(offset)
      : db.select().from(auditLogs).orderBy(desc(auditLogs.event_time)).limit(limit).offset(offset);

    const logs = await logsQuery;

    return { logs, total };
  }
}
