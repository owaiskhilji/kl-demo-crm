-- 006_split_category_type.sql
-- FIX MIGRATION: Split the single merged type/property_type column into two
-- separate columns: category (residential/commercial) and property_type (home/plot/apartment).
-- Run this AFTER the existing migrations if the old schema is already in production.

-- ============================================================
-- PROPERTIES TABLE
-- ============================================================

-- 1. Add new columns
ALTER TABLE properties ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_type TEXT;

-- 2. Migrate data from old 'type' column to new columns
--    'residential' and 'commercial' map to category, 'plot' and 'apartment' map to property_type
UPDATE properties SET category = 'residential' WHERE type = 'residential';
UPDATE properties SET category = 'commercial'  WHERE type = 'commercial';
UPDATE properties SET property_type = 'plot'      WHERE type = 'plot';
UPDATE properties SET property_type = 'apartment' WHERE type = 'apartment';

-- 3. Drop old column and add constraints
ALTER TABLE properties DROP COLUMN IF EXISTS type;
ALTER TABLE properties ADD CONSTRAINT properties_category_check 
  CHECK (category IS NULL OR category IN ('residential', 'commercial'));
ALTER TABLE properties ADD CONSTRAINT properties_property_type_check 
  CHECK (property_type IS NULL OR property_type IN ('home', 'plot', 'apartment'));


-- ============================================================
-- LEADS TABLE
-- ============================================================

-- 1. Add new category column (property_type already exists but has wrong check)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. Migrate data: 'residential'/'commercial' values move to category
UPDATE leads SET category = property_type WHERE property_type IN ('residential', 'commercial');
-- Keep 'plot' and 'apartment' in property_type, clear the ones we moved
UPDATE leads SET property_type = NULL WHERE property_type IN ('residential', 'commercial');

-- 3. Drop old constraint and add new ones
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_property_type_check;
ALTER TABLE leads ADD CONSTRAINT leads_category_check 
  CHECK (category IS NULL OR category IN ('residential', 'commercial'));
ALTER TABLE leads ADD CONSTRAINT leads_property_type_check 
  CHECK (property_type IS NULL OR property_type IN ('home', 'plot', 'apartment'));
