/**
 * Migration script to convert scraped SQLite database to Node.js travel_rates schema
 *
 * Source DB: travel_rates_scraped.sqlite3 (from Python scraper)
 * Target DB: travel_rates.db (Node.js app schema)
 *
 * This script:
 * 1. Reads rate_entries from scraped DB
 * 2. Aggregates meal rates (breakfast, lunch, dinner) and incidentals by city
 * 3. Inserts into travel_rates table in Node.js format
 */

const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Database paths
const SOURCE_DB = path.join(
  __dirname,
  "..",
  "data",
  "travel_rates_scraped.sqlite3"
);
const TARGET_DB = path.join(__dirname, "..", "travel_rates.db");

// Exchange rates for display (not used for conversion, just for reference)
const EXCHANGE_RATES = {
  EUR: 1.54, // EUR to CAD
  USD: 1.39, // USD to CAD
  AUD: 0.92, // AUD to CAD
  CAD: 1.0,
  ARS: 0.0014, // ARS to CAD (approximate)
};

async function openDatabase(dbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

async function queryAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function runQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function aggregateCityRates(sourceDb) {
  // Get all international cities with their meal rates
  const query = `
        SELECT 
            country,
            city,
            currency,
            MAX(CASE WHEN rate_type LIKE '%breakfast%' THEN rate_amount END) as breakfast,
            MAX(CASE WHEN rate_type LIKE '%lunch%' THEN rate_amount END) as lunch,
            MAX(CASE WHEN rate_type LIKE '%dinner%' THEN rate_amount END) as dinner,
            MAX(CASE WHEN rate_type LIKE '%incidental%' THEN rate_amount END) as incidentals
        FROM rate_entries
        WHERE city IS NOT NULL
            AND country IS NOT NULL
            AND source = 'international'
        GROUP BY country, city, currency
        HAVING breakfast IS NOT NULL OR lunch IS NOT NULL OR dinner IS NOT NULL
    `;

  return await queryAll(sourceDb, query);
}

async function clearTargetDatabase(targetDb) {
  await runQuery(targetDb, "DELETE FROM travel_rates");
  console.log("Cleared existing travel_rates data");
}

async function insertCityRates(targetDb, cities) {
  const insertStmt = `
        INSERT INTO travel_rates (
            city_key, city_name, country, breakfast, lunch, dinner, 
            incidentals, currency, standardRate, standard_rate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

  let inserted = 0;
  let skipped = 0;

  for (const city of cities) {
    try {
      // Create city key (lowercase, spaces to dashes)
      const cityKey = `${city.city
        .toLowerCase()
        .replace(/\s+/g, "-")}-${city.country
        .toLowerCase()
        .replace(/\s+/g, "-")}`;

      // Standard rate is typically breakfast + lunch + dinner
      const standardRate =
        (city.breakfast || 0) + (city.lunch || 0) + (city.dinner || 0);

      await runQuery(targetDb, insertStmt, [
        cityKey,
        city.city,
        city.country,
        city.breakfast,
        city.lunch,
        city.dinner,
        city.incidentals,
        city.currency,
        standardRate,
        standardRate, // Both standardRate and standard_rate for compatibility
      ]);

      inserted++;
    } catch (err) {
      console.error(
        `Error inserting ${city.city}, ${city.country}: ${err.message}`
      );
      skipped++;
    }
  }

  return { inserted, skipped };
}

async function migrate() {
  console.log(
    "Starting migration from scraped database to Node.js schema...\n"
  );

  let sourceDb, targetDb;

  try {
    // Open databases
    console.log(`Opening source database: ${SOURCE_DB}`);
    sourceDb = await openDatabase(SOURCE_DB);

    console.log(`Opening target database: ${TARGET_DB}`);
    targetDb = await openDatabase(TARGET_DB);

    // Aggregate city rates from scraped data
    console.log("\nAggregating city rates from scraped data...");
    const cities = await aggregateCityRates(sourceDb);
    console.log(`Found ${cities.length} cities with meal rates`);

    // Show currency distribution
    const currencyCounts = cities.reduce((acc, city) => {
      acc[city.currency] = (acc[city.currency] || 0) + 1;
      return acc;
    }, {});
    console.log("\nCurrency distribution:");
    for (const [currency, count] of Object.entries(currencyCounts)) {
      console.log(`  ${currency}: ${count} cities`);
    }

    // Clear target database
    console.log("\nClearing target database...");
    await clearTargetDatabase(targetDb);

    // Insert city rates
    console.log("\nInserting city rates into target database...");
    const result = await insertCityRates(targetDb, cities);

    console.log(`\nMigration complete!`);
    console.log(`  Inserted: ${result.inserted} cities`);
    console.log(`  Skipped: ${result.skipped} cities`);

    // Show sample entries
    console.log("\nSample migrated entries:");
    const samples = await queryAll(
      targetDb,
      `
            SELECT city_name, country, breakfast, lunch, dinner, incidentals, currency
            FROM travel_rates
            WHERE country IN ('Argentina', 'Albania', 'Australia')
            LIMIT 5
        `
    );
    for (const sample of samples) {
      console.log(
        `  ${sample.city_name}, ${sample.country}: B:${sample.breakfast} L:${sample.lunch} D:${sample.dinner} I:${sample.incidentals} (${sample.currency})`
      );
    }
  } catch (err) {
    console.error("\nMigration failed:", err);
    process.exit(1);
  } finally {
    if (sourceDb) sourceDb.close();
    if (targetDb) targetDb.close();
  }
}

// Run migration
if (require.main === module) {
  migrate().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}

module.exports = { migrate };
