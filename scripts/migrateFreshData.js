/**
 * Migration script to properly convert freshly scraped data to Node.js app format
 * Source: data/travel_rates_scraped.sqlite3 (Python scraper with raw_json)
 * Target: database/travel_rates.db (Node.js app schema)
 */

const Database = require("better-sqlite3");
const path = require("path");

const SOURCE_DB = path.join(
  __dirname,
  "..",
  "data",
  "travel_rates_scraped.sqlite3"
);
const TARGET_DB = path.join(__dirname, "..", "database", "travel_rates.db");

console.log("🚀 Starting fresh data migration...\n");

// Open databases
const sourceDb = new Database(SOURCE_DB, { readonly: true });
const targetDb = new Database(TARGET_DB);

// Initialize target schema (drop and recreate to ensure clean state)
targetDb.exec(`
DROP TABLE IF EXISTS travel_rates;

CREATE TABLE travel_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_key TEXT UNIQUE NOT NULL,
    city_name TEXT NOT NULL,
    province TEXT,
    country TEXT,
    region TEXT,
  currency TEXT NOT NULL DEFAULT 'USD', -- accommodation currency (foreign = USD)
  meal_currency TEXT, -- per-diem currency
  meal_plan_type TEXT, -- e.g., C-Day 1-30
  meal_total REAL,
    jan_accommodation REAL,
    feb_accommodation REAL,
    mar_accommodation REAL,
    apr_accommodation REAL,
    may_accommodation REAL,
    jun_accommodation REAL,
    jul_accommodation REAL,
    aug_accommodation REAL,
    sep_accommodation REAL,
    oct_accommodation REAL,
    nov_accommodation REAL,
    dec_accommodation REAL,
    standard_accommodation REAL,
    breakfast REAL,
    lunch REAL,
    dinner REAL,
    incidentals REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);

// Clear existing data (already done by DROP TABLE above)
console.log("📋 Schema created with nullable meal fields");

let inserted = 0;
let errors = 0;

// Migrate accommodations (international rates)
console.log("📥 Migrating international accommodations...");
const accommodations = sourceDb
  .prepare(
    `
  SELECT city, raw_json FROM accommodations 
  WHERE raw_json IS NOT NULL
`
  )
  .all();

const insertStmt = targetDb.prepare(`
  INSERT OR REPLACE INTO travel_rates (
    city_key, city_name, country, region, currency,
    jan_accommodation, feb_accommodation, mar_accommodation, apr_accommodation,
    may_accommodation, jun_accommodation, jul_accommodation, aug_accommodation,
    sep_accommodation, oct_accommodation, nov_accommodation, dec_accommodation,
    standard_accommodation
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const row of accommodations) {
  try {
    const data = JSON.parse(row.raw_json);
    const country = data.Country || "";
    const city = data.City || row.city || "";

    if (!city || !country) continue;

    const cityKey = `${country.toLowerCase().replace(/\s+/g, "_")}_${city
      .toLowerCase()
      .replace(/\s+/g, "_")}`;

    // Parse monthly rates
    const jan = parseFloat(data["Jan."]) || null;
    const feb = parseFloat(data["Feb."]) || null;
    const mar = parseFloat(data["Mar."]) || null;
    const apr = parseFloat(data["Apr."]) || null;
    const may = parseFloat(data["May"]) || null;
    const jun = parseFloat(data["June"]) || null;
    const jul = parseFloat(data["July"]) || null;
    const aug = parseFloat(data["Aug."]) || null;
    const sep = parseFloat(data["Sept."]) || null;
    const oct = parseFloat(data["Oct."]) || null;
    const nov = parseFloat(data["Nov."]) || null;
    const dec = parseFloat(data["Dec."]) || null;

    // Standard accommodation = average of all available monthly values
    const months = [
      jan,
      feb,
      mar,
      apr,
      may,
      jun,
      jul,
      aug,
      sep,
      oct,
      nov,
      dec,
    ].filter((v) => typeof v === "number" && !Number.isNaN(v));
    const standard =
      months.length > 0
        ? months.reduce((sum, v) => sum + v, 0) / months.length
        : null;

    insertStmt.run(
      cityKey,
      city,
      country,
      "International",
      "USD", // Foreign city limits are published in USD
      jan,
      feb,
      mar,
      apr,
      may,
      jun,
      jul,
      aug,
      sep,
      oct,
      nov,
      dec,
      standard
    );

    inserted++;

    if (inserted % 100 === 0) {
      console.log(`   ... ${inserted} cities migrated`);
    }
  } catch (error) {
    errors++;
    console.error(`   ⚠️  Error migrating ${row.city}:`, error.message);
  }
}

// Migrate per-diem rates (meal and incidentals)
console.log("\n📥 Migrating per-diem rates...");
const rateEntries = sourceDb
  .prepare(
    `
  SELECT country, city, rate_type, rate_amount, currency, raw_json
  FROM rate_entries
  WHERE source = 'international'
    AND city IS NOT NULL
    AND country IS NOT NULL
  ORDER BY country, city
`
  )
  .all();

// Group by city, selecting preferred meal plan type (C-Day 1-30 > C-Day 31-120 > C-Day 121+ > P-Day 1-30 > P-Day 31-120 > P-Day 121+)
const typePriority = [
  "C-Day 1-30",
  "C-Day 31-120",
  "C-Day 121 +",
  "P-Day 1-30",
  "P-Day 31-120",
  "P-Day 121 +",
];

const stripWeirdSpaces = (value) =>
  typeof value === "string"
    ? value
        .replace(/[\u00ad\u200b\u200c\u200d]/g, "") // soft hyphen & zero-widths
        .replace(/[\u2010\u2011\u2012\u2013]/g, "-")
    : value;

const normalizeType = (value) => {
  if (!value) return "";
  return stripWeirdSpaces(value)
    .replace(/\s+/g, " ")
    .replace(/Day (\d+)\s*\+/i, "Day $1 +")
    .trim();
};

const normalizeRecord = (obj) => {
  const normalized = {};
  for (const [key, val] of Object.entries(obj || {})) {
    const cleanKey = stripWeirdSpaces(key)
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    normalized[cleanKey] = val;
  }
  return normalized;
};

const pickValue = (record, candidates) => {
  for (const key of candidates) {
    const value = record[key];
    if (value !== undefined) return value;
  }
  return undefined;
};

const cityRates = {};
for (const row of rateEntries) {
  let data;
  try {
    data = JSON.parse(row.raw_json);
  } catch (e) {
    continue;
  }

  const normalized = normalizeRecord(data);

  const type = normalizeType(normalized["type of accommodation"] || "");
  const priority = typePriority.indexOf(type);
  const key = `${row.country}_${row.city}`;

  const breakfastVal = pickValue(normalized, ["breakfast"]);
  const lunchVal = pickValue(normalized, ["lunch"]);
  const dinnerVal = pickValue(normalized, ["dinner"]);
  const incidentalsVal = pickValue(normalized, ["incidental amount"]);
  const mealTotalVal = pickValue(normalized, [
    "meal total",
    "meal totall",
    "meal totaa l",
  ]);

  // Initialize city entry if needed
  if (!cityRates[key]) {
    cityRates[key] = {
      country: row.country,
      city: row.city,
      currency: row.currency,
      meal_plan_type: type,
      priority,
      breakfast: parseFloat(breakfastVal) || null,
      lunch: parseFloat(lunchVal) || null,
      dinner: parseFloat(dinnerVal) || null,
      incidentals: parseFloat(incidentalsVal) || null,
      meal_total: parseFloat(mealTotalVal) || null,
    };
  }

  // If this type is higher priority than stored, replace
  const existing = cityRates[key];
  const existingPriority =
    existing && typeof existing.priority === "number"
      ? existing.priority
      : Infinity;

  // Determine if this record should replace the existing one
  const isKnownPriority = priority !== -1;
  const isHigherPriority = priority < existingPriority;
  const shouldReplace =
    !existing ||
    (isKnownPriority && isHigherPriority) ||
    existingPriority === Infinity;

  if (!shouldReplace) continue;

  cityRates[key] = {
    country: row.country,
    city: row.city,
    currency: row.currency,
    meal_plan_type:
      type ||
      existing?.meal_plan_type ||
      (isKnownPriority && priority >= 0 ? typePriority[priority] : null),
    priority: isKnownPriority ? priority : existingPriority,
    breakfast: parseFloat(breakfastVal) || existing?.breakfast || null,
    lunch: parseFloat(lunchVal) || existing?.lunch || null,
    dinner: parseFloat(dinnerVal) || existing?.dinner || null,
    incidentals: parseFloat(incidentalsVal) || existing?.incidentals || null,
    meal_total: parseFloat(mealTotalVal) || existing?.meal_total || null,
  };
}

// Update existing cities with meal rates
const updateStmt = targetDb.prepare(`
  UPDATE travel_rates 
  SET breakfast = ?, lunch = ?, dinner = ?, incidentals = ?,
      meal_currency = COALESCE(meal_currency, ?),
      meal_plan_type = COALESCE(?, meal_plan_type),
      meal_total = COALESCE(?, meal_total)
  WHERE city_key = ?
`);

let updated = 0;
for (const [key, rates] of Object.entries(cityRates)) {
  const cityKey = `${rates.country
    .toLowerCase()
    .replace(/\s+/g, "_")}_${rates.city.toLowerCase().replace(/\s+/g, "_")}`;

  const result = updateStmt.run(
    rates.breakfast,
    rates.lunch,
    rates.dinner,
    rates.incidentals,
    rates.currency,
    rates.meal_plan_type ||
      (typeof rates.priority === "number" && rates.priority >= 0
        ? typePriority[rates.priority]
        : null),
    rates.meal_total,
    cityKey
  );

  if (result.changes > 0) {
    updated++;
  }
}

// Final statistics
console.log("\n✅ Migration complete!");
console.log(`   📊 Accommodations inserted: ${inserted}`);
console.log(`   📊 Per-diem rates updated: ${updated}`);
console.log(`   ⚠️  Errors: ${errors}`);

// Verify Riga
console.log("\n🔍 Verifying Riga data:");
const riga = targetDb
  .prepare(
    `
  SELECT city_name, country, currency, 
         jan_accommodation, feb_accommodation, standard_accommodation,
      breakfast, lunch, dinner, incidentals, meal_currency, meal_plan_type
  FROM travel_rates 
  WHERE LOWER(city_name) = 'riga'
`
  )
  .get();

if (riga) {
  console.log("   ✅ Riga found:");
  console.log(`      Country: ${riga.country}`);
  console.log(`      Accommodation currency: ${riga.currency}`);
  console.log(
    `      Accommodation (Jan): ${riga.currency} $${riga.jan_accommodation}`
  );
  console.log(
    `      Accommodation (Standard): ${riga.currency} $${riga.standard_accommodation}`
  );
  if (riga.meal_currency)
    console.log(`      Meal currency: ${riga.meal_currency}`);
  if (riga.meal_plan_type)
    console.log(`      Meal plan: ${riga.meal_plan_type}`);
  if (riga.breakfast)
    console.log(
      `      Breakfast: ${riga.meal_currency || ""} $${riga.breakfast}`
    );
  if (riga.lunch)
    console.log(`      Lunch: ${riga.meal_currency || ""} $${riga.lunch}`);
  if (riga.dinner)
    console.log(`      Dinner: ${riga.meal_currency || ""} $${riga.dinner}`);
} else {
  console.log("   ⚠️  Riga NOT found in database!");
}

// Show total count
const total = targetDb
  .prepare("SELECT COUNT(*) as count FROM travel_rates")
  .get();
console.log(`\n📊 Total cities in database: ${total.count}`);

sourceDb.close();
targetDb.close();

console.log("\n✅ Done!");
