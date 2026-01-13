const Database = require("better-sqlite3");
const path = require("path");
const db = new Database(
  path.join(__dirname, "..", "database", "travel_rates.db")
);
const row = db
  .prepare(
    `
    SELECT city_name, country, currency, meal_currency, meal_plan_type, meal_total,
      breakfast, lunch, dinner, incidentals
  FROM travel_rates
  WHERE lower(city_name) = 'munich'
`
  )
  .get();
console.log(row);
