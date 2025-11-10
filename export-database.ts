/**
 * Datenbank-Export Script für Raspberry Pi Installation
 * 
 * Exportiert alle Daten aus der aktuellen PostgreSQL Datenbank
 */

import { pool } from "./server/db";
import fs from "fs";

async function exportDatabase() {
  console.log("🔄 Starte Datenbank-Export...\n");

  const exportFile = "database-export.sql";
  let sqlContent = "-- EVT Datenbank Export\n";
  sqlContent += `-- Exportiert am: ${new Date().toISOString()}\n\n`;
  sqlContent += "BEGIN;\n\n";

  try {
    // Liste aller Tabellen in der richtigen Reihenfolge (wegen Foreign Keys)
    const tables = [
      "qualifikationen",
      "users",
      "vehicles",
      "vehicle_configs",
      "einsatz",
      "settings",
      "termine",
      "termin_zusagen",
      "push_subscriptions",
      "availabilities",
      "availability_templates",
      "user_reminder_settings",
      "current_assignments",
      "assignment_history",
      "assignment_fairness",
      "alarm_events",
      "aao_stichworte",
      "maengel_meldungen"
    ];

    let totalRows = 0;

    for (const table of tables) {
      console.log(`📊 Exportiere Tabelle: ${table}`);
      
      // Prüfe ob Tabelle existiert
      const tableExists = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table]
      );

      if (!tableExists.rows[0].exists) {
        console.log(`   ⚠️  Tabelle ${table} existiert nicht, überspringe...`);
        continue;
      }

      // Hole Spalten-Datentypen
      const columnTypes = await pool.query(
        `SELECT column_name, udt_name 
         FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = $1`,
        [table]
      );
      const typeMap = new Map(columnTypes.rows.map(r => [r.column_name, r.udt_name]));

      // Hole alle Daten
      const result = await pool.query(`SELECT * FROM ${table}`);
      
      if (result.rows.length === 0) {
        console.log(`   ℹ️  Keine Daten in ${table}`);
        continue;
      }

      console.log(`   ✅ ${result.rows.length} Zeilen gefunden`);
      totalRows += result.rows.length;

      // Erstelle INSERT Statements
      sqlContent += `-- Tabelle: ${table} (${result.rows.length} Zeilen)\n`;
      sqlContent += `TRUNCATE TABLE ${table} CASCADE;\n`;

      for (const row of result.rows) {
        const columns = Object.keys(row);
        const values = columns.map(col => {
          const val = row[col];
          const colType = typeMap.get(col);
          
          if (val === null) return "NULL";
          if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
          if (typeof val === "number") return val;
          if (val instanceof Date) {
            return `'${val.toISOString()}'::timestamp`;
          }
          
          // Handle JSONB columns specifically
          if (colType === 'jsonb') {
            return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
          }
          
          // Handle text arrays
          if (Array.isArray(val)) {
            if (val.length === 0) return "'{}'";
            return `ARRAY[${val.map(v => `'${String(v).replace(/'/g, "''")}'`).join(",")}]::text[]`;
          }
          
          // Handle other objects as JSONB
          if (typeof val === "object") {
            return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
          }
          
          // String escaping
          return `'${String(val).replace(/'/g, "''")}'`;
        });

        sqlContent += `INSERT INTO ${table} (${columns.map(c => `"${c}"`).join(", ")}) VALUES (${values.join(", ")});\n`;
      }

      sqlContent += "\n";
    }

    // Reset sequences for tables with SERIAL/IDENTITY columns
    // Dynamically query which sequences actually exist to avoid errors
    sqlContent += "-- Reset sequences to prevent ID collisions\n";
    const sequencesResult = await pool.query(
      `SELECT sequence_name FROM information_schema.sequences 
       WHERE sequence_schema = 'public' 
       ORDER BY sequence_name`
    );
    
    const sequences = sequencesResult.rows.map(r => r.sequence_name);
    console.log(`\n🔢 Found ${sequences.length} sequences to reset`);
    
    for (const sequence of sequences) {
      // Extract table name from sequence name (e.g., "vehicles_id_seq" -> "vehicles")
      const tableName = sequence.replace(/_id_seq$/, '');
      sqlContent += `SELECT setval('${sequence}', (SELECT COALESCE(MAX(id), 1) FROM ${tableName}), true);\n`;
    }
    sqlContent += "\n";

    sqlContent += "COMMIT;\n\n";
    sqlContent += `-- Export abgeschlossen: ${totalRows} Zeilen insgesamt\n`;

    // Schreibe SQL Datei
    fs.writeFileSync(exportFile, sqlContent, "utf8");

    const fileSize = fs.statSync(exportFile).size;

    console.log(`\n✅ Export erfolgreich!`);
    console.log(`📁 Datei: ${exportFile}`);
    console.log(`📊 Größe: ${(fileSize / 1024).toFixed(2)} KB`);
    console.log(`📋 Zeilen: ${totalRows}`);
    console.log(`\n📦 Nächste Schritte:`);
    console.log(`1. Lade ${exportFile} auf deinen Raspberry Pi hoch (z.B. via SCP):`);
    console.log(`   scp ${exportFile} pi@raspberrypi.local:/home/pi/EVT/`);
    console.log(`2. Auf dem Raspberry Pi importieren:`);
    console.log(`   psql $DATABASE_URL < ${exportFile}`);

  } catch (error) {
    console.error("❌ Fehler beim Export:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Export starten
exportDatabase()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
