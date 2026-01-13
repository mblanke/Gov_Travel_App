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
const data = JSON.parse(row.raw_json);
const keys = Object.keys(data);
for (const k of keys) {
  const codes = Array.from(k).map((c) => c.charCodeAt(0));
  console.log(k, codes);
}
