#!/bin/bash
# Git-Repository zu GitHub pushen
# EVT - Feuerwehr Schwedt/Oder

set -e

# Farben
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}======================================"
echo "  EVT zu GitHub pushen"
echo "  Feuerwehr Schwedt/Oder"
echo "======================================${NC}"
echo ""

# GitHub Token prüfen
if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${RED}ERROR: GITHUB_TOKEN nicht gesetzt${NC}"
    echo "Setze das Token mit: export GITHUB_TOKEN=dein_token_hier"
    exit 1
fi

REPO="fmTechnix/EVT"
GITHUB_URL="https://${GITHUB_TOKEN}@github.com/${REPO}.git"

# Git initialisieren (falls nicht vorhanden)
if [ ! -d ".git" ]; then
    echo "Initialisiere Git-Repository..."
    git init
    echo -e "${GREEN}✓ Git initialisiert${NC}"
else
    echo -e "${YELLOW}⚠ Git-Repository existiert bereits${NC}"
fi

# Git-Konfiguration
echo ""
echo "Konfiguriere Git..."
git config user.email "deploy@evt-ofwschwedt.de"
git config user.name "EVT Deployment"
echo -e "${GREEN}✓ Git konfiguriert${NC}"

# Remote hinzufügen/aktualisieren
echo ""
echo "Konfiguriere GitHub Remote..."
if git remote get-url origin &>/dev/null; then
    echo "Remote 'origin' existiert bereits, aktualisiere URL..."
    git remote set-url origin "$GITHUB_URL"
else
    echo "Füge Remote 'origin' hinzu..."
    git remote add origin "$GITHUB_URL"
fi
echo -e "${GREEN}✓ Remote: https://github.com/${REPO}${NC}"

# Branch erstellen
echo ""
echo "Erstelle Branch 'main'..."
git checkout -b main 2>/dev/null || git checkout main
echo -e "${GREEN}✓ Branch: main${NC}"

# Alle Dateien hinzufügen
echo ""
echo "Füge Dateien hinzu..."
git add .
echo -e "${GREEN}✓ Dateien hinzugefügt${NC}"

# Status anzeigen
echo ""
echo "Git Status:"
git status --short | head -20
if [ $(git status --short | wc -l) -gt 20 ]; then
    echo "... und $(( $(git status --short | wc -l) - 20 )) weitere Dateien"
fi

# Commit erstellen
echo ""
echo "Erstelle Commit..."
git commit -m "EVT v1.0.1 - Feuerwehr Einsatzverwaltungstool

Vollständiges Einsatzverwaltungssystem für Feuerwehren mit:

## Kernfunktionen
- Automatische Crew-Zuordnung mit Fairness-System
- AAO (Alarm- und Ausrückeordnung) für keyword-basierte Fahrzeugauswahl
- DE-Alarm Integration für automatische Alarmierung
- Push-Benachrichtigungen (PWA mit Service Worker)
- Verfügbarkeits-Templates für Schichtarbeiter
- Kalender mit RSVP-System
- Mängelmeldungen für Fahrzeuge
- Rollen-System (Admin, Moderator, Member)

## Tech Stack
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS + Shadcn/ui
- Backend: Express.js + PostgreSQL + Drizzle ORM
- Infrastructure: PM2 + Nginx + Cloudflare Tunnel
- PWA: Service Worker + Web Push Notifications

## Deployment
- Optimiert für Raspberry Pi
- Production-Ready mit PM2
- Vollständige Dokumentation in DEPLOYMENT.md

Domain: https://www.evt-ofwschwedt.de"

echo -e "${GREEN}✓ Commit erstellt${NC}"

# Zu GitHub pushen
echo ""
echo -e "${BLUE}Pushe zu GitHub...${NC}"
if git push -u origin main --force; then
    echo -e "${GREEN}✓ Erfolgreich zu GitHub gepusht!${NC}"
else
    echo -e "${RED}✗ Push fehlgeschlagen${NC}"
    echo "Prüfe dein GitHub Token und Internetverbindung"
    exit 1
fi

# Tags erstellen
echo ""
echo "Erstelle Release-Tags..."

# Tag v1.0.0 (Initial Release)
echo "Erstelle Tag v1.0.0..."
git tag -a v1.0.0 -m "EVT v1.0.0 - Initial Release

Feuerwehr-Einsatzverwaltungstool komplett in JavaScript/TypeScript

Features:
- React Frontend mit PWA-Support
- Express.js Backend
- PostgreSQL Datenbank
- Automatische Crew-Zuordnung
- AAO System
- Push-Benachrichtigungen
- 14 Qualifikationen
- 9 Fahrzeugtypen
- Fairness-Rotations-System
- DE-Alarm Integration"

echo -e "${GREEN}✓ Tag v1.0.0 erstellt${NC}"

# Tag v1.0.1 (WebSocket Fix)
echo "Erstelle Tag v1.0.1..."
git tag -a v1.0.1 -m "EVT v1.0.1 - WebSocket-Fehler behoben

Bugfixes:
- WebSocket-Fehler wss://localhost/v2 behoben
- Production-Modus korrekt konfiguriert
- QUICK_FIX.md mit Deployment-Lösung hinzugefügt

Neue Features:
- Download-Seite in der App (/download)
- Selektive Push-Benachrichtigungen im Alarm-Simulator
- Verbesserte Fehlerbehandlung

Dokumentation:
- README.md mit vollständiger Projekt-Übersicht
- Verbesserte DEPLOYMENT.md
- deploy.sh Automatisierungs-Skript"

echo -e "${GREEN}✓ Tag v1.0.1 erstellt${NC}"

# Tags pushen
echo ""
echo "Pushe Tags zu GitHub..."
git push origin --tags --force
echo -e "${GREEN}✓ Tags gepusht${NC}"

# Zusammenfassung
echo ""
echo -e "${BLUE}======================================"
echo "  ✓ Erfolgreich zu GitHub gepusht!"
echo "======================================${NC}"
echo ""
echo -e "${GREEN}Repository:${NC} https://github.com/${REPO}"
echo -e "${GREEN}Code:${NC} https://github.com/${REPO}/tree/main"
echo -e "${GREEN}Releases:${NC} https://github.com/${REPO}/releases"
echo ""
echo -e "${YELLOW}Nächste Schritte:${NC}"
echo "1. Besuche: https://github.com/${REPO}"
echo "2. Erstelle GitHub Releases über die Web-UI:"
echo "   - Gehe zu: https://github.com/${REPO}/releases"
echo "   - Klicke auf 'Draft a new release'"
echo "   - Wähle Tag v1.0.1 aus"
echo "   - Füge evt-projekt.zip als Asset hinzu (optional)"
echo ""
echo -e "${GREEN}✓ Git-Repository ist jetzt live!${NC}"
echo ""
