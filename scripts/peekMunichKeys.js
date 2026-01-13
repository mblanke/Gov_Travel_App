const Database = require("better-sqlite3");
const path = require("path");
const db = new Database(
  path.join(__dirname, "..", "data", "travel_rates_scraped.sqlite3")
);
const row = db
  .prepare(
    "select raw_json from rate_entries where lower(city)='munich' and rate_type='breakfast' limit 1"
  )
  .get();
const data = JSON.parse(row.raw_json);
console.log(Object.keys(data));
console.log(data);
