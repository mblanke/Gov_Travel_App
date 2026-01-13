const Database = require("better-sqlite3");
const path = require("path");
const db = new Database(
  path.join(__dirname, "..", "database", "travel_rates.db")
);
console.log(
  db
    .prepare(
      "select city_name, meal_plan_type from travel_rates where lower(city_name)='munich'"
    )
    .get()
);
