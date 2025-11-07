#!/bin/bash
# Git-Repository zu GitHub pushen
# EVT - Feuerwehr Schwedt/Oder

set -e

# Farben
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "======================================"
echo "EVT zu GitHub pushen"
echo "======================================"
echo ""

# GitHub Token prüfen
if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${RED}ERROR: GITHUB_TOKEN nicht gesetzt${NC}"
    echo "Setze das Token mit: export GITHUB_TOKEN=dein_token_hier"
    exit 1
fi

REPO="fmTechnix/EVT"
GITHUB_URL="https://${GITHUB_TOKEN}@github.com/${REPO}.git"

# Git-Konfiguration
echo "Konfiguriere Git..."
git config user.email "deploy@evt-ofwschwedt.de" || true
git config user.name "EVT Deployment" || true
echo -e "${GREEN}✓ Git konfiguriert${NC}"

# Aktuellen Status prüfen
echo ""
echo "Aktueller Status:"
git status

# Remote hinzufügen/aktualisieren
echo ""
echo "Konfiguriere Remote..."
if git remote get-url origin &>/dev/null; then
    echo "Remote 'origin' existiert bereits, aktualisiere URL..."
    git remote set-url origin "$GITHUB_URL"
else
    echo "Füge Remote 'origin' hinzu..."
    git remote add origin "$GITHUB_URL"
fi
echo -e "${GREEN}✓ Remote konfiguriert${NC}"

# Alle Dateien hinzufügen
echo ""
echo "Füge Dateien hinzu..."
git add .
echo -e "${GREEN}✓ Dateien hinzugefügt${NC}"

# Commit erstellen
echo ""
echo "Erstelle Commit..."
if git diff --cached --quiet; then
    echo -e "${YELLOW}⚠ Keine Änderungen zum Committen${NC}"
else
    git commit -m "EVT v1.0.1 - Production-Ready

- WebSocket-Fehler behoben (wss://localhost/v2)
- Vollständige Deployment-Dokumentation
- Automatische Crew-Zuordnung mit Fairness-System
- AAO (Alarm- und Ausrückeordnung) System
- DE-Alarm Integration
- Push-Benachrichtigungen
- PWA-Support für iOS und Android
- Download-Seite
- Verfügbarkeits-Templates
- Erinnerungen-System

Deployment: PM2 + PostgreSQL + Cloudflare Tunnel
Domain: evt-ofwschwedt.de"
    echo -e "${GREEN}✓ Commit erstellt${NC}"
fi

# Branch erstellen/prüfen
echo ""
echo "Prüfe Branch..."
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "Wechsle zu Branch 'main'..."
    git branch -M main
fi
echo -e "${GREEN}✓ Branch: main${NC}"

# Zu GitHub pushen
echo ""
echo "Pushe zu GitHub..."
if git push -u origin main --force; then
    echo -e "${GREEN}✓ Erfolgreich gepusht!${NC}"
else
    echo -e "${RED}✗ Push fehlgeschlagen${NC}"
    exit 1
fi

# Tags erstellen
echo ""
echo "Erstelle Release-Tags..."

# Tag v1.0.0 (Initial Release)
if ! git tag | grep -q "^v1.0.0$"; then
    git tag -a v1.0.0 -m "EVT v1.0.0 - Initial Release

Feuerwehr-Einsatzverwaltungstool komplett in JavaScript/TypeScript
- React Frontend mit PWA-Support
- Express.js Backend
- PostgreSQL Datenbank
- Automatische Crew-Zuordnung
- AAO System
- Push-Benachrichtigungen"
    echo -e "${GREEN}✓ Tag v1.0.0 erstellt${NC}"
else
    echo -e "${YELLOW}⚠ Tag v1.0.0 existiert bereits${NC}"
fi

# Tag v1.0.1 (WebSocket Fix)
if ! git tag | grep -q "^v1.0.1$"; then
    git tag -a v1.0.1 -m "EVT v1.0.1 - WebSocket-Fehler behoben

- WebSocket-Fehler wss://localhost/v2 behoben
- QUICK_FIX.md mit Deployment-Lösung
- Verbesserte Dokumentation
- Download-Seite in der App
- Selektive Push-Benachrichtigungen"
    echo -e "${GREEN}✓ Tag v1.0.1 erstellt${NC}"
else
    echo -e "${YELLOW}⚠ Tag v1.0.1 existiert bereits${NC}"
    # Tag aktualisieren
    git tag -d v1.0.1
    git tag -a v1.0.1 -m "EVT v1.0.1 - WebSocket-Fehler behoben

- WebSocket-Fehler wss://localhost/v2 behoben
- QUICK_FIX.md mit Deployment-Lösung
- Verbesserte Dokumentation
- Download-Seite in der App
- Selektive Push-Benachrichtigungen"
    echo -e "${GREEN}✓ Tag v1.0.1 aktualisiert${NC}"
fi

# Tags pushen
echo ""
echo "Pushe Tags zu GitHub..."
git push origin --tags --force
echo -e "${GREEN}✓ Tags gepusht${NC}"

# Zusammenfassung
echo ""
echo "======================================"
echo "✓ Erfolgreich zu GitHub gepusht!"
echo "======================================"
echo ""
echo "Repository: https://github.com/${REPO}"
echo "Code: https://github.com/${REPO}/tree/main"
echo "Releases: https://github.com/${REPO}/releases"
echo ""
echo "Nächste Schritte:"
echo "1. Besuche: https://github.com/${REPO}/releases"
echo "2. Erstelle Releases manuell über die GitHub-UI oder mit:"
echo "   gh release create v1.0.1 --title 'EVT v1.0.1' --notes 'WebSocket-Fix'"
echo ""
