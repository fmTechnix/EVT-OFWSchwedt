# Database Seed Scripts

This directory contains SQL seed scripts for initializing the EVT database with baseline data.

## Available Seeds

### `aao-brandenburg.sql`
**Purpose:** Seeds the AAO (Alarm- und Ausrückeordnung) table with standard Brandenburg fire service alarm keywords.

**Contains:**
- 8 Brand (Fire) keywords: B:Klein, B:Mittel, B:Groß, B:BMA, B:Gebäude, B:Kfz, B:Wald, B:Müll
- 8 Hilfeleistung (Technical Rescue) keywords: H:VU, H:VU P, H:Klein, H:Mittel, H:Tier, H:Wasser, H:Person, H:Türnotöffnung

**Prerequisites:**
- Ensure your vehicles table contains matching entries with these `funk` (call sign) values:
  - LF 10
  - LF 16
  - DLK 23
  - TLF 16
  - RW 1
  - MTW

If your vehicle names differ, edit the SQL file accordingly before running.

## Running Seeds

### Development Environment (Replit)

**Option 1: Using psql (recommended):**
```bash
psql $DATABASE_URL -f server/seeds/aao-brandenburg.sql
```

**Option 2: Using the execute_sql_tool:**
Use the Replit Agent's execute_sql_tool to run the SQL content directly.

### Production Environment (Raspberry Pi)

```bash
# SSH into your Raspberry Pi
ssh pi@raspberry-pi-ip

# Navigate to project directory
cd /opt/evt

# Run seed script
psql -U evt_user -d evt_db -f server/seeds/aao-brandenburg.sql
```

## Creating New Seeds

1. Create a new `.sql` file in this directory
2. Include clear comments explaining:
   - Purpose of the seed data
   - Prerequisites (tables, data that must exist)
   - Any environment-specific adjustments needed
3. Start with `DELETE FROM table_name;` to ensure idempotency
4. Use explicit column names in INSERT statements
5. Document the file in this README

## Notes

- Seed scripts should be **idempotent** (can be run multiple times safely)
- Always include descriptive comments
- Prefer SQL scripts over programmatic seeds for simplicity and portability
- Keep seed data minimal - only what's essential for initial deployment
