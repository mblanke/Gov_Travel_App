-- Accommodation Rates Table
CREATE TABLE IF NOT EXISTS accommodation_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_key TEXT UNIQUE NOT NULL,
    city_name TEXT NOT NULL,
    province TEXT,
    country TEXT,
    region TEXT NOT NULL,
    currency TEXT NOT NULL,
    jan_rate REAL NOT NULL,
    feb_rate REAL NOT NULL,
    mar_rate REAL NOT NULL,
    apr_rate REAL NOT NULL,
    may_rate REAL NOT NULL,
    jun_rate REAL NOT NULL,
    jul_rate REAL NOT NULL,
    aug_rate REAL NOT NULL,
    sep_rate REAL NOT NULL,
    oct_rate REAL NOT NULL,
    nov_rate REAL NOT NULL,
    dec_rate REAL NOT NULL,
    standard_rate REAL,
    is_international BOOLEAN DEFAULT 0,
    effective_date DATE DEFAULT '2025-01-01',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Meal Rates Table
CREATE TABLE IF NOT EXISTS meal_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_key TEXT UNIQUE NOT NULL,
    city_name TEXT NOT NULL,
    country TEXT,
    region TEXT NOT NULL,
    currency TEXT NOT NULL,
    breakfast_rate REAL NOT NULL,
    lunch_rate REAL NOT NULL,
    dinner_rate REAL NOT NULL,
    incidentals_rate REAL NOT NULL,
    total_daily_rate REAL NOT NULL,
    effective_date DATE DEFAULT '2025-10-01',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Full-Text Search Index for Accommodation
CREATE VIRTUAL TABLE IF NOT EXISTS accommodation_search USING fts5(
    city_key,
    city_name,
    province,
    country,
    region,
    content='accommodation_rates'
);

-- Full-Text Search Index for Meals
CREATE VIRTUAL TABLE IF NOT EXISTS meal_search USING fts5(
    city_key,
    city_name,
    country,
    region,
    content='meal_rates'
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_accommodation_city ON accommodation_rates(city_name);
CREATE INDEX IF NOT EXISTS idx_accommodation_country ON accommodation_rates(country);
CREATE INDEX IF NOT EXISTS idx_accommodation_region ON accommodation_rates(region);
CREATE INDEX IF NOT EXISTS idx_accommodation_key ON accommodation_rates(city_key);
CREATE INDEX IF NOT EXISTS idx_meal_city ON meal_rates(city_name);
CREATE INDEX IF NOT EXISTS idx_meal_country ON meal_rates(country);

-- Trigger to keep search index updated
CREATE TRIGGER IF NOT EXISTS accommodation_ai AFTER INSERT ON accommodation_rates BEGIN
    INSERT INTO accommodation_search(rowid, city_key, city_name, province, country, region)
    VALUES (new.id, new.city_key, new.city_name, new.province, new.country, new.region);
END;

CREATE TRIGGER IF NOT EXISTS accommodation_au AFTER UPDATE ON accommodation_rates BEGIN
    UPDATE accommodation_search SET 
        city_key = new.city_key,
        city_name = new.city_name,
        province = new.province,
        country = new.country,
        region = new.region
    WHERE rowid = new.id;
END;

CREATE TRIGGER IF NOT EXISTS accommodation_ad AFTER DELETE ON accommodation_rates BEGIN
    DELETE FROM accommodation_search WHERE rowid = old.id;
END;-- Accommodation Rates Table
CREATE TABLE IF NOT EXISTS accommodation_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_key TEXT UNIQUE NOT NULL,
    city_name TEXT NOT NULL,
    province TEXT,
    country TEXT,
    region TEXT NOT NULL,
    currency TEXT NOT NULL,
    jan_rate REAL NOT NULL,
    feb_rate REAL NOT NULL,
    mar_rate REAL NOT NULL,
    apr_rate REAL NOT NULL,
    may_rate REAL NOT NULL,
    jun_rate REAL NOT NULL,
    jul_rate REAL NOT NULL,
    aug_rate REAL NOT NULL,
    sep_rate REAL NOT NULL,
    oct_rate REAL NOT NULL,
    nov_rate REAL NOT NULL,
    dec_rate REAL NOT NULL,
    standard_rate REAL,
    is_international BOOLEAN DEFAULT 0,
    effective_date DATE DEFAULT '2025-01-01',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Meal Rates Table
CREATE TABLE IF NOT EXISTS meal_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_key TEXT UNIQUE NOT NULL,
    city_name TEXT NOT NULL,
    country TEXT,
    region TEXT NOT NULL,
    currency TEXT NOT NULL,
    breakfast_rate REAL NOT NULL,
    lunch_rate REAL NOT NULL,
    dinner_rate REAL NOT NULL,
    incidentals_rate REAL NOT NULL,
    total_daily_rate REAL NOT NULL,
    effective_date DATE DEFAULT '2025-10-01',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Full-Text Search Index for Accommodation
CREATE VIRTUAL TABLE IF NOT EXISTS accommodation_search USING fts5(
    city_key,
    city_name,
    province,
    country,
    region,
    content='accommodation_rates'
);

-- Full-Text Search Index for Meals
CREATE VIRTUAL TABLE IF NOT EXISTS meal_search USING fts5(
    city_key,
    city_name,
    country,
    region,
    content='meal_rates'
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_accommodation_city ON accommodation_rates(city_name);
CREATE INDEX IF NOT EXISTS idx_accommodation_country ON accommodation_rates(country);
CREATE INDEX IF NOT EXISTS idx_accommodation_region ON accommodation_rates(region);
CREATE INDEX IF NOT EXISTS idx_accommodation_key ON accommodation_rates(city_key);
CREATE INDEX IF NOT EXISTS idx_meal_city ON meal_rates(city_name);
CREATE INDEX IF NOT EXISTS idx_meal_country ON meal_rates(country);

-- Trigger to keep search index updated
CREATE TRIGGER IF NOT EXISTS accommodation_ai AFTER INSERT ON accommodation_rates BEGIN
    INSERT INTO accommodation_search(rowid, city_key, city_name, province, country, region)
    VALUES (new.id, new.city_key, new.city_name, new.province, new.country, new.region);
END;

CREATE TRIGGER IF NOT EXISTS accommodation_au AFTER UPDATE ON accommodation_rates BEGIN
    UPDATE accommodation_search SET 
        city_key = new.city_key,
        city_name = new.city_name,
        province = new.province,
        country = new.country,
        region = new.region
    WHERE rowid = new.id;
END;

CREATE TRIGGER IF NOT EXISTS accommodation_ad AFTER DELETE ON accommodation_rates BEGIN
    DELETE FROM accommodation_search WHERE rowid = old.id;
END;