import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { insertVehicleSchema, insertKameradSchema, insertEinsatzSchema, insertSettingsSchema, insertQualifikationSchema, insertTerminSchema, insertTerminZusageSchema } from "@shared/schema";
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

  // Kamerad endpoints
  app.get("/api/kameraden", requireAuth, async (_req: Request, res: Response) => {
    try {
      const kameraden = await storage.getAllKameraden();
      res.json(kameraden);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Laden der Kameraden" });
    }
  });

  app.post("/api/kameraden", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = insertKameradSchema.parse(req.body);
      const kamerad = await storage.createKamerad(data);
      res.status(201).json(kamerad);
    } catch (error) {
      res.status(400).json({ error: "Ungültige Kameradendaten" });
    }
  });

  app.delete("/api/kameraden/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteKamerad(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Löschen des Kameraden" });
    }
  });

  app.post("/api/kameraden/seed", requireAdmin, async (_req: Request, res: Response) => {
    try {
      await storage.seedKameraden();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Generieren der Beispieldaten" });
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

  // User endpoints
  app.get("/api/users", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      const sanitized = users.map(sanitizeUser);
      res.json(sanitized);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Laden der Benutzer" });
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
        
        csv += `"${termin.datum}","${termin.uhrzeit}","${termin.titel}","${termin.ort}","${termin.beschreibung}","${ersteller?.name || 'Unbekannt'}",${zugesagt},${abgesagt}\n`;
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
