import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { insertVehicleSchema, insertKameradSchema, insertEinsatzSchema, insertSettingsSchema } from "@shared/schema";
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

  // Besetzungscheck endpoint
  app.get("/api/besetzungscheck", requireAuth, async (_req: Request, res: Response) => {
    try {
      const result = await storage.getBesetzungscheck();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Besetzungscheck" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
