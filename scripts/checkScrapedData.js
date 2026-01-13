const Database = require("better-sqlite3");
const db = new Database("travel_rates.db");

// Check tables
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table'")
  .all();
console.log(
  "Tables in database:",
  tables.map((t) => t.name)
);

// Check rate entries
const rateCount = db
  .prepare("SELECT COUNT(*) as count FROM rate_entries")
  .get();
console.log("\nRate entries:", rateCount.count);

// Check accommodations
const accommCount = db
  .prepare("SELECT COUNT(*) as count FROM accommodations")
  .get();
console.log("Accommodations:", accommCount.count);

// Check Latvia/Riga
const latvia = db
  .prepare(
    `
  SELECT city, jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec 
  FROM accommodations 
  WHERE country = 'Latvia'
`
  )
  .all();

console.log("\nLatvia accommodations:");
console.log(JSON.stringify(latvia, null, 2));

db.close();
