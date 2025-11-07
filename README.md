# EVT - Einsatzverwaltungstool

**Feuerwehr Schwedt/Oder - Deployment Management System**

[![Version](https://img.shields.io/badge/version-1.0.1-blue.svg)](https://github.com/fmTechnix/EVT/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)

Ein modernes Einsatzverwaltungstool für Feuerwehren mit automatischer Crew-Zuordnung, Verfügbarkeitsplanung, Push-Benachrichtigungen und DE-Alarm Integration.

![EVT Dashboard](dashboard_clean.png)

## 🚀 Features

### Kernfunktionen
- ✅ **Automatische Crew-Zuordnung** basierend auf Qualifikationen und Verfügbarkeit
- ✅ **Fairness-System** für gleichmäßige Positionsverteilung
- ✅ **AAO (Alarm- und Ausrückeordnung)** System für keyword-basierte Fahrzeugauswahl
- ✅ **DE-Alarm Integration** für automatische Alarmierung
- ✅ **Push-Benachrichtigungen** (PWA mit Service Worker)
- ✅ **Verfügbarkeits-Templates** für Schichtarbeiter
- ✅ **Kalender mit RSVP-System** für Veranstaltungen
- ✅ **Mängelmeldungen** für Fahrzeuge
- ✅ **Rollen-System** (Admin, Moderator, Member)

### Technische Features
- 📱 **Progressive Web App (PWA)** - installierbar auf iOS (16.4+) und Android
- 🔔 **Web Push Notifications** mit VAPID-Authentifizierung
- 🎨 **Dark/Light Mode** Support
- 📊 **Dashboard** mit Einsatzübersicht
- 🚒 **14 Qualifikationen** & **9 Fahrzeugtypen**
- 🔄 **Automatische Crew-Rotation** mit konfigurierbaren Zeitfenstern

## 📋 Systemanforderungen

- **Node.js** 18+ (empfohlen: 20 LTS)
- **PostgreSQL** 14+
- **PM2** (Process Manager)
- **Nginx** (für Reverse Proxy)
- **Raspberry Pi** 3B+ oder neuer (empfohlen: Pi 4 mit 2GB+ RAM)

## 🛠️ Installation

### Schnellstart (Lokal)

```bash
# 1. Repository klonen
git clone https://github.com/fmTechnix/EVT.git
cd EVT

# 2. Dependencies installieren
npm install

# 3. Environment-Variablen konfigurieren
cp .env.example .env
# .env bearbeiten und anpassen!

# 4. Datenbank initialisieren
npm run db:push

# 5. Development-Server starten
npm run dev
```

App öffnen: http://localhost:5000

### Production Deployment (Raspberry Pi)

Siehe **[DEPLOYMENT.md](DEPLOYMENT.md)** für die vollständige Anleitung.

**Kurzversion:**
```bash
# Production Build
npm run build

# Mit PM2 starten
pm2 start ecosystem.config.cjs
pm2 save
```

⚠️ **WICHTIG:** Die App MUSS im Production-Modus laufen! Siehe [QUICK_FIX.md](QUICK_FIX.md) bei WebSocket-Problemen.

## 📦 Environment-Variablen

Erstelle eine `.env`-Datei (siehe `.env.example`):

```env
# Datenbank
DATABASE_URL=postgresql://user:password@localhost:5432/evt
PGHOST=localhost
PGPORT=5432
PGUSER=evt_user
PGPASSWORD=SICHERES_PASSWORT
PGDATABASE=evt

# Session
SESSION_SECRET=SEHR_LANGES_ZUFÄLLIGES_SECRET_MINDESTENS_32_ZEICHEN

# Push Notifications
VAPID_PUBLIC_KEY=DEIN_PUBLIC_KEY
VAPID_PRIVATE_KEY=DEIN_PRIVATE_KEY
VAPID_SUBJECT=mailto:admin@evt-ofwschwedt.de

# Production
NODE_ENV=production
PORT=5000
```

### VAPID Keys generieren

```bash
npm install -g web-push
web-push generate-vapid-keys
```

## 🏗️ Tech Stack

### Frontend
- **React** 18 mit TypeScript
- **Vite** (Build Tool)
- **Wouter** (Routing)
- **TanStack Query** (Data Fetching)
- **Shadcn/ui** (UI Components)
- **Tailwind CSS** (Styling)
- **Service Worker** (PWA & Push Notifications)

### Backend
- **Express.js** (Web Server)
- **PostgreSQL** mit **Neon Serverless**
- **Drizzle ORM** (Database)
- **Passport.js** (Authentication)
- **web-push** (Push Notifications)
- **PM2** (Process Management)

### Infrastructure
- **Nginx** (Reverse Proxy)
- **Cloudflare Tunnel** (Secure Access)
- **Raspberry Pi** (Hosting)

## 📂 Projektstruktur

```
EVT/
├── client/              # React Frontend
│   ├── src/
│   │   ├── pages/      # Seiten-Komponenten
│   │   ├── components/ # UI-Komponenten
│   │   ├── hooks/      # Custom Hooks
│   │   └── lib/        # Utilities
│   └── public/         # Statische Assets
├── server/             # Express Backend
│   ├── routes.ts       # API-Routen
│   ├── storage.ts      # Datenbank-Interface
│   ├── pg-storage.ts   # PostgreSQL Implementation
│   ├── push-service.ts # Push-Benachrichtigungen
│   └── seeds/          # Datenbank-Seeds
├── shared/             # Geteilter Code
│   └── schema.ts       # Drizzle Schema
├── DEPLOYMENT.md       # Deployment-Anleitung
├── QUICK_FIX.md        # Troubleshooting
└── ecosystem.config.cjs # PM2-Konfiguration
```

## 🔧 Verfügbare Scripts

```bash
npm run dev       # Development-Server starten
npm run build     # Production Build erstellen
npm start         # Production-Server starten
npm run db:push   # Datenbank-Schema pushen
npm run check     # TypeScript prüfen
```

## 📖 Dokumentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Vollständige Raspberry Pi Installation
- **[QUICK_FIX.md](QUICK_FIX.md)** - WebSocket-Fehler beheben
- **[QUICK_START.md](QUICK_START.md)** - Schnelleinstieg

## 🔐 Standard-Login

Nach der Installation kannst du dich mit einem Admin-Account einloggen. Der erste Benutzer wird automatisch als Admin angelegt.

⚠️ **Sicherheitshinweis:** Ändere das Passwort nach dem ersten Login!

## 🚒 Feuerwehr-spezifische Features

### AAO (Alarm- und Ausrückeordnung)
Keyword-basierte Fahrzeugauswahl:
- `B:Klein` → LF 10
- `B:Mittel` → LF 10 + DLK 23
- `H:VU P` → LF 10 + RW 1 + DLK 23

### DE-Alarm Integration
Automatische Alarmierung via Brandenburg's 3PI (Third-Party Interface):
- Webhook-Endpoint für eingehende Alarme
- Automatische Crew-Zuordnung basierend auf AAO
- Push-Benachrichtigungen an betroffene Kameraden

### Qualifikationen
- Truppführer (TF)
- Gruppenführer (GF)
- Maschinist (MA)
- Atemschutzgeräteträger (AT)
- und 10 weitere...

## 🤝 Contributing

Bei Problemen oder Verbesserungsvorschlägen bitte ein Issue erstellen.

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE)

## 👨‍💻 Autor

**Feuerwehr Schwedt/Oder**
- Website: https://www.evt-ofwschwedt.de
- Email: admin@evt-ofwschwedt.de

## 🙏 Danksagungen

- Brandenburg Feuerwehr für AAO-Standards
- Netzwerk 112 für DE-Alarm API-Zugang
- Replit für Entwicklungsplattform

---

**⚠️ Wichtiger Hinweis:** Dieses System ist für den Einsatz in Feuerwehren optimiert und sollte nur in sicheren, vertrauenswürdigen Umgebungen betrieben werden.
