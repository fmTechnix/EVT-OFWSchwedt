# EVT Quick Start für Raspberry Pi

## 🚀 Schnellstart (für erfahrene Nutzer)

```bash
# 1. Projekt auf Raspberry Pi kopieren
scp -r evt/ pi@raspberry-ip:/home/pi/

# 2. Auf Raspberry Pi einloggen
ssh pi@raspberry-ip
cd /home/pi/evt

# 3. Environment-Variablen konfigurieren
cp .env.example .env
nano .env
# Trage ein: DATABASE_URL, SESSION_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY

# 4. Dependencies & Build
npm install --production
npm run build

# 5. Datenbank initialisieren
npm run db:push

# 6. Mit PM2 starten
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # Befehl ausführen!

# 7. Nginx konfigurieren
sudo cp nginx.conf /etc/nginx/sites-available/evt
sudo ln -s /etc/nginx/sites-available/evt /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## ✅ Was wurde vorbereitet?

### Konfigurationsdateien

| Datei | Beschreibung |
|-------|--------------|
| `DEPLOYMENT.md` | **Vollständige** Schritt-für-Schritt Anleitung |
| `.env.example` | Beispiel für Umgebungsvariablen |
| `ecosystem.config.cjs` | PM2 Process Manager Konfiguration |
| `nginx.conf` | Nginx Reverse Proxy Config |
| `evt.service` | Systemd Service (Alternative zu PM2) |
| `deploy.sh` | Automatisches Update-Script |

### Wichtige Schritte

#### 1. VAPID Keys generieren
```bash
npm install -g web-push
web-push generate-vapid-keys

# Output:
# Public Key:  BEy... (in .env als VAPID_PUBLIC_KEY)
# Private Key: zD7... (in .env als VAPID_PRIVATE_KEY)
```

#### 2. SESSION_SECRET generieren
```bash
openssl rand -base64 32
# Kopiere Output in .env als SESSION_SECRET
```

#### 3. PostgreSQL-Datenbank erstellen
```bash
sudo -u postgres psql
CREATE DATABASE evt;
CREATE USER evt_user WITH ENCRYPTED PASSWORD 'SICHERES_PASSWORT';
GRANT ALL PRIVILEGES ON DATABASE evt TO evt_user;
\q

# Dann in .env:
# DATABASE_URL=postgresql://evt_user:PASSWORT@localhost:5432/evt
```

## 📦 Deployment-Paket erstellen

### Option A: ZIP-Archiv (für Replit → Raspberry Pi)

1. **Auf Replit:**
   - Lade das gesamte Projekt als ZIP herunter
   - Oder exportiere via Git

2. **Auf deinem Computer:**
   ```bash
   # Projekt zu Raspberry Pi hochladen
   scp evt.zip pi@192.168.1.XXX:/home/pi/
   ```

3. **Auf Raspberry Pi:**
   ```bash
   cd /home/pi
   unzip evt.zip
   cd evt
   # Weiter mit Quick Start oben
   ```

### Option B: Git (empfohlen)

1. **Repository erstellen:**
   - Erstelle ein privates GitHub/GitLab Repository
   - Pushe den Code dorthin

2. **Auf Raspberry Pi:**
   ```bash
   cd /home/pi
   git clone https://github.com/DEIN_USERNAME/evt.git
   cd evt
   # Weiter mit Quick Start oben
   ```

## 🔧 Cloudflare Tunnel

Du hast bereits einen Tunnel zu 50% - so vervollständigst du ihn:

```bash
# Tunnel-ID aus Dashboard kopieren
# Config erstellen:
nano ~/.cloudflared/config.yml
```

```yaml
tunnel: DEINE_TUNNEL_ID
credentials-file: /home/pi/.cloudflared/TUNNEL_ID.json

ingress:
  - hostname: www.evt-ofwschwedt.de
    service: http://localhost:80
  - hostname: evt-ofwschwedt.de
    service: http://localhost:80
  - service: http_status:404
```

```bash
# Tunnel als Service starten
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

## 🎯 Nach dem Deployment

### Erste Schritte in der App

1. **Admin-Account erstellen:**
   - Gehe zu: https://www.evt-ofwschwedt.de/login
   - Klicke auf "Registrieren"
   - Erster registrierter Nutzer wird automatisch Admin

2. **Push-Benachrichtigungen aktivieren:**
   - Browser fragt nach Berechtigung
   - "Zulassen" klicken
   - Funktioniert auf allen mobilen Geräten (nach Home-Screen-Installation)

3. **Fahrzeuge anlegen:**
   - Einstellungen → Fahrzeuge
   - Neue Fahrzeuge hinzufügen (z.B. "LF SPN 03/42-01")
   - Automatische Slot-Konfiguration wird erstellt

4. **Kameraden anlegen:**
   - Kameraden → Neuer Kamerad
   - Qualifikationen zuweisen
   - Erste Woche Verfügbarkeit eintragen

5. **DE-Alarm testen:**
   - API-Endpoint: `POST https://www.evt-ofwschwedt.de/api/alarm/incoming`
   - Webhook-URL an Leitstelle weitergeben

## 🔍 Status überprüfen

```bash
# PM2 Status
pm2 status
pm2 logs evt

# Nginx Status
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log

# PostgreSQL Status
sudo systemctl status postgresql

# Cloudflare Tunnel
sudo systemctl status cloudflared
```

## 🆘 Hilfe

**App startet nicht?**
```bash
pm2 logs evt  # Logs prüfen
```

**Datenbank-Verbindung fehlgeschlagen?**
```bash
# Teste Verbindung:
psql -U evt_user -h localhost -d evt
# Passwort in .env korrekt?
```

**Port 5000 schon belegt?**
```bash
sudo lsof -i :5000
# Prozess beenden: sudo kill -9 <PID>
```

## 📚 Weiterführende Dokumentation

- Vollständige Anleitung: `DEPLOYMENT.md`
- Projekt-Dokumentation: `replit.md`
- Environment-Variablen: `.env.example`

---

**Viel Erfolg bei der Installation! 🚒**
