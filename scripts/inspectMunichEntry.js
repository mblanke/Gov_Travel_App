const Database = require("better-sqlite3");
const path = require("path");
const db = new Database(
  path.join(__dirname, "..", "data", "travel_rates_scraped.sqlite3")
);
const row = db
  .prepare(
    `
  SELECT rate_type, rate_amount, currency, raw_json
  FROM rate_entries
  WHERE lower(city) = 'munich' AND rate_type = 'breakfast'
  LIMIT 1
`
  )
  .get();
console.log(row);
