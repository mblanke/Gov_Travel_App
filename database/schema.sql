-- =============================================================================
-- Government Travel App - Normalized Database Schema
-- Based on NJC Travel Directive (https://www.njc-cnm.gc.ca/directive/d10/v325/en)
-- =============================================================================
-- 
-- This schema cleanly separates:
-- 1. ACCOMMODATION LIMITS - What hotels cost (city-specific caps)
-- 2. MEAL RATES - Per diem food allowances (region-based)
-- 3. INCIDENTALS - Fixed amounts by region/accommodation type
-- 4. PRIVATE ACCOMMODATION - Flat allowance for staying with family/friends
-- 5. KILOMETRIC RATES - Vehicle reimbursement by province/territory
-- 6. WEEKEND TRAVEL - Allowances for extended assignments
--
-- =============================================================================

-- Drop existing tables to start fresh
DROP TABLE IF EXISTS weekend_travel_allowances;
DROP TABLE IF EXISTS kilometric_rates;
DROP TABLE IF EXISTS private_accommodation_rates;
DROP TABLE IF EXISTS incidental_rates;
DROP TABLE IF EXISTS meal_rates;
DROP TABLE IF EXISTS accommodation_limits;
DROP TABLE IF EXISTS regions;
DROP TABLE IF EXISTS metadata;
DROP TABLE IF EXISTS accommodation_search;
DROP TABLE IF EXISTS city_search;
DROP TABLE IF EXISTS meal_search;
DROP TABLE IF EXISTS accommodation_rates;
DROP TABLE IF EXISTS travel_rates;
DROP VIEW IF EXISTS v_city_rates;
DROP VIEW IF EXISTS v_city_travel_rates;

-- =============================================================================
-- REGIONS: Geographic areas with their defaults
-- =============================================================================
CREATE TABLE regions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,            -- 'canada', 'yukon', 'nwt', 'nunavut', 'usa', 'alaska', 'international'
    name TEXT NOT NULL,
    parent_code TEXT,                      -- For sub-regions (e.g., 'yukon' -> 'canada')
    default_currency TEXT NOT NULL,        -- Default currency for this region
    taxes_included BOOLEAN DEFAULT 0,      -- 0 = taxes excluded (Canada/USA), 1 = included (International)
    notes TEXT
);

-- =============================================================================
-- ACCOMMODATION_LIMITS: What hotels cost (city-specific caps)
-- =============================================================================
-- This is the MAXIMUM REIMBURSABLE hotel rate per night
-- Source: ACRD Directory (https://rehelv-acrd.tpsgc-pwgsc.gc.ca/lth-crl-eng.aspx)
--         Appendix D for International
-- =============================================================================
CREATE TABLE accommodation_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_key TEXT UNIQUE NOT NULL,         -- Lowercase normalized key (e.g., 'ottawa', 'riga')
    city_name TEXT NOT NULL,               -- Display name (e.g., 'Ottawa, ON')
    city_name_lower TEXT NOT NULL,         -- Precomputed LOWER(city_name) so prefix LIKE uses the index
    province_state TEXT,                   -- Province/State/Region
    country TEXT NOT NULL,
    region_code TEXT NOT NULL,             -- FK to regions.code
    currency TEXT NOT NULL,                -- CAD for Canada, USD for USA/International
    
    -- Monthly rates (for seasonal variation)
    jan_rate REAL,
    feb_rate REAL,
    mar_rate REAL,
    apr_rate REAL,
    may_rate REAL,
    jun_rate REAL,
    jul_rate REAL,
    aug_rate REAL,
    sep_rate REAL,
    oct_rate REAL,
    nov_rate REAL,
    dec_rate REAL,
    
    -- Fallback rate if no monthly variation
    default_rate REAL NOT NULL,
    
    -- Metadata
    is_capital BOOLEAN DEFAULT 0,          -- National/provincial capital
    metro_area TEXT,                       -- Parent metro area (e.g., 'toronto' for Mississauga)
    effective_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (region_code) REFERENCES regions(code)
);

-- =============================================================================
-- MEAL_RATES: Per diem food allowances
-- =============================================================================
-- Source: Appendix C (Canada/USA), Appendix D (International)
-- 
-- Key insight: Meals are based on REGION (not city) for Canada/USA
-- International cities have city-specific meal rates
-- =============================================================================
CREATE TABLE meal_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    region_code TEXT NOT NULL,             -- FK to regions.code
    city_key TEXT,                         -- NULL = region default; set for city-specific international rates
    accommodation_type TEXT NOT NULL,      -- 'commercial' or 'private'
    duration_tier TEXT NOT NULL,           -- 'day_1_30', 'day_31_120', 'day_121_plus'
    
    breakfast REAL NOT NULL,
    lunch REAL NOT NULL,
    dinner REAL NOT NULL,
    total REAL NOT NULL,                   -- Pre-calculated sum
    
    currency TEXT NOT NULL,
    effective_date DATE,
    
    FOREIGN KEY (region_code) REFERENCES regions(code),
    UNIQUE(region_code, city_key, accommodation_type, duration_tier)
);

-- =============================================================================
-- INCIDENTAL_RATES: Fixed amounts for sundry expenses
-- =============================================================================
-- Canada/USA: Flat rate ($17.30 CAD at 100%)
-- International: Percentage of meals OR fixed amount per city
-- =============================================================================
CREATE TABLE incidental_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    region_code TEXT NOT NULL,             -- FK to regions.code
    city_key TEXT,                         -- NULL = region default
    accommodation_type TEXT NOT NULL,      -- 'commercial' or 'private'
    duration_tier TEXT NOT NULL,           -- 'day_1_30', 'day_31_120', 'day_121_plus'
    
    rate REAL NOT NULL,
    rate_type TEXT DEFAULT 'fixed',        -- 'fixed' or 'percentage'
    currency TEXT NOT NULL,
    
    FOREIGN KEY (region_code) REFERENCES regions(code),
    UNIQUE(region_code, city_key, accommodation_type, duration_tier)
);

-- =============================================================================
-- PRIVATE_ACCOMMODATION_RATES: Allowance for staying with family/friends
-- =============================================================================
-- Flat rate: $50 CAD (days 1-120), $25 CAD (day 121+)
-- =============================================================================
CREATE TABLE private_accommodation_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    region_code TEXT NOT NULL,             -- FK to regions.code
    duration_tier TEXT NOT NULL,           -- 'day_1_120', 'day_121_plus'
    
    rate REAL NOT NULL,
    currency TEXT NOT NULL,
    
    FOREIGN KEY (region_code) REFERENCES regions(code),
    UNIQUE(region_code, duration_tier)
);

-- =============================================================================
-- KILOMETRIC_RATES: Per-km vehicle reimbursement
-- =============================================================================
-- Source: Appendix B
-- Rates vary by province/territory
-- =============================================================================
CREATE TABLE kilometric_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    province_territory TEXT UNIQUE NOT NULL,
    province_code TEXT,                    -- 2-letter code (AB, BC, etc.)
    
    rate_per_km REAL NOT NULL,             -- In dollars (e.g., 0.68)
    currency TEXT DEFAULT 'CAD',
    effective_date DATE NOT NULL,
    
    notes TEXT
);

-- =============================================================================
-- WEEKEND_TRAVEL_ALLOWANCES: For extended assignments
-- =============================================================================
-- When on assignment >2 weeks, employees can claim weekend travel home
-- =============================================================================
CREATE TABLE weekend_travel_allowances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    region_code TEXT NOT NULL,             -- FK to regions.code
    weekend_length INTEGER NOT NULL,       -- 2, 3, or 4 days
    
    allowance REAL NOT NULL,
    currency TEXT NOT NULL,
    
    FOREIGN KEY (region_code) REFERENCES regions(code),
    UNIQUE(region_code, weekend_length)
);

-- =============================================================================
-- METADATA: Track data freshness and sources
-- =============================================================================
CREATE TABLE metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- FULL-TEXT SEARCH INDEX
-- =============================================================================
CREATE VIRTUAL TABLE IF NOT EXISTS accommodation_search USING fts5(
    city_key,
    city_name,
    province_state,
    country,
    region_code,
    content='accommodation_limits',
    content_rowid='id'
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER accommodation_ai AFTER INSERT ON accommodation_limits BEGIN
    INSERT INTO accommodation_search(rowid, city_key, city_name, province_state, country, region_code)
    VALUES (new.id, new.city_key, new.city_name, new.province_state, new.country, new.region_code);
END;

CREATE TRIGGER accommodation_ad AFTER DELETE ON accommodation_limits BEGIN
    INSERT INTO accommodation_search(accommodation_search, rowid, city_key, city_name, province_state, country, region_code)
    VALUES ('delete', old.id, old.city_key, old.city_name, old.province_state, old.country, old.region_code);
END;

CREATE TRIGGER accommodation_au AFTER UPDATE ON accommodation_limits BEGIN
    INSERT INTO accommodation_search(accommodation_search, rowid, city_key, city_name, province_state, country, region_code)
    VALUES ('delete', old.id, old.city_key, old.city_name, old.province_state, old.country, old.region_code);
    INSERT INTO accommodation_search(rowid, city_key, city_name, province_state, country, region_code)
    VALUES (new.id, new.city_key, new.city_name, new.province_state, new.country, new.region_code);
END;

-- =============================================================================
-- INDEXES for fast lookups
-- =============================================================================
CREATE INDEX idx_accommodation_country ON accommodation_limits(country);
CREATE INDEX idx_accommodation_name_lower ON accommodation_limits(city_name_lower);
CREATE INDEX idx_accommodation_region ON accommodation_limits(region_code);
CREATE INDEX idx_accommodation_province ON accommodation_limits(province_state);
CREATE INDEX idx_meal_region ON meal_rates(region_code);
CREATE INDEX idx_meal_city ON meal_rates(city_key);
CREATE INDEX idx_incidental_region ON incidental_rates(region_code);

-- =============================================================================
-- VIEWS for common queries
-- =============================================================================

-- View: Get full travel rates for a city (joins accommodation + regional meals)
CREATE VIEW v_city_travel_rates AS
SELECT 
    a.city_key,
    a.city_name,
    a.province_state,
    a.country,
    a.region_code,
    r.name AS region_name,
    
    -- Accommodation
    a.currency AS accommodation_currency,
    a.default_rate AS accommodation_rate,
    a.jan_rate, a.feb_rate, a.mar_rate, a.apr_rate,
    a.may_rate, a.jun_rate, a.jul_rate, a.aug_rate,
    a.sep_rate, a.oct_rate, a.nov_rate, a.dec_rate,
    
    -- Meals (100% commercial rate)
    m.breakfast,
    m.lunch,
    m.dinner,
    m.total AS meals_total,
    m.currency AS meals_currency,
    
    -- Incidentals (100% commercial rate)
    i.rate AS incidentals,
    i.currency AS incidentals_currency
    
FROM accommodation_limits a
JOIN regions r ON a.region_code = r.code
LEFT JOIN meal_rates m ON (
    (m.region_code = a.region_code AND m.city_key IS NULL)
    OR m.city_key = a.city_key
) AND m.accommodation_type = 'commercial' AND m.duration_tier = 'day_1_30'
LEFT JOIN incidental_rates i ON (
    (i.region_code = a.region_code AND i.city_key IS NULL)
    OR i.city_key = a.city_key
) AND i.accommodation_type = 'commercial' AND i.duration_tier = 'day_1_30';
