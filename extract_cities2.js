const fs = require("fs");

// Read accommodation rates
const accomData = JSON.parse(
  fs.readFileSync("./data/accommodationRates.json", "utf8")
);
const canadianCities = Object.keys(accomData.cities);
const internationalCities = Object.keys(accomData.internationalCities || {});

console.log("=== ACCOMMODATION CITIES ===");
console.log(`Canadian: ${canadianCities.length}`);
console.log(`International: ${internationalCities.length}`);
console.log(`Total: ${canadianCities.length + internationalCities.length}\n`);

// Now get existing airport codes from flightService.js
const flightService = fs.readFileSync("./flightService.js", "utf8");

console.log("=== MISSING AIRPORT CODES ===");
const missing = [];
internationalCities.forEach((key) => {
  const normalized = key.toLowerCase();
  if (
    !flightService.includes(`${normalized}:`) &&
    !flightService.includes(`"${normalized}":`)
  ) {
    const city = accomData.internationalCities[key];
    missing.push(
      `    "${normalized}": "???", // ${city.name} (${
        city.country || city.region
      })`
    );
  }
});

missing.forEach((m) => console.log(m));
console.log(`\n=== SUMMARY ===`);
console.log(`Total international cities: ${internationalCities.length}`);
console.log(`Missing airport codes: ${missing.length}`);
