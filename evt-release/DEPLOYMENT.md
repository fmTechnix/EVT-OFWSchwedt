# EVT Deployment auf Raspberry Pi

## Systemanforderungen

- Raspberry Pi 3B+ oder neuer (empfohlen: Pi 4 mit mindestens 2GB RAM)
- Raspberry Pi OS (64-bit empfohlen)
- Node.js 18+ und npm
- PostgreSQL 14+
- PM2 (Process Manager)
- Nginx (für Reverse Proxy)

## 1. Vorbereitung auf dem Raspberry Pi

### 1.1 System aktualisieren
```bash
sudo apt update
sudo apt upgrade -y
```

### 1.2 Node.js installieren
```bash
# Node.js 20.x LTS installieren
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Version prüfen
node --version  # sollte v20.x.x anzeigen
npm --version
```

### 1.3 PostgreSQL installieren
```bash
sudo apt install -y postgresql postgresql-contrib

# PostgreSQL starten
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Datenbank und Benutzer erstellen
sudo -u postgres psql

# In PostgreSQL:
CREATE DATABASE evt;
CREATE USER evt_user WITH ENCRYPTED PASSWORD 'SICHERES_PASSWORT_HIER';
GRANT ALL PRIVILEGES ON DATABASE evt TO evt_user;
\q
```

### 1.4 PM2 global installieren
```bash
sudo npm install -g pm2
```

### 1.5 Nginx installieren
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## 2. Projekt auf Raspberry Pi übertragen

### Option A: Git Clone (empfohlen)
```bash
cd /home/pi
git clone <DEIN_REPOSITORY_URL> evt
cd evt
```

### Option B: Manueller Upload
```bash
# Auf deinem Entwicklungsrechner:
# Projekt als ZIP exportieren, dann auf Pi:
scp evt.zip pi@raspberry-ip:/home/pi/
ssh pi@raspberry-ip
cd /home/pi
unzip evt.zip
cd evt
```

## 3. Projekt einrichten

### 3.1 Dependencies installieren
```bash
npm install --production
```

### 3.2 Environment-Variablen konfigurieren
```bash
# .env Datei erstellen
nano .env
```

Folgende Variablen eintragen (siehe .env.example):
```env
# Datenbank
DATABASE_URL=postgresql://evt_user:PASSWORT@localhost:5432/evt
PGHOST=localhost
PGPORT=5432
PGUSER=evt_user
PGPASSWORD=SICHERES_PASSWORT_HIER
PGDATABASE=evt

# Session
SESSION_SECRET=SEHR_LANGES_ZUFÄLLIGES_SECRET_MINDESTENS_32_ZEICHEN

# Push Notifications (VAPID Keys generieren!)
VAPID_PUBLIC_KEY=DEIN_PUBLIC_KEY
VAPID_PRIVATE_KEY=DEIN_PRIVATE_KEY
VAPID_SUBJECT=mailto:admin@evt-ofwschwedt.de

# Production Mode
NODE_ENV=production
PORT=5000
```

### 3.3 VAPID Keys generieren
```bash
# Installiere web-push CLI
npm install -g web-push

# Generiere Keys
web-push generate-vapid-keys

# Output kopieren in .env:
# Public Key: VAPID_PUBLIC_KEY=...
# Private Key: VAPID_PRIVATE_KEY=...
```

### 3.4 Datenbank initialisieren
```bash
# Schema in Datenbank pushen
npm run db:push
```

### 3.5 Production Build erstellen
```bash
npm run build
```

## 4. PM2 konfigurieren

### 4.1 PM2 Ecosystem-Datei erstellen
Die Datei `ecosystem.config.cjs` wurde bereits erstellt.

### 4.2 App mit PM2 starten
```bash
# App starten
pm2 start ecosystem.config.cjs

# Status prüfen
pm2 status

# Logs anzeigen
pm2 logs evt

# PM2 beim Boot starten
pm2 startup
# Führe den ausgegebenen Befehl aus (z.B. sudo env PATH=...)

# Aktuelle PM2-Konfiguration speichern
pm2 save
```

### 4.3 Nützliche PM2 Befehle
```bash
pm2 restart evt     # App neu starten
pm2 stop evt        # App stoppen
pm2 logs evt        # Logs anzeigen
pm2 monit          # Monitoring
pm2 delete evt     # App entfernen
```

## 5. Nginx konfigurieren

### 5.1 Nginx-Konfiguration erstellen
```bash
sudo nano /etc/nginx/sites-available/evt
```

Inhalt (siehe `nginx.conf`):
```nginx
server {
    listen 80;
    server_name www.evt-ofwschwedt.de evt-ofwschwedt.de;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Client Max Body Size (für Foto-Uploads)
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket Support
        proxy_read_timeout 86400;
    }
}
```

### 5.2 Nginx aktivieren und neu laden
```bash
# Symlink erstellen
sudo ln -s /etc/nginx/sites-available/evt /etc/nginx/sites-enabled/

# Standard-Site deaktivieren (optional)
sudo rm /etc/nginx/sites-enabled/default

# Konfiguration testen
sudo nginx -t

# Nginx neu laden
sudo systemctl reload nginx
```

## 6. Cloudflare Tunnel konfigurieren

Du hast bereits einen Cloudflare Tunnel zu 50% eingerichtet. So vervollständigst du ihn:

### 6.1 Cloudflare Tunnel Config
```bash
# Cloudflared installieren (falls noch nicht geschehen)
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Tunnel authentifizieren (nur beim ersten Mal)
cloudflared tunnel login

# Tunnel erstellen (falls noch nicht vorhanden)
cloudflared tunnel create evt-tunnel

# Tunnel routen
cloudflared tunnel route dns evt-tunnel www.evt-ofwschwedt.de
cloudflared tunnel route dns evt-tunnel evt-ofwschwedt.de
```

### 6.2 Tunnel-Konfiguration
```bash
sudo nano ~/.cloudflared/config.yml
```

Inhalt:
```yaml
tunnel: <DEINE_TUNNEL_ID>
credentials-file: /home/pi/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: www.evt-ofwschwedt.de
    service: http://localhost:80
  - hostname: evt-ofwschwedt.de
    service: http://localhost:80
  - service: http_status:404
```

### 6.3 Tunnel als Service starten
```bash
# Service installieren
sudo cloudflared service install

# Service starten
sudo systemctl start cloudflared
sudo systemctl enable cloudflared

# Status prüfen
sudo systemctl status cloudflared
```

## 7. Firewall konfigurieren (optional)

```bash
# UFW installieren und konfigurieren
sudo apt install -y ufw

# SSH erlauben
sudo ufw allow ssh

# HTTP/HTTPS erlauben (für lokalen Zugriff)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Firewall aktivieren
sudo ufw enable
```

## 8. Wartung und Updates

### 8.1 App aktualisieren
```bash
cd /home/pi/evt

# Code aktualisieren (Git)
git pull

# Dependencies aktualisieren
npm install --production

# Neuen Build erstellen
npm run build

# Datenbank-Schema aktualisieren
npm run db:push

# App neu starten
pm2 restart evt
```

### 8.2 Logs überwachen
```bash
# PM2 Logs
pm2 logs evt

# Nginx Logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PostgreSQL Logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### 8.3 Backup erstellen
```bash
# Datenbank-Backup
pg_dump -U evt_user evt > backup_$(date +%Y%m%d).sql

# Backup mit Passwort:
PGPASSWORD=DEIN_PASSWORT pg_dump -U evt_user -h localhost evt > backup_$(date +%Y%m%d).sql

# Backup wiederherstellen:
PGPASSWORD=DEIN_PASSWORT psql -U evt_user -h localhost evt < backup_20241104.sql
```

## 9. Troubleshooting

### App startet nicht
```bash
# Logs prüfen
pm2 logs evt

# Manuell starten zum Debuggen
cd /home/pi/evt
NODE_ENV=production node dist/index.js
```

### Datenbank-Verbindung fehlgeschlagen
```bash
# PostgreSQL Status prüfen
sudo systemctl status postgresql

# Datenbank-Verbindung testen
psql -U evt_user -h localhost -d evt

# Passwort in .env korrekt?
cat .env | grep DATABASE_URL
```

### Nginx-Fehler
```bash
# Nginx-Konfiguration testen
sudo nginx -t

# Nginx-Logs prüfen
sudo tail -f /var/log/nginx/error.log
```

### Port bereits belegt
```bash
# Welcher Prozess nutzt Port 5000?
sudo lsof -i :5000

# Prozess beenden
sudo kill -9 <PID>
```

## 10. Performance-Optimierung für Raspberry Pi

### 10.1 Swap-Speicher erhöhen
```bash
# Swap-Größe prüfen
free -h

# Swap erhöhen (auf 2GB)
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### 10.2 PostgreSQL für Raspberry Pi optimieren
```bash
sudo nano /etc/postgresql/14/main/postgresql.conf
```

Anpassungen:
```
shared_buffers = 128MB
effective_cache_size = 512MB
maintenance_work_mem = 64MB
work_mem = 4MB
```

Neu starten:
```bash
sudo systemctl restart postgresql
```

## 11. Sicherheits-Checkliste

- [ ] Starke Passwörter für PostgreSQL
- [ ] SESSION_SECRET ist lang und zufällig (32+ Zeichen)
- [ ] VAPID Keys sind produktiv generiert
- [ ] PostgreSQL lauscht nur auf localhost
- [ ] Firewall ist aktiv (UFW)
- [ ] Cloudflare Tunnel ist verschlüsselt
- [ ] Regelmäßige Backups eingerichtet
- [ ] SSH-Zugriff nur mit Key-Auth (empfohlen)

## Support

Bei Problemen:
1. PM2 Logs prüfen: `pm2 logs evt`
2. Nginx Logs prüfen: `sudo tail -f /var/log/nginx/error.log`
3. PostgreSQL Status: `sudo systemctl status postgresql`
4. Cloudflare Tunnel Status: `sudo systemctl status cloudflared`
