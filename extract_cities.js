const fs = require("fs");

// Read accommodation rates
const accomData = JSON.parse(
  fs.readFileSync("./data/accommodationRates.json", "utf8")
);
const cities = Object.keys(accomData.cities);

// Separate Canadian and international
const canadian = cities.filter((c) => accomData.cities[c].region === "Canada");
const international = cities.filter(
  (c) => accomData.cities[c].region !== "Canada"
);

console.log("=== ACCOMMODATION CITIES ===");
console.log(`Total: ${cities.length}`);
console.log(`Canadian: ${canadian.length}`);
console.log(`International: ${international.length}\n`);

console.log("=== INTERNATIONAL CITIES (for airport codes) ===");
international.forEach((key) => {
  const city = accomData.cities[key];
  console.log(`${key}: ${city.name} (${city.country})`);
});

// Now get existing airport codes from flightService.js
const flightService = fs.readFileSync("./flightService.js", "utf8");
const airportCodeMatch = flightService.match(
  /const airportCodes = \{([^}]+)\}/s
);

console.log("\n=== MISSING AIRPORT CODES ===");
const missing = [];
international.forEach((key) => {
  const normalized = key.toLowerCase();
  if (
    !flightService.includes(`${normalized}:`) &&
    !flightService.includes(`"${normalized}":`)
  ) {
    const city = accomData.cities[key];
    missing.push(`${normalized} => ${city.name} (${city.country})`);
  }
});

missing.forEach((m) => console.log(m));
console.log(`\nTotal missing: ${missing.length}/${international.length}`);
