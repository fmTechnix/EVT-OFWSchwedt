# Git-Repository zu GitHub pushen - Anleitung

## ✅ Was wurde vorbereitet:

1. **.gitignore** aktualisiert (filtert node_modules, dist, .env, etc.)
2. **README.md** erstellt (professionelle Projekt-Übersicht)
3. **push-to-github.sh** erstellt (automatisches Push-Skript)

## 🚀 So pushst du zu GitHub:

### Option 1: Automatisches Skript (empfohlen)

```bash
# Führe das Skript aus:
./push-to-github.sh
```

Das Skript macht automatisch:
- ✅ Git konfigurieren
- ✅ Alle Dateien hinzufügen
- ✅ Commit erstellen mit ausführlicher Beschreibung
- ✅ Zu GitHub pushen
- ✅ Release-Tags erstellen (v1.0.0, v1.0.1)
- ✅ Tags zu GitHub pushen

### Option 2: Manuelle Schritte

```bash
# 1. Git konfigurieren
git config user.email "deploy@evt-ofwschwedt.de"
git config user.name "EVT Deployment"

# 2. Remote hinzufügen
git remote add origin https://${GITHUB_TOKEN}@github.com/fmTechnix/EVT.git

# 3. Dateien hinzufügen und committen
git add .
git commit -m "EVT v1.0.1 - Production-Ready"

# 4. Branch zu main umbenennen
git branch -M main

# 5. Zu GitHub pushen
git push -u origin main --force

# 6. Tags erstellen
git tag -a v1.0.0 -m "Initial Release"
git tag -a v1.0.1 -m "WebSocket-Fix"
git push origin --tags --force
```

## 📋 Nach dem Push:

1. **Repository ansehen:**
   https://github.com/fmTechnix/EVT

2. **Releases erstellen** (optional):
   - Gehe zu: https://github.com/fmTechnix/EVT/releases
   - Klicke "Draft a new release"
   - Wähle Tag v1.0.1
   - Füge ZIP-Download hinzu (optional)

## 🎯 Vorteile des Git-Repos:

### Vorher (nur ZIP):
- ❌ Keine Versionskontrolle
- ❌ Keine Git-Historie
- ❌ Keine Issues/Pull Requests
- ❌ Schwierig zu warten

### Nachher (richtiges Repo):
- ✅ **Vollständige Git-Historie**
- ✅ **Einfache Updates** mit `git pull`
- ✅ **Issue-Tracking** auf GitHub
- ✅ **Code-Übersicht** direkt im Browser
- ✅ **Collaboration** möglich
- ✅ **Professionelles Erscheinungsbild**
- ✅ **README.md** mit Badges und Anleitung

## 🔄 Zukünftige Updates:

Wenn du das Projekt aktualisierst:

```bash
# 1. Änderungen committen
git add .
git commit -m "Beschreibung der Änderungen"

# 2. Zu GitHub pushen
git push origin main

# 3. Neuen Tag erstellen (optional)
git tag -a v1.0.2 -m "Bugfixes"
git push origin v1.0.2
```

## 🐛 Troubleshooting:

### "Permission denied"
```bash
# Stelle sicher, dass GITHUB_TOKEN gesetzt ist:
echo $GITHUB_TOKEN
```

### "Remote already exists"
```bash
# Remote aktualisieren:
git remote set-url origin https://${GITHUB_TOKEN}@github.com/fmTechnix/EVT.git
```

### "Push rejected"
```bash
# Force-Push (Vorsicht bei Zusammenarbeit!):
git push origin main --force
```

## 📝 Was passiert:

Das Skript pusht:
- ✅ Alle Quellcode-Dateien
- ✅ Dokumentation (DEPLOYMENT.md, QUICK_FIX.md, etc.)
- ✅ Konfigurationsdateien (ecosystem.config.cjs, nginx.conf, etc.)
- ✅ README.md mit Projekt-Übersicht

**NICHT** gepusht (in .gitignore):
- ❌ node_modules
- ❌ dist
- ❌ .env (Sicherheit!)
- ❌ logs
- ❌ *.zip

## 🎉 Fertig!

Nach erfolgreichem Push hast du:
- 📂 Professionelles GitHub-Repository
- 📚 Vollständige Dokumentation
- 🏷️ Release-Tags
- 📖 README mit Anleitung
- 🔄 Einfache Update-Möglichkeit
