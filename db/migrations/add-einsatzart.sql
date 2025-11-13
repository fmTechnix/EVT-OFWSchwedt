-- Add einsatzart enum and column to einsatz table
-- Migration: Add einsatzart support for mission-type-aware crew assignment

-- Create enum type if not exists
DO $$ BEGIN
    CREATE TYPE einsatzart AS ENUM (
        'brandeinsatz',
        'technische_hilfeleistung',
        'gefahrgut',
        'standard'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add column if not exists
DO $$ BEGIN
    ALTER TABLE einsatz 
    ADD COLUMN einsatzart einsatzart DEFAULT 'standard' NOT NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
