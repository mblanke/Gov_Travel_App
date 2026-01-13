const Database = require("better-sqlite3");
const path = require("path");
const db = new Database(
  path.join(__dirname, "..", "data", "travel_rates_scraped.sqlite3")
);
const row = db
  .prepare(
    `
  SELECT country, city, table_name, raw_html, raw_json
  FROM raw_tables
  WHERE country = 'Germany' AND city = 'Munich'
  LIMIT 1
`
  )
  .get();
console.log(row);
