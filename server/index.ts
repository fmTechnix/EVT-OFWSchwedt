import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import os from "os";

const app = express();

// Trust proxy for secure cookies in Replit/production
app.set("trust proxy", 1);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    printStartupBanner(port);
  });
})();

function printStartupBanner(port: number) {
  const isDev = process.env.NODE_ENV === "development";
  
  // Get local network IP
  const networkInterfaces = os.networkInterfaces();
  let localIP = 'localhost';
  for (const name of Object.keys(networkInterfaces)) {
    const nets = networkInterfaces[name];
    if (!nets) continue;
    for (const net of nets) {
      // Skip internal and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        localIP = net.address;
        break;
      }
    }
  }

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                                                              ║');
  console.log('║   🔥  EVT - Einsatzverwaltungstool                          ║');
  console.log('║       Feuerwehr Schwedt/Oder                                 ║');
  console.log('║                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`   Modus:       ${isDev ? '🔧 Development' : '🚀 Production'}`);
  console.log(`   Status:      ✅ Online`);
  console.log('');
  console.log('   Erreichbar unter:');
  console.log(`   ├─ 🏠  http://localhost:${port}`);
  console.log(`   ├─ 🌐  http://${localIP}:${port}`);
  if (!isDev) {
    console.log(`   └─ 🌍  https://evt-ofwschwedt.de`);
  }
  console.log('');
  console.log('   Funktionen:');
  console.log('   ├─ ✅  Verfügbarkeitsverwaltung');
  console.log('   ├─ ✅  Automatische Besetzung');
  console.log('   ├─ ✅  Push-Benachrichtigungen');
  console.log('   ├─ ✅  DE-Alarm Integration');
  console.log('   └─ ✅  AAO-System');
  console.log('');
  console.log('   📝  Logs: pm2 logs evt');
  console.log('   🛑  Stop: pm2 stop evt');
  console.log('');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');
}
