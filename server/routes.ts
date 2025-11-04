import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { insertVehicleSchema, insertEinsatzSchema, insertSettingsSchema, insertQualifikationSchema, insertTerminSchema, insertTerminZusageSchema, insertPushSubscriptionSchema, insertMaengelMeldungSchema } from "@shared/schema";
import type { User, InsertUser, VehicleSlot, InsertVehicleConfig } from "@shared/schema";
import { verifyPassword } from "./password-utils";
import { assignCrewToVehicles } from "./crew-assignment";
import { PushNotificationService, getVapidPublicKey } from "./push-service";
import { ReminderScheduler } from "./reminder-scheduler";
import { z } from "zod";

// Extend Express session to include user
declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

// Helper function to sanitize user object (remove password)
function sanitizeUser(user: User): Omit<User, "password"> {
  const { password, ...sanitized } = user;
  return sanitized;
}

// Middleware to check authentication
function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Nicht authentifiziert" });
  }
  next();
}

// Middleware to check admin role
async function requireAdmin(req: Request, res: Response, next: Function) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Nicht authentifiziert" });
  }
  
  const user = await storage.getUser(req.session.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Keine Berechtigung" });
  }
  
  next();
}

// Middleware to check moderator or admin role
async function requireModerator(req: Request, res: Response, next: Function) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Nicht authentifiziert" });
  }
  
  const user = await storage.getUser(req.session.userId);
  if (!user || (user.role !== "admin" && user.role !== "moderator")) {
    return res.status(403).json({ error: "Keine Berechtigung" });
  }
  
  next();
}

// Helper function to determine vehicle type from name
function determineVehicleType(vehicleName: string): string {
  const name = vehicleName.toUpperCase();
  if (name.includes("HLF") || name.includes("LF")) return "LF";
  if (name.includes("TLF")) return "TLF";
  if (name.includes("DLK") || name.includes("DL")) return "DL";
  if (name.includes("RW")) return "RW";
  if (name.includes("MTW")) return "MTW";
  if (name.includes("ELW")) return "ELW";
  if (name.includes("GW")) return "GW";
  if (name.includes("AB")) return "AB";
  return "Sonstiges";
}

// Helper function to create default vehicle configuration
function createDefaultVehicleConfig(vehicleName: string): InsertVehicleConfig {
  const vehicleType = determineVehicleType(vehicleName);
  
  // Standard 9-Slot-Konfiguration für Löschfahrzeuge
  const defaultSlots: VehicleSlot[] = [
    { position: "GF", requires: ["GF"] },
    { position: "MA", requires: ["MASCH"] },
    { position: "MELDER", requires: ["FUNK"] },
    { position: "ATF", requires: ["AGT"] },
    { position: "ATM", requires: ["AGT"] },
    { position: "WTF", requires: ["AGT"] },
    { position: "WTM", requires: ["AGT"] },
    { position: "STF", requires: [] },
    { position: "STM", requires: [] },
  ];
  
  return {
    vehicle: vehicleName,
    type: vehicleType,
    slots: defaultSlots,
    constraints: {
      min_agt_total: 4,
      min_funk_total: 1,
    },
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "dev-secret-change-me",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
      },
    })
  );

  // Auth endpoints
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Ungültige Anmeldedaten" });
      }
      
      const validPassword = await verifyPassword(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Ungültige Anmeldedaten" });
      }
      
      req.session.userId = user.id;
      res.json(sanitizeUser(user));
    } catch (error) {
      res.status(500).json({ error: "Login fehlgeschlagen" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout fehlgeschlagen" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Nicht authentifiziert" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: "Benutzer nicht gefunden" });
    }
    
    res.json(sanitizeUser(user));
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { vorname, nachname } = req.body;
      
      if (!vorname || !nachname) {
        return res.status(400).json({ error: "Vor- und Nachname erforderlich" });
      }
      
      // Create username from firstnamelastname
      const username = `${vorname.toLowerCase()}${nachname.toLowerCase()}`;
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ error: "Benutzer existiert bereits" });
      }
      
      // Create new user with default password "Feuer123" and must change password
      const newUser = await storage.createUser({
        username,
        password: "Feuer123",
        role: "member",
        vorname,
        nachname,
        qualifikationen: [],
        muss_passwort_aendern: true,
      });
      
      res.status(201).json(sanitizeUser(newUser));
    } catch (error) {
      res.status(500).json({ error: "Registrierung fehlgeschlagen" });
    }
  });

  app.post("/api/auth/change-password", requireAuth, async (req: Request, res: Response) => {
    try {
      const { oldPassword, newPassword } = req.body;
      
      if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: "Altes und neues Passwort erforderlich" });
      }
      
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "Benutzer nicht gefunden" });
      }
      
      // Verify old password with bcrypt
      const validOldPassword = await verifyPassword(oldPassword, user.password);
      if (!validOldPassword) {
        return res.status(401).json({ error: "Altes Passwort ist falsch" });
      }
      
      // Change password
      const updatedUser = await storage.changePassword(user.id, newPassword);
      res.json(sanitizeUser(updatedUser));
    } catch (error) {
      res.status(500).json({ error: "Passwort-Änderung fehlgeschlagen" });
    }
  });

  // User endpoints (unified Benutzer management)
  // Public user list (for calendar attendee names) - returns only id, vorname, nachname
  app.get("/api/users/public", requireAuth, async (_req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      const publicUsers = users.map(u => ({
        id: u.id,
        vorname: u.vorname,
        nachname: u.nachname,
      }));
      res.json(publicUsers);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Laden der Benutzer" });
    }
  });

  app.get("/api/users", requireAdmin, async (req: Request, res: Response) => {
    try {
      let users = await storage.getAllUsers();
      
      // Apply search filter if provided
      const searchTerm = req.query.search as string;
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        users = users.filter(u => 
          u.vorname.toLowerCase().includes(lowerSearch) ||
          u.nachname.toLowerCase().includes(lowerSearch) ||
          u.username.toLowerCase().includes(lowerSearch)
        );
      }
      
      // Apply sort (default: by nachname)
      const sortBy = req.query.sortBy as string || 'nachname';
      const sortOrder = req.query.sortOrder as string || 'asc';
      
      users.sort((a, b) => {
        let aVal, bVal;
        if (sortBy === 'vorname') {
          aVal = a.vorname;
          bVal = b.vorname;
        } else if (sortBy === 'username') {
          aVal = a.username;
          bVal = b.username;
        } else {
          aVal = a.nachname;
          bVal = b.nachname;
        }
        
        if (sortOrder === 'desc') {
          return bVal.localeCompare(aVal);
        }
        return aVal.localeCompare(bVal);
      });
      
      const sanitized = users.map(sanitizeUser);
      res.json(sanitized);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Laden der Benutzer" });
    }
  });

  app.patch("/api/users/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Don't allow password updates through this endpoint
      delete updates.password;
      delete updates.id;
      
      const user = await storage.updateUser(id, updates);
      res.json(sanitizeUser(user));
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Aktualisieren des Benutzers" });
    }
  });

  app.patch("/api/users/:id/role", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      if (!["admin", "moderator", "member"].includes(role)) {
        return res.status(400).json({ error: "Ungültige Rolle" });
      }
      
      const user = await storage.updateUserRole(id, role);
      res.json(sanitizeUser(user));
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Aktualisieren der Rolle" });
    }
  });

  app.patch("/api/users/:id/qualifikationen", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { qualifikationen } = req.body;
      
      if (!Array.isArray(qualifikationen)) {
        return res.status(400).json({ error: "Qualifikationen müssen ein Array sein" });
      }
      
      const user = await storage.updateUserQualifikationen(id, qualifikationen);
      res.json(sanitizeUser(user));
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Aktualisieren der Qualifikationen" });
    }
  });

  app.post("/api/users/:id/reset-password", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = await storage.resetPassword(id);
      res.json(sanitizeUser(user));
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Zurücksetzen des Passworts" });
    }
  });

  app.delete("/api/users/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteUser(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Löschen des Benutzers" });
    }
  });

  // CSV Import/Export
  app.post("/api/users/import", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { csvData } = req.body;
      
      if (!csvData || typeof csvData !== 'string') {
        return res.status(400).json({ error: "CSV-Daten erforderlich" });
      }
      
      // Parse CSV (remove BOM if present)
      const cleanCsv = csvData.replace(/^\uFEFF/, '');
      const lines = cleanCsv.split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length < 2) {
        return res.status(400).json({ error: "CSV muss mindestens eine Datenzeile enthalten" });
      }
      
      // Skip header line
      const dataLines = lines.slice(1);
      
      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as string[],
      };
      
      // Helper function to parse CSV line (handles quoted values)
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };
      
      for (const line of dataLines) {
        const parts = parseCSVLine(line);
        if (parts.length < 6) {
          results.errors.push(`Ungültige Zeile: ${line}`);
          continue;
        }
        
        const [username, vorname, nachname, role, qualsStr, passwortAendern] = parts;
        
        // Check if user exists
        const existing = await storage.getUserByUsername(username.trim());
        if (existing) {
          results.skipped++;
          continue;
        }
        
        // Parse qualifications
        const qualifikationen = qualsStr.trim() ? qualsStr.split(';').map(q => q.trim()) : [];
        
        // Create user
        try {
          await storage.createUser({
            username: username.trim(),
            password: "Feuer123",
            role: role.trim() as "admin" | "moderator" | "member",
            vorname: vorname.trim(),
            nachname: nachname.trim(),
            qualifikationen,
            muss_passwort_aendern: passwortAendern.trim().toLowerCase() === 'ja',
          });
          results.imported++;
        } catch (err) {
          results.errors.push(`Fehler bei ${username}: ${err}`);
        }
      }
      
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "CSV-Import fehlgeschlagen" });
    }
  });

  app.get("/api/users/export", requireAdmin, async (req: Request, res: Response) => {
    try {
      const allUsers = await storage.getAllUsers();
      
      // Generate CSV
      const header = "Username,Vorname,Nachname,Rolle,Qualifikationen,Passwort ändern\n";
      const rows = allUsers.map(user => {
        const qualsStr = user.qualifikationen.join(';');
        const passwortAendern = user.muss_passwort_aendern ? 'Ja' : 'Nein';
        return `${user.username},${user.vorname},${user.nachname},${user.role},${qualsStr},${passwortAendern}`;
      }).join('\n');
      
      const csvData = '\uFEFF' + header + rows; // Add BOM for Excel compatibility
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=benutzer-export.csv');
      res.send(csvData);
    } catch (error) {
      res.status(500).json({ error: "CSV-Export fehlgeschlagen" });
    }
  });

  // Seed 77 test users
  app.post("/api/users/seed", requireAdmin, async (req: Request, res: Response) => {
    try {
      const qualifications = ["TM", "AGT", "MASCH", "GF", "ZF", "FUNK", "FUEASS", "TH", "ABC1", "CBRN_ERKKW", "FAHRER_B", "San", "MZ", "WT18"];
      const vornamen = ["Max", "Anna", "Peter", "Maria", "Thomas", "Lisa", "Michael", "Sarah", "Andreas", "Julia", "Christian", "Laura", "Daniel", "Sophie", "Martin", "Emma", "Stefan", "Lena", "Markus", "Hannah", "Alexander", "Mia", "Sebastian", "Johanna", "Felix", "Lea"];
      const nachnamen = ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann", "Koch", "Bauer", "Richter", "Klein", "Wolf", "Schröder", "Neumann", "Schwarz", "Zimmermann", "Braun", "Krüger", "Hofmann", "Hartmann", "Lange", "Schmitt", "Werner"];
      
      const created = [];
      const skipped = [];
      
      for (let i = 1; i <= 77; i++) {
        const vorname = vornamen[i % vornamen.length];
        const nachname = nachnamen[Math.floor(i / vornamen.length) % nachnamen.length];
        const username = `${vorname.toLowerCase()}.${nachname.toLowerCase()}${i}`;
        
        // Check if user already exists
        const existing = await storage.getUserByUsername(username);
        if (existing) {
          skipped.push(username);
          continue;
        }
        
        // Assign random qualifications (2-6 per user for realistic distribution)
        const numQuals = Math.floor(Math.random() * 5) + 2;
        const userQuals: string[] = [];
        
        // Always include TM for most users
        if (Math.random() > 0.2) {
          userQuals.push("TM");
        }
        
        // Add random additional qualifications
        const shuffled = [...qualifications].sort(() => Math.random() - 0.5);
        for (let j = 0; j < numQuals && j < shuffled.length; j++) {
          if (!userQuals.includes(shuffled[j])) {
            userQuals.push(shuffled[j]);
          }
        }
        
        await storage.createUser({
          username,
          password: "Feuer123",
          role: "member",
          vorname,
          nachname,
          qualifikationen: userQuals,
          muss_passwort_aendern: false,
        });
        
        created.push(username);
      }
      
      res.json({
        success: true,
        created: created.length,
        skipped: skipped.length,
        message: `${created.length} Testbenutzer erstellt, ${skipped.length} übersprungen (existieren bereits)`,
      });
    } catch (error) {
      console.error("Seed error:", error);
      res.status(500).json({ error: "Fehler beim Erstellen der Testbenutzer" });
    }
  });

  // Vehicle endpoints
  app.get("/api/vehicles", requireAuth, async (_req: Request, res: Response) => {
    try {
      const vehicles = await storage.getAllVehicles();
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Laden der Fahrzeuge" });
    }
  });

  app.post("/api/vehicles", requireAdmin, async (req: Request, res: Response) => {
    try {
      const data = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(data);
      
      // Check if a vehicle configuration already exists for this vehicle
      const existingConfig = await storage.getVehicleConfigByName(vehicle.name);
      
      if (!existingConfig) {
        // Create a default vehicle configuration
        const defaultConfig = createDefaultVehicleConfig(vehicle.name);
        await storage.createVehicleConfig(defaultConfig);
        console.log(`✓ Automatische Standardkonfiguration für ${vehicle.name} erstellt`);
      }
      
      res.status(201).json(vehicle);
    } catch (error) {
      console.error("Vehicle creation error:", error);
      res.status(400).json({ error: "Ungültige Fahrzeugdaten" });
    }
  });

  app.patch("/api/vehicles/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.updateVehicle(id, data);
      res.json(vehicle);
    } catch (error) {
      res.status(400).json({ error: "Ungültige Fahrzeugdaten" });
    }
  });

  app.delete("/api/vehicles/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteVehicle(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Löschen des Fahrzeugs" });
    }
  });

  // Seed vehicles from vehicle configs
  app.post("/api/vehicles/seed", requireAdmin, async (req: Request, res: Response) => {
    try {
      const vehicleConfigs = await storage.getAllVehicleConfigs();
      const existingVehicles = await storage.getAllVehicles();
      
      const created = [];
      const skipped = [];
      
      for (const config of vehicleConfigs) {
        // Check if vehicle with this name already exists
        const exists = existingVehicles.find(v => v.name === config.vehicle);
        if (exists) {
          skipped.push(config.vehicle);
          continue;
        }
        
        // Create vehicle based on config
        // Funk and Besatzung are estimated from config
        const totalSlots = (config.slots as any)?.length || 9;
        await storage.createVehicle({
          name: config.vehicle,
          funk: `Florian Schwedt 1/XX/1`, // Placeholder
          besatzung: totalSlots,
        });
        
        created.push(config.vehicle);
      }
      
      res.json({
        success: true,
        created: created.length,
        skipped: skipped.length,
        message: `${created.length} Fahrzeuge erstellt, ${skipped.length} übersprungen (existieren bereits)`,
      });
    } catch (error) {
      console.error("Vehicle seed error:", error);
      res.status(500).json({ error: "Fehler beim Erstellen der Fahrzeuge" });
    }
  });

  // Einsatz endpoints
  app.get("/api/einsatz", requireAuth, async (_req: Request, res: Response) => {
    try {
      const einsatz = await storage.getEinsatz();
      res.json(einsatz);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Laden des Einsatzes" });
    }
  });

  app.put("/api/einsatz", requireAdmin, async (req: Request, res: Response) => {
    try {
      const data = insertEinsatzSchema.parse(req.body);
      const einsatz = await storage.updateEinsatz(data);
      res.json(einsatz);
    } catch (error) {
      res.status(400).json({ error: "Ungültige Einsatzdaten" });
    }
  });

  // Settings endpoints
  app.get("/api/settings", requireAuth, async (_req: Request, res: Response) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Laden der Einstellungen" });
    }
  });

  app.put("/api/settings", requireAdmin, async (req: Request, res: Response) => {
    try {
      const data = insertSettingsSchema.parse(req.body);
      const settings = await storage.updateSettings(data);
      res.json(settings);
    } catch (error) {
      res.status(400).json({ error: "Ungültige Einstellungsdaten" });
    }
  });

  // Qualifikationen endpoints
  app.get("/api/qualifikationen", requireAuth, async (_req: Request, res: Response) => {
    try {
      const qualifikationen = await storage.getAllQualifikationen();
      res.json(qualifikationen);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Laden der Qualifikationen" });
    }
  });

  app.post("/api/qualifikationen", requireAdmin, async (req: Request, res: Response) => {
    try {
      const data = insertQualifikationSchema.parse(req.body);
      const qualifikation = await storage.createQualifikation(data);
      res.status(201).json(qualifikation);
    } catch (error) {
      res.status(400).json({ error: "Ungültige Qualifikationsdaten" });
    }
  });

  app.delete("/api/qualifikationen/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteQualifikation(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Löschen der Qualifikation" });
    }
  });

  // Besetzungscheck endpoint
  app.get("/api/besetzungscheck", requireAuth, async (_req: Request, res: Response) => {
    try {
      const result = await storage.getBesetzungscheck();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Besetzungscheck" });
    }
  });

  // Termine endpoints
  app.get("/api/termine", requireAuth, async (_req: Request, res: Response) => {
    try {
      const termine = await storage.getAllTermine();
      res.json(termine);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Laden der Termine" });
    }
  });

  app.post("/api/termine", requireModerator, async (req: Request, res: Response) => {
    try {
      const data = insertTerminSchema.parse(req.body);
      // Always use the session user ID as creator to prevent forgery
      const terminData = { ...data, ersteller_id: req.session.userId! };
      const termin = await storage.createTermin(terminData);
      res.status(201).json(termin);
    } catch (error) {
      res.status(400).json({ error: "Ungültige Termindaten" });
    }
  });

  app.put("/api/termine/:id", requireModerator, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertTerminSchema.parse(req.body);
      // Always use the session user ID as creator to prevent forgery
      const terminData = { ...data, ersteller_id: req.session.userId! };
      const termin = await storage.updateTermin(id, terminData);
      res.json(termin);
    } catch (error) {
      res.status(400).json({ error: "Ungültige Termindaten" });
    }
  });

  app.delete("/api/termine/:id", requireModerator, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTermin(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Löschen des Termins" });
    }
  });

  // Termin export endpoint
  app.get("/api/termine/export", requireAuth, async (_req: Request, res: Response) => {
    try {
      const termine = await storage.getAllTermine();
      const users = await storage.getAllUsers();
      
      // Create CSV with BOM for Excel compatibility
      let csv = '\uFEFF';
      csv += "Datum,Uhrzeit,Titel,Ort,Beschreibung,Ersteller,Zusagen,Absagen\n";
      
      for (const termin of termine) {
        const zusagen = await storage.getTerminZusagen(termin.id);
        const zugesagt = zusagen.filter(z => z.status === "zugesagt").length;
        const abgesagt = zusagen.filter(z => z.status === "abgesagt").length;
        const ersteller = users.find(u => u.id === termin.ersteller_id);
        const erstellerName = ersteller ? `${ersteller.vorname} ${ersteller.nachname}` : 'Unbekannt';
        
        csv += `"${termin.datum}","${termin.uhrzeit}","${termin.titel}","${termin.ort}","${termin.beschreibung}","${erstellerName}",${zugesagt},${abgesagt}\n`;
      }
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="termine.csv"');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Exportieren der Termine" });
    }
  });

  // Termin Zusagen endpoints
  app.get("/api/termine/:id/zusagen", requireAuth, async (req: Request, res: Response) => {
    try {
      const terminId = parseInt(req.params.id);
      const zusagen = await storage.getTerminZusagen(terminId);
      res.json(zusagen);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Laden der Zusagen" });
    }
  });

  app.post("/api/termine/:id/zusage", requireAuth, async (req: Request, res: Response) => {
    try {
      const terminId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!["zugesagt", "abgesagt"].includes(status)) {
        return res.status(400).json({ error: "Ungültiger Status" });
      }
      
      const zusage = await storage.createOrUpdateZusage({
        termin_id: terminId,
        user_id: req.session.userId!,
        status,
      });
      
      res.json(zusage);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Speichern der Zusage" });
    }
  });

  // Vehicle Configurations endpoints (Admin only)
  app.get("/api/vehicle-configs", requireAuth, async (_req: Request, res: Response) => {
    try {
      const configs = await storage.getAllVehicleConfigs();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Laden der Fahrzeug-Konfigurationen" });
    }
  });

  app.get("/api/vehicle-configs/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const config = await storage.getVehicleConfig(id);
      if (!config) {
        return res.status(404).json({ error: "Fahrzeug-Konfiguration nicht gefunden" });
      }
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Laden der Fahrzeug-Konfiguration" });
    }
  });

  app.post("/api/vehicle-configs", requireAdmin, async (req: Request, res: Response) => {
    try {
      const config = await storage.createVehicleConfig(req.body);
      res.status(201).json(config);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Erstellen der Fahrzeug-Konfiguration" });
    }
  });

  app.patch("/api/vehicle-configs/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const config = await storage.updateVehicleConfig(id, req.body);
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Aktualisieren der Fahrzeug-Konfiguration" });
    }
  });

  app.delete("/api/vehicle-configs/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteVehicleConfig(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Löschen der Fahrzeug-Konfiguration" });
    }
  });

  // Export all vehicle configurations as JSON
  app.get("/api/vehicle-configs/export/json", requireAuth, async (_req: Request, res: Response) => {
    try {
      const configs = await storage.getAllVehicleConfigs();
      const qualsList = await storage.getAllQualifikationen();
      
      // Extract unique base and addon qualifications from configs
      const baseQuals = new Set<string>();
      const addonQuals = new Set<string>();
      
      for (const config of configs) {
        const slots = config.slots as any[];
        for (const slot of slots) {
          if (slot.requires) {
            slot.requires.forEach((q: string) => baseQuals.add(q));
          }
          if (slot.requires_any) {
            slot.requires_any.forEach((q: string) => baseQuals.add(q));
          }
          if (slot.addons_required) {
            slot.addons_required.forEach((q: string) => addonQuals.add(q));
          }
        }
      }
      
      const exportData = {
        qual_flags_info: {
          base: Array.from(baseQuals),
          addons: Array.from(addonQuals),
        },
        vehicles: configs.map(c => ({
          vehicle: c.vehicle,
          type: c.type,
          slots: c.slots,
          constraints: c.constraints || {},
        })),
      };
      
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="vehicle-configs.json"');
      res.json(exportData);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Exportieren der Fahrzeug-Konfigurationen" });
    }
  });

  // Import vehicle configurations from JSON
  app.post("/api/vehicle-configs/import/json", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { vehicles } = req.body;
      
      if (!vehicles || !Array.isArray(vehicles)) {
        return res.status(400).json({ error: "Ungültiges Format" });
      }
      
      let imported = 0;
      let skipped = 0;
      
      for (const vehicleData of vehicles) {
        const existing = await storage.getVehicleConfigByName(vehicleData.vehicle);
        if (existing) {
          skipped++;
        } else {
          await storage.createVehicleConfig({
            vehicle: vehicleData.vehicle,
            type: vehicleData.type,
            slots: vehicleData.slots,
            constraints: vehicleData.constraints || null,
          });
          imported++;
        }
      }
      
      res.json({ imported, skipped, total: vehicles.length });
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Importieren der Fahrzeug-Konfigurationen" });
    }
  });

  // Availability management
  // Get current user's availability for a specific date
  app.get("/api/availability/:date", requireAuth, async (req: Request, res: Response) => {
    try {
      const { date } = req.params;
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: "Nicht angemeldet" });
      }
      
      const availability = await storage.getUserAvailability(userId, date);
      res.json(availability || null);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Abrufen der Verfügbarkeit" });
    }
  });

  // Get current user's all availability records
  app.get("/api/availability", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: "Nicht angemeldet" });
      }
      
      const availabilities = await storage.getUserAvailabilities(userId);
      res.json(availabilities);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Abrufen der Verfügbarkeiten" });
    }
  });

  // Alias for /api/availability (plural form for consistency)
  app.get("/api/availabilities", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: "Nicht angemeldet" });
      }
      
      const availabilities = await storage.getUserAvailabilities(userId);
      res.json(availabilities);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Abrufen der Verfügbarkeiten" });
    }
  });

  // Set user availability for a specific date
  app.post("/api/availability", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: "Nicht angemeldet" });
      }
      
      const availabilitySchema = z.object({
        date: z.string(),
        status: z.enum(["available", "unavailable"]),
        reason: z.string().nullable().optional(),
      });
      
      const validation = availabilitySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Ungültige Daten", details: validation.error });
      }
      
      const { date, status, reason } = validation.data;
      
      // Store old availability for potential rollback
      let oldAvailability = null;
      const today = new Date().toISOString().split('T')[0];
      if (date === today) {
        try {
          oldAvailability = await storage.getUserAvailability(userId, date);
        } catch {
          // No existing availability to rollback to
        }
      }
      
      const availability = await storage.setAvailability({
        user_id: userId,
        date,
        status,
        reason: reason || null,
      });
      
      // If changing availability for today, trigger automatic reassignment
      if (date === today) {
        try {
          // Get old assignments before reassignment
          const oldAssignments = await storage.getCurrentAssignments();
          
          // Get available users for today
          const availableUsers = await storage.getAvailableUsers(today);
          
          // Get all vehicle configurations
          const vehicleConfigs = await storage.getAllVehicleConfigs();
          
          // Run assignment algorithm with only available users
          const result = await assignCrewToVehicles(availableUsers, vehicleConfigs, storage, today);
          
          // Save assignments to database
          const assignmentsToSave: Array<{
            user_id: string;
            vehicle_config_id: number;
            position: string;
            trupp_partner_id: string | null;
          }> = [];
          
          for (const vehicleAssignment of result.assignments) {
            const vehicleConfig = vehicleConfigs.find(
              vc => vc.vehicle === (vehicleAssignment as any).vehicle
            );
            
            if (!vehicleConfig) continue;
            
            for (const slot of vehicleAssignment.slots) {
              if (slot.assignedUser) {
                let truppPartnerId: string | null = null;
                
                if (slot.position.includes("trupp") && !slot.position.includes("führer")) {
                  const truppName = slot.position.replace(/\s*\(.*?\)/, "");
                  const partnerSlot = vehicleAssignment.slots.find(
                    s => s.position !== slot.position && 
                         s.position.includes(truppName) && 
                         s.assignedUser
                  );
                  if (partnerSlot && partnerSlot.assignedUser) {
                    truppPartnerId = partnerSlot.assignedUser.id;
                  }
                }
                
                assignmentsToSave.push({
                  user_id: slot.assignedUser.id,
                  vehicle_config_id: vehicleConfig.id,
                  position: slot.position,
                  trupp_partner_id: truppPartnerId,
                });
              }
            }
          }
          
          await storage.setCurrentAssignments(assignmentsToSave);
          
          // Detect which users have been reassigned and send notifications
          const reassignedUserIds = new Set<string>();
          
          for (const newAssignment of assignmentsToSave) {
            const oldAssignment = oldAssignments.find(a => a.user_id === newAssignment.user_id);
            
            // User is reassigned if:
            // 1. They have a new assignment and didn't have one before (new position)
            // 2. Their vehicle changed
            // 3. Their position changed
            if (!oldAssignment || 
                oldAssignment.vehicle_config_id !== newAssignment.vehicle_config_id ||
                oldAssignment.position !== newAssignment.position) {
              reassignedUserIds.add(newAssignment.user_id);
            }
          }
          
          // Also check for users who lost their assignment
          for (const oldAssignment of oldAssignments) {
            const stillAssigned = assignmentsToSave.some(a => a.user_id === oldAssignment.user_id);
            if (!stillAssigned) {
              reassignedUserIds.add(oldAssignment.user_id);
            }
          }
          
          // Send push notifications to reassigned users
          if (reassignedUserIds.size > 0) {
            const changedByUser = await storage.getUser(userId);
            const changedByName = changedByUser ? `${changedByUser.vorname} ${changedByUser.nachname}` : "Ein Kamerad";
            
            try {
              await pushService.sendToMultipleUsers(
                Array.from(reassignedUserIds).filter(id => id !== userId), // Don't notify the user who made the change
                {
                  title: "Neue Zuteilung",
                  body: `${changedByName} hat die Verfügbarkeit geändert. Deine Zuteilung wurde angepasst.`,
                  icon: "/logo.png",
                  data: {
                    type: "reassignment",
                    timestamp: new Date().toISOString(),
                  }
                }
              );
            } catch (pushError) {
              console.error("Error sending push notifications:", pushError);
              // Don't fail the availability change if push notifications fail
            }
          }
        } catch (error) {
          console.error("Error during automatic reassignment after availability change:", error);
          
          // Rollback availability change if reassignment failed
          if (oldAvailability) {
            try {
              await storage.setAvailability(oldAvailability);
            } catch (rollbackError) {
              console.error("Failed to rollback availability change:", rollbackError);
            }
          } else {
            // No old availability, delete the new one
            try {
              if (availability.id) {
                await storage.deleteAvailability(availability.id);
              }
            } catch (rollbackError) {
              console.error("Failed to rollback availability change:", rollbackError);
            }
          }
          
          return res.status(500).json({ error: "Fehler bei der automatischen Neuzuteilung" });
        }
      }
      
      res.json(availability);
    } catch (error) {
      console.error("Set availability error:", error);
      res.status(500).json({ error: "Fehler beim Setzen der Verfügbarkeit" });
    }
  });

  // Set week availability (batch update for Monday-Sunday)
  app.post("/api/availabilities/week", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Nicht angemeldet" });
      }

      const weekAvailabilitySchema = z.object({
        availabilities: z.array(z.object({
          date: z.string(), // ISO date string (YYYY-MM-DD)
          status: z.enum(["available", "unavailable"]),
        })),
      });

      const validation = weekAvailabilitySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Ungültige Daten", details: validation.error });
      }

      const { availabilities } = validation.data;

      // Set availability for each day
      for (const avail of availabilities) {
        await storage.setAvailability({
          user_id: userId,
          date: avail.date,
          status: avail.status,
        });
      }

      // Trigger automatic crew reassignment
      try {
        const today = new Date().toISOString().split('T')[0];
        const availableUsers = await storage.getAvailableUsers(today);
        const vehicleConfigs = await storage.getAllVehicleConfigs();
        const result = await assignCrewToVehicles(availableUsers, vehicleConfigs, storage, today);

        const assignmentsToSave: Array<{
          user_id: string;
          vehicle_config_id: number;
          position: string;
          trupp_partner_id: string | null;
        }> = [];

        for (const vehicleAssignment of result.assignments) {
          // Find vehicle config by matching the vehicle name string
          const vehicleConfig = vehicleConfigs.find(vc => vc.vehicle === vehicleAssignment.vehicle);
          
          if (!vehicleConfig) {
            console.warn(`Vehicle config not found for vehicle: ${vehicleAssignment.vehicle}`);
            continue;
          }
          
          for (const slot of vehicleAssignment.slots) {
            if (slot.assignedUser) {
              let truppPartnerId: string | null = null;
              
              const isTruppPosition = slot.position.includes("trupp") && 
                                      !slot.position.includes("führer");
              
              if (isTruppPosition) {
                const truppName = slot.position.split(" ")[0];
                const partnerSlot = vehicleAssignment.slots.find(
                  s => s.position !== slot.position && 
                       s.position.includes(truppName) && 
                       s.assignedUser
                );
                if (partnerSlot && partnerSlot.assignedUser) {
                  truppPartnerId = partnerSlot.assignedUser.id;
                }
              }
              
              assignmentsToSave.push({
                user_id: slot.assignedUser.id,
                vehicle_config_id: vehicleConfig.id,
                position: slot.position,
                trupp_partner_id: truppPartnerId,
              });
            }
          }
        }
        
        await storage.setCurrentAssignments(assignmentsToSave);
      } catch (error) {
        console.error("Error during automatic reassignment:", error);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Set week availability error:", error);
      res.status(500).json({ error: "Fehler beim Speichern der Wochenverfügbarkeit" });
    }
  });

  // Delete availability record
  app.delete("/api/availability/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteAvailability(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Löschen der Verfügbarkeit" });
    }
  });

  // Get current assignments (all users can see all assignments)
  app.get("/api/current-assignments", requireAuth, async (req: Request, res: Response) => {
    try {
      const assignments = await storage.getCurrentAssignments();
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Abrufen der aktuellen Zuteilungen" });
    }
  });

  // Get current user's assignment
  app.get("/api/my-assignment", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: "Nicht angemeldet" });
      }
      
      const assignment = await storage.getUserAssignment(userId);
      res.json(assignment || null);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Abrufen der eigenen Zuteilung" });
    }
  });

  // Get assignment history for current user
  app.get("/api/assignments/history", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: "Nicht angemeldet" });
      }
      
      const weeks = parseInt(req.query.weeks as string) || 4;
      const history = await storage.getAssignmentHistory(userId, weeks);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Abrufen der Zuteilungshistorie" });
    }
  });

  // Get assignment history for specific user (Admin/Moderator only)
  app.get("/api/assignments/history/:userId", requireModerator, async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId;
      const weeks = parseInt(req.query.weeks as string) || 4;
      const history = await storage.getAssignmentHistory(userId, weeks);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Abrufen der Zuteilungshistorie" });
    }
  });

  // Get fairness metrics for current user
  app.get("/api/assignments/fairness/me", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: "Nicht angemeldet" });
      }
      
      const metrics = await storage.getFairnessMetrics(userId);
      res.json(metrics || null);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Abrufen der Fairness-Metriken" });
    }
  });

  // Get all fairness metrics (Admin only)
  app.get("/api/assignments/fairness", requireAdmin, async (req: Request, res: Response) => {
    try {
      const metrics = await storage.getAllFairnessMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Abrufen aller Fairness-Metriken" });
    }
  });

  // Automatic Crew Assignment endpoint
  app.post("/api/crew-assignment", requireAuth, async (req: Request, res: Response) => {
    try {
      // Validate request body
      const crewAssignmentSchema = z.object({
        vehicleIds: z.array(z.number()).optional(),
      });
      
      const validation = crewAssignmentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Ungültige Anfrage", details: validation.error });
      }
      
      const { vehicleIds } = validation.data;
      
      // Get available users for today
      const today = new Date().toISOString().split('T')[0];
      const availableUsers = await storage.getAvailableUsers(today);
      
      // Get vehicle configurations
      let vehicleConfigs;
      if (vehicleIds && vehicleIds.length > 0) {
        // Get specific vehicles
        vehicleConfigs = await Promise.all(
          vehicleIds.map(id => storage.getVehicleConfig(id))
        );
        vehicleConfigs = vehicleConfigs.filter(c => c !== undefined);
      } else {
        // Get all vehicles
        vehicleConfigs = await storage.getAllVehicleConfigs();
      }
      
      // Run assignment algorithm with only available users
      const result = await assignCrewToVehicles(availableUsers, vehicleConfigs, storage, today);
      
      // Save assignments to database
      const assignmentsToSave: Array<{
        user_id: string;
        vehicle_config_id: number;
        position: string;
        trupp_partner_id: string | null;
      }> = [];
      
      for (const vehicleAssignment of result.assignments) {
        // Find the vehicle config ID by vehicle name
        const vehicleConfig = vehicleConfigs.find(
          vc => vc.vehicle === (vehicleAssignment as any).vehicle
        );
        
        if (!vehicleConfig) continue;
        
        for (const slot of vehicleAssignment.slots) {
          if (slot.assignedUser) {
            // Find trupp partner for positions like "Angriffstrupp", "Wassertrupp", etc.
            let truppPartnerId: string | null = null;
            
            if (slot.position.includes("trupp") && !slot.position.includes("führer")) {
              const truppName = slot.position.replace(/\s*\(.*?\)/, ""); // Remove qualifications in parentheses
              const partnerSlot = vehicleAssignment.slots.find(
                s => s.position !== slot.position && 
                     s.position.includes(truppName) && 
                     s.assignedUser
              );
              if (partnerSlot && partnerSlot.assignedUser) {
                truppPartnerId = partnerSlot.assignedUser.id;
              }
            }
            
            assignmentsToSave.push({
              user_id: slot.assignedUser.id,
              vehicle_config_id: vehicleConfig.id,
              position: slot.position,
              trupp_partner_id: truppPartnerId,
            });
          }
        }
      }
      
      await storage.setCurrentAssignments(assignmentsToSave);
      
      res.json(result);
    } catch (error) {
      console.error("Crew assignment error:", error);
      res.status(500).json({ error: "Fehler bei der automatischen Zuteilung" });
    }
  });

  // Mängelmeldungen (Vehicle Defect Reports)
  
  // Get all Mängelmeldungen
  app.get("/api/maengelmeldungen", requireAuth, async (req: Request, res: Response) => {
    try {
      const meldungen = await storage.getAllMaengelMeldungen();
      res.json(meldungen);
    } catch (error) {
      console.error("Error fetching Mängelmeldungen:", error);
      res.status(500).json({ error: "Fehler beim Laden der Mängelmeldungen" });
    }
  });
  
  // Get Mängelmeldung by ID
  app.get("/api/maengelmeldungen/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const meldung = await storage.getMaengelMeldung(id);
      
      if (!meldung) {
        return res.status(404).json({ error: "Mängelmeldung nicht gefunden" });
      }
      
      res.json(meldung);
    } catch (error) {
      console.error("Error fetching Mängelmeldung:", error);
      res.status(500).json({ error: "Fehler beim Laden der Mängelmeldung" });
    }
  });
  
  // Get Mängelmeldungen by Vehicle ID
  app.get("/api/vehicles/:vehicleId/maengelmeldungen", requireAuth, async (req: Request, res: Response) => {
    try {
      const vehicleId = parseInt(req.params.vehicleId);
      const meldungen = await storage.getMaengelMeldungenByVehicle(vehicleId);
      res.json(meldungen);
    } catch (error) {
      console.error("Error fetching Mängelmeldungen:", error);
      res.status(500).json({ error: "Fehler beim Laden der Mängelmeldungen" });
    }
  });
  
  // Create new Mängelmeldung
  app.post("/api/maengelmeldungen", requireAuth, async (req: Request, res: Response) => {
    try {
      // Validate photo sizes (max 5 photos, each max 2MB base64 ≈ 1.5MB original)
      const MAX_PHOTOS = 5;
      const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // 2MB in base64
      
      if (req.body.fotos && req.body.fotos.length > MAX_PHOTOS) {
        return res.status(400).json({ error: `Maximal ${MAX_PHOTOS} Fotos erlaubt` });
      }
      
      if (req.body.fotos) {
        for (const foto of req.body.fotos) {
          if (foto.length > MAX_PHOTO_SIZE) {
            return res.status(400).json({ error: "Foto zu groß (max 2MB pro Foto)" });
          }
        }
      }
      
      const meldungData = insertMaengelMeldungSchema.parse({
        ...req.body,
        melder_id: req.session.userId, // Set melder_id to current user
      });
      
      const meldung = await storage.createMaengelMeldung(meldungData);
      res.status(201).json(meldung);
    } catch (error) {
      console.error("Error creating Mängelmeldung:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Ungültige Daten", details: error.errors });
      }
      res.status(500).json({ error: "Fehler beim Erstellen der Mängelmeldung" });
    }
  });
  
  // Update Mängelmeldung (status, bemerkung) - Admin/Moderator only for status changes
  app.put("/api/maengelmeldungen/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Validate updates with Zod (only allow status and bemerkung)
      const updateSchema = z.object({
        status: z.enum(["offen", "in_bearbeitung", "behoben"]).optional(),
        bemerkung: z.string().nullable().optional(),
      });
      
      const updates = updateSchema.parse(req.body);
      
      // Check if user is admin/moderator for status changes
      if (updates.status) {
        const user = await storage.getUser(req.session.userId!);
        if (!user || (user.role !== "admin" && user.role !== "moderator")) {
          return res.status(403).json({ error: "Nur Administratoren und Moderatoren können den Status ändern" });
        }
      }
      
      const meldung = await storage.updateMaengelMeldung(id, updates);
      res.json(meldung);
    } catch (error) {
      console.error("Error updating Mängelmeldung:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Ungültige Daten", details: error.errors });
      }
      res.status(500).json({ error: "Fehler beim Aktualisieren der Mängelmeldung" });
    }
  });
  
  // Delete Mängelmeldung (admin only)
  app.delete("/api/maengelmeldungen/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMaengelMeldung(id);
      res.json({ message: "Mängelmeldung erfolgreich gelöscht" });
    } catch (error) {
      console.error("Error deleting Mängelmeldung:", error);
      res.status(500).json({ error: "Fehler beim Löschen der Mängelmeldung" });
    }
  });

  // Availability Template Endpoints
  
  // Get user's templates
  app.get("/api/availability/templates", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      console.log("[Templates] Fetching templates for userId:", userId);
      const templates = await storage.getUserTemplates(userId);
      console.log("[Templates] Found templates:", templates);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ error: "Fehler beim Laden der Vorlagen" });
    }
  });

  // Create new template
  app.post("/api/availability/templates", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      console.log("[Templates] Creating template for userId:", userId, "Data:", req.body);
      const template = await storage.createTemplate({
        ...req.body,
        user_id: userId,
      });
      console.log("[Templates] Created template:", template);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(400).json({ error: "Fehler beim Erstellen der Vorlage" });
    }
  });

  // Update template
  app.patch("/api/availability/templates/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.updateTemplate(id, req.body);
      res.json(template);
    } catch (error) {
      console.error("Error updating template:", error);
      res.status(400).json({ error: "Fehler beim Aktualisieren der Vorlage" });
    }
  });

  // Delete template
  app.delete("/api/availability/templates/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTemplate(id);
      res.json({ message: "Vorlage erfolgreich gelöscht" });
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ error: "Fehler beim Löschen der Vorlage" });
    }
  });

  // Apply template to a week
  app.post("/api/availability/templates/:id/apply", requireAuth, async (req: Request, res: Response) => {
    try {
      const templateId = parseInt(req.params.id);
      const { weekStartDate } = req.body;
      
      if (!weekStartDate) {
        return res.status(400).json({ error: "weekStartDate erforderlich" });
      }

      const availabilities = await storage.applyTemplateToWeek(
        req.session.userId!,
        templateId,
        weekStartDate
      );
      res.json(availabilities);
    } catch (error) {
      console.error("Error applying template:", error);
      res.status(400).json({ error: "Fehler beim Anwenden der Vorlage" });
    }
  });

  // User Reminder Settings Endpoints
  
  // Get reminder settings
  app.get("/api/availability/reminder-settings", requireAuth, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getReminderSettings(req.session.userId!);
      res.json(settings || {
        user_id: req.session.userId!,
        reminder_enabled: false,
        reminder_time: "18:00",
        reminder_weekdays: ["sunday"],
      });
    } catch (error) {
      console.error("Error fetching reminder settings:", error);
      res.status(500).json({ error: "Fehler beim Laden der Erinnerungseinstellungen" });
    }
  });

  // Update reminder settings
  app.patch("/api/availability/reminder-settings", requireAuth, async (req: Request, res: Response) => {
    try {
      const settings = await storage.updateReminderSettings(req.session.userId!, req.body);
      res.json(settings);
    } catch (error) {
      console.error("Error updating reminder settings:", error);
      res.status(400).json({ error: "Fehler beim Aktualisieren der Erinnerungseinstellungen" });
    }
  });

  // Push Notification Endpoints
  const pushService = new PushNotificationService(storage);

  // Start Availability Reminder Scheduler
  const reminderScheduler = new ReminderScheduler(pushService);
  reminderScheduler.start();

  // Get VAPID public key for frontend
  app.get("/api/push/vapid-public-key", requireAuth, (req: Request, res: Response) => {
    res.json({ publicKey: getVapidPublicKey() });
  });

  // Subscribe to push notifications
  app.post("/api/push/subscribe", requireAuth, async (req: Request, res: Response) => {
    try {
      const subscription = insertPushSubscriptionSchema.parse({
        ...req.body,
        user_id: req.session.userId,
      });
      
      await storage.savePushSubscription(subscription);
      res.status(201).json({ message: "Subscription erfolgreich gespeichert" });
    } catch (error) {
      console.error("Error saving push subscription:", error);
      res.status(400).json({ error: "Ungültige Subscription-Daten" });
    }
  });

  // Unsubscribe from push notifications
  app.post("/api/push/unsubscribe", requireAuth, async (req: Request, res: Response) => {
    try {
      const { endpoint } = req.body;
      if (!endpoint) {
        return res.status(400).json({ error: "Endpoint fehlt" });
      }
      
      await storage.deletePushSubscription(endpoint);
      res.json({ message: "Subscription erfolgreich gelöscht" });
    } catch (error) {
      console.error("Error deleting push subscription:", error);
      res.status(500).json({ error: "Fehler beim Löschen der Subscription" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
