# 📦 EVT Deployment-Paket für Raspberry Pi

## 🎯 Übersicht

Dieses Paket enthält alle notwendigen Dateien und Anleitungen, um EVT (Einsatzverwaltungstool) auf einem Raspberry Pi zu installieren und über Cloudflare Tunnel unter **www.evt-ofwschwedt.de** bereitzustellen.

## 📁 Enthaltene Deployment-Dateien

| Datei | Zweck | Priorität |
|-------|-------|-----------|
| **QUICK_START.md** | 🚀 Schnelleinstieg (5 Minuten) | ⭐⭐⭐⭐⭐ |
| **DEPLOYMENT.md** | Vollständige Schritt-für-Schritt Anleitung | ⭐⭐⭐⭐⭐ |
| **.env.example** | Vorlage für Environment-Variablen | ⭐⭐⭐⭐⭐ |
| **ecosystem.config.cjs** | PM2 Process Manager Konfiguration | ⭐⭐⭐⭐ |
| **nginx.conf** | Nginx Reverse Proxy Konfiguration | ⭐⭐⭐⭐ |
| **evt.service** | Systemd Service (Alternative zu PM2) | ⭐⭐⭐ |
| **deploy.sh** | Automatisches Update-Script | ⭐⭐⭐ |

## 🚀 Schnellstart in 3 Schritten

### 1️⃣ Projekt auf Raspberry Pi kopieren

**Variante A: Direkter Upload vom Computer**
```bash
# ZIP erstellen (auf deinem Rechner)
zip -r evt.zip . -x "node_modules/*" -x "dist/*" -x ".git/*"

# Zu Raspberry Pi hochladen
scp evt.zip pi@192.168.1.XXX:/home/pi/

# Auf Raspberry Pi:
ssh pi@192.168.1.XXX
cd /home/pi
unzip evt.zip -d evt
cd evt
```

**Variante B: Via Git (empfohlen)**
```bash
# Auf Raspberry Pi:
ssh pi@192.168.1.XXX
cd /home/pi
git clone <DEIN_REPOSITORY_URL> evt
cd evt
```

### 2️⃣ Environment-Variablen einrichten

```bash
# .env Datei erstellen
cp .env.example .env
nano .env
```

**Mindestens diese Werte ändern:**
```env
# PostgreSQL
DATABASE_URL=postgresql://evt_user:DEIN_PASSWORT@localhost:5432/evt
PGPASSWORD=DEIN_PASSWORT

# Session (generieren mit: openssl rand -base64 32)
SESSION_SECRET=GENERIERTES_SECRET_MINDESTENS_32_ZEICHEN

# VAPID Keys (generieren mit: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=DEIN_PUBLIC_KEY
VAPID_PRIVATE_KEY=DEIN_PRIVATE_KEY
VAPID_SUBJECT=mailto:admin@evt-ofwschwedt.de
```

### 3️⃣ Installation & Start

```bash
# Automatisches Deployment-Script ausführen
chmod +x deploy.sh
./deploy.sh
```

**Das wars!** 🎉 Die App läuft jetzt auf Port 5000.

## 🔧 Cloudflare Tunnel einrichten

Du hast den Tunnel bereits zu 50% eingerichtet. Vervollständige ihn:

```bash
# Config erstellen
nano ~/.cloudflared/config.yml
```

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

```bash
# Tunnel als Service starten
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

## ✅ Checkliste

- [ ] Node.js 18+ installiert (`node --version`)
- [ ] PostgreSQL installiert und Datenbank `evt` erstellt
- [ ] PM2 installiert (`npm install -g pm2`)
- [ ] Nginx installiert und läuft
- [ ] `.env` Datei konfiguriert mit allen Secrets
- [ ] `npm run build` erfolgreich
- [ ] `npm run db:push` erfolgreich
- [ ] PM2 läuft (`pm2 status`)
- [ ] Nginx konfiguriert (`sudo nginx -t`)
- [ ] Cloudflare Tunnel aktiv
- [ ] App erreichbar unter www.evt-ofwschwedt.de

## 📊 Technische Details

### Systemarchitektur
```
Internet
    ↓
Cloudflare Tunnel (HTTPS)
    ↓
Nginx (Reverse Proxy :80)
    ↓
Node.js/Express (App :5000)
    ↓
PostgreSQL (:5432)
```

### Ressourcen-Anforderungen

| Komponente | RAM | CPU |
|------------|-----|-----|
| Node.js App | ~200MB | 10-20% |
| PostgreSQL | ~100MB | 5-10% |
| Nginx | ~10MB | <5% |
| **Gesamt** | **~350MB** | **~30%** |

**Empfehlung:** Raspberry Pi 4 mit 2GB RAM

### Port-Übersicht

| Port | Dienst | Intern/Extern |
|------|--------|---------------|
| 5000 | Node.js App | Intern |
| 80 | Nginx | Intern (via Tunnel) |
| 5432 | PostgreSQL | Intern |

## 🔍 Monitoring & Wartung

### Status prüfen
```bash
# Alle Dienste auf einen Blick
pm2 status                           # App Status
sudo systemctl status nginx          # Nginx
sudo systemctl status postgresql     # Datenbank
sudo systemctl status cloudflared    # Tunnel
```

### Logs anzeigen
```bash
pm2 logs evt                         # App Logs
sudo tail -f /var/log/nginx/error.log  # Nginx Errors
sudo journalctl -u cloudflared -f    # Tunnel Logs
```

### Updates einspielen
```bash
cd /home/pi/evt
./deploy.sh  # Automatisches Update-Script
```

### Backups erstellen
```bash
# Datenbank-Backup
PGPASSWORD=DEIN_PASSWORT pg_dump -U evt_user -h localhost evt > backup_$(date +%Y%m%d).sql

# Automatisches Backup (Cron)
# crontab -e
# 0 3 * * * PGPASSWORD=xxx pg_dump -U evt_user evt > /home/pi/backups/evt_$(date +\%Y\%m\%d).sql
```

## 🆘 Troubleshooting

### Problem: App startet nicht
```bash
# Logs prüfen
pm2 logs evt --lines 50

# Manuell starten (Debug-Modus)
cd /home/pi/evt
NODE_ENV=production node dist/index.js
```

### Problem: Datenbank-Verbindung fehlgeschlagen
```bash
# PostgreSQL läuft?
sudo systemctl status postgresql

# Verbindung testen
psql -U evt_user -h localhost -d evt

# Passwort in .env korrekt?
cat .env | grep DATABASE_URL
```

### Problem: Nginx-Fehler
```bash
# Konfiguration testen
sudo nginx -t

# Error-Log prüfen
sudo tail -50 /var/log/nginx/error.log
```

### Problem: Port 5000 bereits belegt
```bash
# Prozess finden
sudo lsof -i :5000

# Prozess beenden
sudo kill -9 <PID>

# PM2 neu starten
pm2 restart evt
```

## 📚 Dokumentation

Für detaillierte Informationen siehe:

- **QUICK_START.md** - Schnelleinstieg für erfahrene Nutzer
- **DEPLOYMENT.md** - Vollständige Installations-Anleitung
- **replit.md** - Projekt-Architektur und Features
- **.env.example** - Alle Environment-Variablen erklärt

## 🔐 Sicherheitshinweise

### Vor Produktion UNBEDINGT beachten:

1. ✅ **Starke Passwörter verwenden**
   - PostgreSQL: Mindestens 16 Zeichen
   - SESSION_SECRET: Mindestens 32 Zeichen

2. ✅ **VAPID Keys generieren**
   - NIEMALS die Dev-Keys aus Replit verwenden!
   - Immer frisch generieren mit `web-push generate-vapid-keys`

3. ✅ **Firewall konfigurieren**
   ```bash
   sudo ufw allow ssh
   sudo ufw enable
   ```

4. ✅ **Regelmäßige Backups**
   - Täglich automatische Datenbank-Backups
   - Backup-Speicherort: Externe Festplatte/NAS

5. ✅ **Updates einspielen**
   - System: `sudo apt update && sudo apt upgrade`
   - Node.js: Regelmäßig LTS-Version prüfen
   - Dependencies: `npm audit fix`

6. ⚠️ **DE-Alarm Webhook absichern** (später)
   - Shared Secret einrichten
   - Nur Leitstellen-IP zulassen

## 📞 Support

Bei Problemen:

1. **Logs prüfen:** `pm2 logs evt`
2. **Status prüfen:** `pm2 status` und `sudo systemctl status nginx`
3. **Dokumentation:** Siehe DEPLOYMENT.md für Details
4. **Neustart:** `pm2 restart evt`

## 🎯 Nach erfolgreicher Installation

1. **App aufrufen:** https://www.evt-ofwschwedt.de
2. **Admin-Account erstellen:** Erste Registrierung wird automatisch Admin
3. **Fahrzeuge anlegen:** z.B. "LF SPN 03/42-01" (automatische Config)
4. **Kameraden anlegen:** Mit Qualifikationen
5. **Verfügbarkeit eintragen:** Erste Woche planen
6. **Push-Benachrichtigungen aktivieren:** Browser-Permission erlauben
7. **DE-Alarm testen:** Webhook-URL an Leitstelle weitergeben

---

**Viel Erfolg beim Deployment! 🚒🔥**

Bei Fragen zur Installation oder Konfiguration, siehe DEPLOYMENT.md für die vollständige Anleitung.
