import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { insertVehicleSchema, insertEinsatzSchema, insertSettingsSchema, insertQualifikationSchema, insertTerminSchema, insertTerminZusageSchema } from "@shared/schema";
import type { User } from "@shared/schema";

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
      if (!user || user.password !== password) {
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
      
      // Verify old password
      if (user.password !== oldPassword) {
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

  app.get("/api/users/export", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      
      // Create CSV content
      const headers = ["Username", "Vorname", "Nachname", "Rolle", "Qualifikationen", "Passwort ändern"];
      const rows = users.map(user => [
        user.username,
        user.vorname,
        user.nachname,
        user.role,
        user.qualifikationen.join(";"),
        user.muss_passwort_aendern ? "Ja" : "Nein"
      ]);
      
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");
      
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="benutzer.csv"');
      res.send("\ufeff" + csvContent); // UTF-8 BOM for Excel compatibility
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Exportieren der Benutzerdaten" });
    }
  });

  app.post("/api/users/import", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { csvData } = req.body;
      
      if (!csvData || typeof csvData !== "string") {
        return res.status(400).json({ error: "CSV-Daten fehlen" });
      }
      
      const lines = csvData.split("\n").filter(line => line.trim());
      if (lines.length < 2) {
        return res.status(400).json({ error: "CSV-Datei muss mindestens einen Header und eine Datenzeile enthalten" });
      }
      
      // Skip header
      const dataLines = lines.slice(1);
      let imported = 0;
      let skipped = 0;
      
      for (const line of dataLines) {
        // Parse CSV line (simple parser, handles quoted values)
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!matches || matches.length < 4) {
          skipped++;
          continue;
        }
        
        const [username, vorname, nachname, role, qualifikationen] = matches.map(
          cell => cell.replace(/^"|"$/g, "").trim()
        );
        
        // Check if user already exists
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser) {
          skipped++;
          continue;
        }
        
        const user: InsertUser = {
          username,
          vorname,
          nachname,
          password: "Feuer123",
          role: role || "member",
          qualifikationen: qualifikationen ? qualifikationen.split(";").filter(q => q.trim()) : ["TM"],
          muss_passwort_aendern: true,
        };
        
        await storage.createUser(user);
        imported++;
      }
      
      res.json({ success: true, imported, skipped });
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Importieren der Benutzerdaten" });
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
      res.status(201).json(vehicle);
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

  const httpServer = createServer(app);
  return httpServer;
}
