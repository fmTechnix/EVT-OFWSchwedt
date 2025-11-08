# 🚀 EVT Raspberry Pi Schnellstart

Dieser Guide zeigt dir die **schnellsten** Schritte zur Installation auf dem Raspberry Pi.

## ⚡ Schnellinstallation (15 Minuten)

### 1. System vorbereiten

```bash
# Alles in einem Befehl:
sudo apt update && sudo apt upgrade -y && \
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && \
sudo apt install -y nodejs postgresql postgresql-contrib git && \
sudo npm install -g pm2
```

### 2. Datenbank einrichten

```bash
# PostgreSQL konfigurieren:
sudo -u postgres psql << 'EOF'
CREATE USER evt_user WITH PASSWORD 'Feuer2024Schwedt!';
CREATE DATABASE evt_db OWNER evt_user;
GRANT ALL PRIVILEGES ON DATABASE evt_db TO evt_user;
\c evt_db
GRANT ALL ON SCHEMA public TO evt_user;
EOF
```

### 3. App installieren

```bash
# Repository klonen:
cd /home/pi
git clone https://github.com/fmTechnix/EVT.git
cd EVT

# Dependencies installieren:
npm install

# Frontend bauen:
npm run build
```

### 4. Konfiguration

```bash
# .env Datei erstellen:
cat > .env << 'EOF'
DATABASE_URL=postgresql://evt_user:Feuer2024Schwedt!@localhost:5432/evt_db
SESSION_SECRET=$(openssl rand -base64 32)
NODE_ENV=production
PORT=5000
VAPID_SUBJECT=mailto:admin@evt-ofwschwedt.de
EOF

# VAPID Keys generieren und zur .env hinzufügen:
echo "Generiere VAPID Keys..."
npx web-push generate-vapid-keys | tee vapid-keys.txt
```

**WICHTIG:** Kopiere die VAPID Keys aus `vapid-keys.txt` in deine `.env` Datei:

```bash
nano .env
# Füge hinzu:
# VAPID_PUBLIC_KEY=<dein_public_key>
# VAPID_PRIVATE_KEY=<dein_private_key>
```

### 5. Datenbank initialisieren

**Option A: Mit deinen existierenden Daten**

```bash
# 1. Lade database-export.sql von Replit herunter
# 2. Kopiere es zum Raspberry Pi:
#    scp database-export.sql pi@raspberrypi.local:/home/pi/EVT/

# 3. Importiere:
npm run db:push --force
psql postgresql://evt_user:Feuer2024Schwedt!@localhost:5432/evt_db < database-export.sql
```

**Option B: Neu starten mit Seed-Daten**

```bash
npm run db:push
npm run db:seed
```

### 6. App starten

```bash
# Mit PM2 starten:
pm2 start ecosystem.config.cjs

# Beim Boot automatisch starten:
pm2 startup
# Führe den angezeigten sudo-Befehl aus!
pm2 save

# Status prüfen:
pm2 status
pm2 logs evt
```

### 7. Cloudflare Tunnel (für evt-ofwschwedt.de)

```bash
# Cloudflared installieren (ARM64 für Pi 4):
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i cloudflared-linux-arm64.deb

# Für Pi 3 (ARM32):
# wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm.deb

# Bei Cloudflare anmelden:
cloudflared tunnel login

# Tunnel erstellen:
cloudflared tunnel create evt-schwedt

# Config erstellen:
sudo mkdir -p /etc/cloudflared
cat > /tmp/config.yml << 'EOF'
tunnel: evt-schwedt
credentials-file: /home/pi/.cloudflared/<TUNNEL-ID>.json

ingress:
  - hostname: evt-ofwschwedt.de
    service: http://localhost:5000
  - hostname: www.evt-ofwschwedt.de
    service: http://localhost:5000
  - service: http_status:404
EOF

# Ersetze <TUNNEL-ID> mit deiner echten ID:
TUNNEL_ID=$(ls /home/pi/.cloudflared/*.json | head -1 | sed 's/.*\/\(.*\)\.json/\1/')
sed "s/<TUNNEL-ID>/$TUNNEL_ID/" /tmp/config.yml | sudo tee /etc/cloudflared/config.yml

# DNS einrichten:
cloudflared tunnel route dns evt-schwedt evt-ofwschwedt.de
cloudflared tunnel route dns evt-schwedt www.evt-ofwschwedt.de

# Als Service starten:
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

## ✅ Fertig!

Deine App läuft jetzt unter:
- **Lokal:** http://raspberrypi.local:5000
- **Internet:** https://evt-ofwschwedt.de

## 🔑 Standard Login

```
Benutzername: admin
Passwort: Feuer123
```

**WICHTIG:** Ändere das Passwort sofort nach dem ersten Login!

## 📊 Nützliche Befehle

```bash
# App neustarten
pm2 restart evt

# Logs anschauen
pm2 logs evt

# App stoppen
pm2 stop evt

# Status prüfen
pm2 status

# Cloudflare Tunnel Status
sudo systemctl status cloudflared

# PostgreSQL Status
sudo systemctl status postgresql
```

## 🔄 App aktualisieren

```bash
cd /home/pi/EVT
git pull
npm install
npm run build
pm2 restart evt
```

## 💾 Backup erstellen

```bash
# Einmalig:
pg_dump postgresql://evt_user:Feuer2024Schwedt!@localhost:5432/evt_db > backup.sql

# Automatisch täglich um 2 Uhr:
crontab -e
# Füge hinzu:
0 2 * * * pg_dump postgresql://evt_user:Feuer2024Schwedt!@localhost:5432/evt_db > /home/pi/backups/evt-$(date +\%Y\%m\%d).sql
```

## 🆘 Probleme?

### App startet nicht
```bash
pm2 logs evt --lines 50
```

### Datenbank verbindet nicht
```bash
psql postgresql://evt_user:Feuer2024Schwedt!@localhost:5432/evt_db
# Sollte funktionieren, sonst stimmt Passwort/DB nicht
```

### Port 5000 belegt
```bash
sudo lsof -i :5000
sudo kill <PID>
pm2 restart evt
```

### Cloudflare Tunnel offline
```bash
sudo systemctl restart cloudflared
sudo journalctl -u cloudflared -f
```

---

**Bei weiteren Fragen:** Siehe `RASPBERRY_PI_INSTALLATION.md` für Details!
