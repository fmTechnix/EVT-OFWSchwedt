# EVT Installation auf Raspberry Pi

## Voraussetzungen

- Raspberry Pi 3 oder neuer (empfohlen: Pi 4 mit 4GB RAM)
- Raspberry Pi OS (64-bit empfohlen)
- Internetzugang
- SSH-Zugriff auf den Pi

## 1. System vorbereiten

```bash
# System aktualisieren
sudo apt update && sudo apt upgrade -y

# Node.js 20.x installieren
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL installieren
sudo apt install -y postgresql postgresql-contrib

# PM2 global installieren
sudo npm install -g pm2

# Git installieren (falls nicht vorhanden)
sudo apt install -y git
```

## 2. PostgreSQL einrichten

```bash
# PostgreSQL Benutzer und Datenbank erstellen
sudo -u postgres psql << EOF
CREATE USER evt_user WITH PASSWORD 'DeinSicheresPasswort123!';
CREATE DATABASE evt_db OWNER evt_user;
GRANT ALL PRIVILEGES ON DATABASE evt_db TO evt_user;
\c evt_db
GRANT ALL ON SCHEMA public TO evt_user;
EOF
```

## 3. App vom GitHub herunterladen

```bash
# Repository klonen
cd /home/pi
git clone https://github.com/fmTechnix/EVT.git
cd EVT

# Dependencies installieren
npm install

# Frontend bauen
npm run build
```

## 4. Umgebungsvariablen konfigurieren

Erstelle die Datei `.env`:

```bash
nano .env
```

Füge folgende Zeilen ein:

```env
# Database
DATABASE_URL=postgresql://evt_user:DeinSicheresPasswort123!@localhost:5432/evt_db

# Session Secret (ändere dies zu einem zufälligen String!)
SESSION_SECRET=GenerierEinenLangenZufallsString123!

# Push Notifications (VAPID Keys)
# Generiere diese mit: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=dein_vapid_public_key
VAPID_PRIVATE_KEY=dein_vapid_private_key
VAPID_SUBJECT=mailto:admin@evt-ofwschwedt.de

# Production Mode
NODE_ENV=production
PORT=5000
```

Speichern mit `Strg+O`, Enter, `Strg+X`

## 5. VAPID Keys generieren

```bash
npx web-push generate-vapid-keys
```

Kopiere die generierten Keys in die `.env` Datei.

## 6. Datenbank initialisieren

```bash
# Schema in Datenbank pushen
npm run db:push

# Datenbank mit Seed-Daten füllen (optional)
npm run db:seed
```

## 7. Deine existierenden Daten importieren

Falls du bereits Daten in Replit hast, exportiere sie zuerst:

```bash
# Auf Replit ausführen:
node export-database.js
```

Dann auf dem Raspberry Pi importieren:

```bash
# Datei hochladen (via SCP oder direkt kopieren)
# Dann importieren:
psql $DATABASE_URL < database-export.sql
```

## 8. App mit PM2 starten

```bash
# Production build starten
pm2 start ecosystem.config.cjs

# PM2 beim Boot automatisch starten
pm2 startup
# Führe den angezeigten Befehl aus (beginnend mit sudo...)

pm2 save
```

## 9. Status prüfen

```bash
# PM2 Status
pm2 status

# Logs anschauen
pm2 logs evt

# App neu starten
pm2 restart evt
```

## 10. Cloudflare Tunnel einrichten

### Cloudflared installieren

```bash
# ARM64 (Pi 4):
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i cloudflared-linux-arm64.deb

# ARM32 (Pi 3):
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm.deb
sudo dpkg -i cloudflared-linux-arm.deb
```

### Tunnel erstellen

```bash
# Bei Cloudflare anmelden
cloudflared tunnel login

# Tunnel erstellen
cloudflared tunnel create evt-schwedt

# Tunnel-ID notieren (wird angezeigt)
```

### Tunnel konfigurieren

```bash
# Config erstellen
sudo mkdir -p /etc/cloudflared
sudo nano /etc/cloudflared/config.yml
```

Inhalt:

```yaml
tunnel: evt-schwedt
credentials-file: /home/pi/.cloudflared/<TUNNEL-ID>.json

ingress:
  - hostname: evt-ofwschwedt.de
    service: http://localhost:5000
  - hostname: www.evt-ofwschwedt.de
    service: http://localhost:5000
  - service: http_status:404
```

### DNS einrichten

```bash
# DNS Route erstellen
cloudflared tunnel route dns evt-schwedt evt-ofwschwedt.de
cloudflared tunnel route dns evt-schwedt www.evt-ofwschwedt.de
```

### Tunnel als Service starten

```bash
# Service installieren
sudo cloudflared service install

# Service starten
sudo systemctl start cloudflared
sudo systemctl enable cloudflared

# Status prüfen
sudo systemctl status cloudflared
```

## 11. Fertig!

Die App ist jetzt erreichbar unter:
- **https://evt-ofwschwedt.de**
- **https://www.evt-ofwschwedt.de**

## Wartung

### App aktualisieren

```bash
cd /home/pi/EVT
git pull
npm install
npm run build
pm2 restart evt
```

### Logs anschauen

```bash
# App Logs
pm2 logs evt

# Cloudflare Tunnel Logs
sudo journalctl -u cloudflared -f

# PostgreSQL Logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Backup erstellen

```bash
# Datenbank sichern
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Automatisches Backup (täglich um 2 Uhr)
crontab -e
# Zeile hinzufügen:
0 2 * * * pg_dump postgresql://evt_user:DeinPasswort@localhost:5432/evt_db > /home/pi/backups/evt-$(date +\%Y\%m\%d).sql
```

## Troubleshooting

### App startet nicht

```bash
pm2 logs evt --lines 100
```

### Datenbank-Verbindung fehlgeschlagen

```bash
# Teste Connection String
psql "postgresql://evt_user:DeinPasswort@localhost:5432/evt_db"
```

### Port bereits belegt

```bash
# Finde Prozess auf Port 5000
sudo lsof -i :5000
# Beende Prozess
sudo kill <PID>
```

### Cloudflare Tunnel offline

```bash
# Status prüfen
sudo systemctl status cloudflared

# Neu starten
sudo systemctl restart cloudflared
```

## Support

Bei Problemen:
1. Prüfe die Logs mit `pm2 logs evt`
2. Prüfe ob PostgreSQL läuft: `sudo systemctl status postgresql`
3. Prüfe ob Cloudflare Tunnel läuft: `sudo systemctl status cloudflared`
