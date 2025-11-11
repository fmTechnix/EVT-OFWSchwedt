#!/bin/bash

# EVT Production Start Script for Raspberry Pi
# Dieses Script startet die fertig gebaute Production-Version

# Umgebungsvariablen setzen
export NODE_ENV=production

# Datenbank
export DATABASE_URL="${DATABASE_URL}"
export PGHOST="${PGHOST}"
export PGPORT="${PGPORT}"
export PGDATABASE="${PGDATABASE}"
export PGUSER="${PGUSER}"
export PGPASSWORD="${PGPASSWORD}"

# Session Secret
export SESSION_SECRET="${SESSION_SECRET}"

# VAPID Keys für Push-Benachrichtigungen
export VAPID_PUBLIC_KEY="${VAPID_PUBLIC_KEY}"
export VAPID_PRIVATE_KEY="${VAPID_PRIVATE_KEY}"
export VAPID_SUBJECT="${VAPID_SUBJECT}"

# Production Server starten (Port 5000)
exec node dist/index.js
