const fs = require("fs");

// Read accommodation rates
const accomData = JSON.parse(
  fs.readFileSync("./data/accommodationRates.json", "utf8")
);
const canadianCities = Object.keys(accomData.cities);

// Now get existing airport codes from flightService.js
const flightService = fs.readFileSync("./flightService.js", "utf8");

console.log("=== CANADIAN CITIES MISSING AIRPORT CODES ===");
const missing = [];
canadianCities.forEach((key) => {
  const normalized = key.toLowerCase();
  if (
    !flightService.includes(`${normalized}:`) &&
    !flightService.includes(`"${normalized}":`)
  ) {
    const city = accomData.cities[key];
    missing.push(`    "${normalized}": "???", // ${city.name}`);
  }
});

if (missing.length > 0) {
  missing.forEach((m) => console.log(m));
  console.log(`\nTotal missing: ${missing.length}/${canadianCities.length}`);
} else {
  console.log("All Canadian cities have airport codes!");
  console.log(`Total: ${canadianCities.length}`);
}
