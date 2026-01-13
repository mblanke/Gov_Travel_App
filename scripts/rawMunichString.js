const Database = require("better-sqlite3");
const path = require("path");
const db = new Database(
  path.join(__dirname, "..", "data", "travel_rates_scraped.sqlite3")
);
const row = db
  .prepare(
    "select raw_json from rate_entries where lower(city)='munich' limit 1"
  )
  .get();
console.log(row.raw_json);
