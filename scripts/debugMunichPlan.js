const Database = require("better-sqlite3");
const path = require("path");
const sourceDb = new Database(
  path.join(__dirname, "..", "data", "travel_rates_scraped.sqlite3")
);
const typePriority = [
  "C-Day 1-30",
  "C-Day 31-120",
  "C-Day 121 +",
  "P-Day 1-30",
  "P-Day 31-120",
  "P-Day 121 +",
];
const rateEntries = sourceDb
  .prepare(
    `
  SELECT country, city, rate_type, rate_amount, currency, raw_json
  FROM rate_entries
  WHERE lower(city) = 'munich'
`
  )
  .all();
const cityRates = {};
for (const row of rateEntries) {
  const data = JSON.parse(row.raw_json);
  const type = (data["Type of Accommodation"] || "").trim();
  const priority = typePriority.indexOf(type);
  const key = `${row.country}_${row.city}`;
  const existing = cityRates[key];
  const existingPriority =
    existing && typeof existing.priority === "number"
      ? existing.priority
      : Infinity;
  const isKnownPriority = priority !== -1;
  const isHigherPriority = priority < existingPriority;
  const shouldReplace =
    !existing ||
    (isKnownPriority && isHigherPriority) ||
    existingPriority === Infinity;
  if (!shouldReplace) continue;
  cityRates[key] = {
    country: row.country,
    city: row.city,
    currency: row.currency,
    meal_plan_type:
      type ||
      existing?.meal_plan_type ||
      (isKnownPriority ? typePriority[priority] : null),
    priority: isKnownPriority ? priority : existingPriority,
    breakfast: parseFloat(data.Breakfast) || existing?.breakfast || null,
    lunch: parseFloat(data.Lunch || data["Lunch"]) || existing?.lunch || null,
    dinner: parseFloat(data.Dinner) || existing?.dinner || null,
    incidentals:
      parseFloat(data["Incidental Amount"]) || existing?.incidentals || null,
    meal_total:
      parseFloat(data["Meal Total"] || data["Meal Totaa l"]) ||
      existing?.meal_total ||
      null,
  };
}
console.log(cityRates);
