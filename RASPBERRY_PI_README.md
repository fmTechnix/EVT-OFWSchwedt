# 🍓 EVT auf Raspberry Pi installieren

## 📦 Was du bekommst

Alle Dateien für eine vollständige Installation deiner Feuerwehr-Einsatzverwaltung auf einem Raspberry Pi:

### ✅ Fertige Dateien:

1. **`database-export.sql`** (163 KB)
   - Alle deine Daten aus Replit
   - 83 Benutzer
   - 10 Fahrzeuge  
   - 55 aktuelle Zuteilungen
   - 214 Verlaufseinträge
   - 16 AAO-Stichworte

2. **`RASPBERRY_PI_SCHNELLSTART.md`**
   - **15-Minuten Installation** (empfohlen!)
   - Alle Befehle zum Copy-Paste
   - Schneller Einstieg

3. **`RASPBERRY_PI_INSTALLATION.md`**
   - Vollständige Dokumentation
   - Troubleshooting
   - Wartung & Backup
   - Cloudflare Tunnel Setup

4. **`export-database.ts`**
   - Script zum Exportieren neuer Daten
   - Falls du später Updates brauchst

5. **`.env.example`**
   - Vorlage für Umgebungsvariablen
   - Wird zu `.env` kopiert

6. **`ecosystem.config.cjs`**
   - PM2 Konfiguration
   - Automatischer Start

## 🚀 So geht's los:

### 1. Schnellste Methode (15 Min):

```bash
# Auf deinem Raspberry Pi:
cd /home/pi
git clone https://github.com/fmTechnix/EVT.git
cd EVT

# Folge der Anleitung:
cat RASPBERRY_PI_SCHNELLSTART.md
```

### 2. Mit deinen existierenden Daten:

Die Datei `database-export.sql` enthält **ALLE** deine Daten aus Replit:

```bash
# 1. Lade database-export.sql auf den Pi:
scp database-export.sql pi@raspberrypi.local:/home/pi/EVT/

# 2. Importiere auf dem Pi:
cd /home/pi/EVT
psql $DATABASE_URL < database-export.sql
```

## 🎯 Was wird installiert?

- **Node.js 20** - JavaScript Runtime
- **PostgreSQL** - Datenbank
- **PM2** - Process Manager (automatischer Start)
- **Cloudflared** - Tunnel für evt-ofwschwedt.de
- **EVT App** - Deine Feuerwehr-Einsatzverwaltung

## 📍 Nach der Installation:

Die App läuft unter:
- **Lokal:** http://raspberrypi.local:5000
- **Internet:** https://evt-ofwschwedt.de (mit Cloudflare Tunnel)

**Login:**
```
Benutzername: admin
Passwort: Feuer123
```

## 🔒 Vorteile gegenüber Replit:

✅ **Keine Cookie-Probleme** (kein iframe!)  
✅ **Volle Kontrolle** über deine Daten  
✅ **Offline-fähig** im lokalen Netzwerk  
✅ **Günstiger** (einmalige Pi-Kosten)  
✅ **Schneller** (lokales Netzwerk)  

## 🆘 Hilfe benötigt?

1. **Schnellstart:** `RASPBERRY_PI_SCHNELLSTART.md`
2. **Details:** `RASPBERRY_PI_INSTALLATION.md`
3. **Probleme:** Siehe Troubleshooting-Abschnitt

## 📊 System-Anforderungen:

- Raspberry Pi 3 oder neuer (empfohlen: Pi 4 mit 4GB RAM)
- Raspberry Pi OS (64-bit empfohlen)
- Mindestens 8GB SD-Karte (16GB+ empfohlen)
- Stabile Internetverbindung (für Updates)

## ⚡ Schnellbefehle:

```bash
# Status prüfen
pm2 status

# Logs anschauen
pm2 logs evt

# App neustarten
pm2 restart evt

# Backup erstellen
pg_dump $DATABASE_URL > backup.sql
```

---

**Viel Erfolg bei der Installation! 🚒**
