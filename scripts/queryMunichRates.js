const Database = require("better-sqlite3");
const path = require("path");
const db = new Database(
  path.join(__dirname, "..", "data", "travel_rates_scraped.sqlite3")
);
const rows = db
  .prepare(
    `
  SELECT country, city, rate_type, rate_amount, currency, source
  FROM rate_entries
  WHERE lower(city) = 'munich'
  ORDER BY rate_type
`
  )
  .all();
console.log(rows);
