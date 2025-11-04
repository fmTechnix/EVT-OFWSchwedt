#!/bin/bash
# EVT Deployment Script für Raspberry Pi
# Feuerwehr Schwedt/Oder

set -e  # Exit bei Fehler

echo "======================================"
echo "EVT Deployment auf Raspberry Pi"
echo "======================================"
echo ""

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Funktionen
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# 1. Git Pull (falls Git verwendet wird)
if [ -d ".git" ]; then
    echo "Aktualisiere Code von Git..."
    git pull
    print_success "Code aktualisiert"
else
    print_warning "Kein Git-Repository - überspringe git pull"
fi

# 2. Dependencies installieren
echo ""
echo "Installiere Dependencies..."
npm install --production
print_success "Dependencies installiert"

# 3. Production Build erstellen
echo ""
echo "Erstelle Production Build..."
npm run build
print_success "Build erstellt"

# 4. Logs-Verzeichnis erstellen
echo ""
echo "Erstelle Logs-Verzeichnis..."
mkdir -p logs
chmod 755 logs
print_success "Logs-Verzeichnis erstellt"

# 5. Datenbank-Schema aktualisieren
echo ""
echo "Aktualisiere Datenbank-Schema..."
if npm run db:push; then
    print_success "Datenbank-Schema aktualisiert"
else
    print_warning "Datenbank-Update fehlgeschlagen - versuche mit --force"
    npm run db:push -- --force
    print_success "Datenbank-Schema aktualisiert (--force)"
fi

# 6. PM2 Status prüfen
echo ""
if command -v pm2 &> /dev/null; then
    if pm2 describe evt &> /dev/null; then
        echo "PM2 läuft bereits - starte neu..."
        pm2 restart evt
        print_success "App neu gestartet"
    else
        echo "Starte App mit PM2..."
        pm2 start ecosystem.config.cjs
        print_success "App gestartet"
    fi
    
    # PM2 Konfiguration speichern
    pm2 save
    
    # Status anzeigen
    echo ""
    pm2 status
else
    print_warning "PM2 nicht installiert - starte App manuell"
    echo "Installiere PM2 mit: sudo npm install -g pm2"
fi

# 7. Nginx neu laden (falls installiert)
echo ""
if command -v nginx &> /dev/null; then
    if sudo nginx -t &> /dev/null; then
        echo "Lade Nginx neu..."
        sudo systemctl reload nginx
        print_success "Nginx neu geladen"
    else
        print_error "Nginx-Konfiguration fehlerhaft!"
        sudo nginx -t
    fi
else
    print_warning "Nginx nicht installiert"
fi

# Zusammenfassung
echo ""
echo "======================================"
echo "Deployment abgeschlossen!"
echo "======================================"
echo ""
echo "Nützliche Befehle:"
echo "  pm2 logs evt         - Logs anzeigen"
echo "  pm2 status           - Status prüfen"
echo "  pm2 restart evt      - App neu starten"
echo "  pm2 monit            - Monitoring"
echo ""
echo "App läuft auf: http://localhost:5000"
echo "Öffentliche URL: https://www.evt-ofwschwedt.de"
echo ""
