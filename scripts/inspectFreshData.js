const Database = require("better-sqlite3");
const sourceDb = new Database("data/travel_rates_scraped.sqlite3");

// Check schema
console.log("\n=== ACCOMMODATIONS SCHEMA ===");
const accomSchema = sourceDb
  .prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='accommodations'"
  )
  .get();
console.log(accomSchema.sql);

// Get Latvia data
console.log("\n=== LATVIA ACCOMMODATIONS ===");
const latvia = sourceDb
  .prepare(
    `
  SELECT * FROM accommodations 
  WHERE source_url LIKE '%Latvia%' OR raw_json LIKE '%Latvia%'
  LIMIT 5
`
  )
  .all();
console.log(JSON.stringify(latvia, null, 2));

// Search for Riga specifically
console.log("\n=== RIGA SEARCH ===");
const riga = sourceDb
  .prepare(
    `
  SELECT * FROM accommodations 
  WHERE city LIKE '%Riga%' OR raw_json LIKE '%Riga%'
`
  )
  .all();
console.log(JSON.stringify(riga, null, 2));

sourceDb.close();
