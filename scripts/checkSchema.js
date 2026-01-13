const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(
  path.join(__dirname, "..", "travel_rates.db"),
  (err) => {
    if (err) {
      console.error("Error opening database:", err);
      process.exit(1);
    }
  }
);

db.all(
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
  [],
  (err, tables) => {
    if (err) {
      console.error("Error querying tables:", err);
      process.exit(1);
    }

    console.log("Tables in travel_rates.db:");
    tables.forEach((table) => {
      console.log(`  - ${table.name}`);
    });

    db.close();
  }
);
