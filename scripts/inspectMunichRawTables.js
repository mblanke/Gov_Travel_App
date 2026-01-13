const Database = require("better-sqlite3");
const path = require("path");
const db = new Database(
  path.join(__dirname, "..", "data", "travel_rates_scraped.sqlite3")
);
const row = db
  .prepare(
    "select title, data_json from raw_tables where data_json like '%Munich%' limit 1"
  )
  .get();
console.log(row?.title);
if (row?.data_json) {
  console.log(row.data_json.slice(0, 2000));
}
