# WebSocket-Fehler beheben (wss://localhost/v2)

## Problem
Die App läuft im Entwicklungsmodus (`npm run dev`), wodurch Vite versucht, eine WebSocket-Verbindung für Hot Module Replacement aufzubauen. Das funktioniert nicht über den Cloudflare Tunnel.

## Schnelle Lösung

### 1. App stoppen
```bash
# PM2 stoppen (falls läuft)
pm2 stop evt
pm2 delete evt

# Oder Prozess manuell beenden
pkill -f "tsx server/index.ts"
pkill -f "node.*index"
```

### 2. Production Build erstellen
```bash
cd /home/pi/evt

# Build erstellen
npm run build

# Prüfen ob dist/ Ordner erstellt wurde
ls -la dist/
```

### 3. Mit PM2 im Produktionsmodus starten
```bash
# App starten
pm2 start ecosystem.config.cjs

# Status prüfen
pm2 status

# Logs anzeigen
pm2 logs evt --lines 50
```

### 4. PM2 beim Boot automatisch starten
```bash
# PM2 startup script
pm2 startup

# Führe den ausgegebenen Befehl aus (beginnt mit "sudo...")
# Zum Beispiel:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u pi --hp /home/pi

# Aktuelle Konfiguration speichern
pm2 save
```

### 5. Testen
```bash
# Browser öffnen: https://evt-ofwschwedt.de
# Kein WebSocket-Fehler mehr!
```

## Alternative: Manueller Start (zum Testen)

Falls PM2 Probleme macht:

```bash
cd /home/pi/evt

# Build erstellen (falls noch nicht geschehen)
npm run build

# Manuell starten
NODE_ENV=production PORT=5000 node dist/index.js
```

## Prüfen ob alles richtig läuft

```bash
# 1. PM2 Status
pm2 status
# Sollte zeigen: "online"

# 2. Logs prüfen (keine Vite-HMR Meldungen!)
pm2 logs evt --lines 20

# 3. Port prüfen
sudo lsof -i :5000
# Sollte "node dist/index.js" zeigen, NICHT "tsx server/index.ts"

# 4. Environment prüfen
pm2 env 0
# NODE_ENV sollte "production" sein
```

## Häufige Fehler

### ❌ Falsch (Development)
```bash
npm run dev                    # Startet tsx server/index.ts (Development)
pm2 start "npm run dev"        # Falsch!
node server/index.ts           # TypeScript kann nicht direkt ausgeführt werden
```

### ✅ Richtig (Production)
```bash
npm run build                  # Baut das Projekt
npm start                      # Startet node dist/index.js
pm2 start ecosystem.config.cjs # Startet mit PM2 (empfohlen)
```

## Problemlösung

### Build schlägt fehl
```bash
# Logs prüfen
npm run build 2>&1 | tee build.log

# Dependencies neu installieren
rm -rf node_modules
npm install --production
npm run build
```

### PM2 startet nicht
```bash
# Alte PM2-Prozesse löschen
pm2 delete all
pm2 kill

# Neu starten
pm2 start ecosystem.config.cjs
```

### "Cannot find module"
```bash
# Sicherstellen dass Build existiert
ls -la dist/index.js

# Neu bauen
npm run build
```

## Nach dem Fix

Die App sollte jetzt:
- ✅ Im Produktionsmodus laufen
- ✅ KEINE WebSocket-Fehler zeigen
- ✅ Vite HMR ist deaktiviert
- ✅ Optimiert für Production
- ✅ Automatisch bei Reboot starten (mit PM2)
