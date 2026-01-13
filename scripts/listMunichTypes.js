const Database = require("better-sqlite3");
const path = require("path");
const db = new Database(
  path.join(__dirname, "..", "data", "travel_rates_scraped.sqlite3")
);
const rows = db
  .prepare("select raw_json from rate_entries where lower(city)='munich'")
  .all();
const types = new Set();
for (const r of rows) {
  const data = JSON.parse(r.raw_json);
  types.add(data["Type of Accommodation"]);
}
console.log(types);
