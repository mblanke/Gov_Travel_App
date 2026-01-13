const https = require("https");
const fs = require("fs");
const path = require("path");

const GITHUB_RAW =
  "https://raw.githubusercontent.com/jpatokal/openflights/master/data";
const DATA_DIR = path.join(__dirname, "data", "openflights");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory cache
let airportsData = null;
let airlinesData = null;
let routesData = null;

/**
 * Fetch file from GitHub with HTTPS
 */
function fetchFile(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

/**
 * Parse CSV line, handling quoted fields
 */
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Load airports from OpenFlights
 */
async function loadAirports() {
  if (airportsData) return airportsData;

  const cacheFile = path.join(DATA_DIR, "airports.dat");

  try {
    // Try to load from cache first
    if (fs.existsSync(cacheFile)) {
      const cachedData = fs.readFileSync(cacheFile, "utf8");
      airportsData = parseAirports(cachedData);
      return airportsData;
    }

    console.log("📥 Fetching OpenFlights airports data...");
    const data = await fetchFile(`${GITHUB_RAW}/airports.dat`);
    fs.writeFileSync(cacheFile, data);
    airportsData = parseAirports(data);
    return airportsData;
  } catch (error) {
    console.error("Error loading airports:", error.message);
    return {};
  }
}

/**
 * Load airlines from OpenFlights
 */
async function loadAirlines() {
  if (airlinesData) return airlinesData;

  const cacheFile = path.join(DATA_DIR, "airlines.dat");

  try {
    if (fs.existsSync(cacheFile)) {
      const cachedData = fs.readFileSync(cacheFile, "utf8");
      airlinesData = parseAirlines(cachedData);
      return airlinesData;
    }

    console.log("📥 Fetching OpenFlights airlines data...");
    const data = await fetchFile(`${GITHUB_RAW}/airlines.dat`);
    fs.writeFileSync(cacheFile, data);
    airlinesData = parseAirlines(data);
    return airlinesData;
  } catch (error) {
    console.error("Error loading airlines:", error.message);
    return {};
  }
}

/**
 * Load routes from OpenFlights
 */
async function loadRoutes() {
  if (routesData) return routesData;

  const cacheFile = path.join(DATA_DIR, "routes.dat");

  try {
    if (fs.existsSync(cacheFile)) {
      const cachedData = fs.readFileSync(cacheFile, "utf8");
      routesData = parseRoutes(cachedData);
      return routesData;
    }

    console.log("📥 Fetching OpenFlights routes data...");
    const data = await fetchFile(`${GITHUB_RAW}/routes.dat`);
    fs.writeFileSync(cacheFile, data);
    routesData = parseRoutes(data);
    return routesData;
  } catch (error) {
    console.error("Error loading routes:", error.message);
    return {};
  }
}

/**
 * Parse airports CSV format
 * Format: Airport ID, Name, City, Country, IATA, ICAO, Latitude, Longitude, Altitude, Timezone, DST, Tz database time zone, Type, Source
 */
function parseAirports(csvData) {
  const airports = {};
  const lines = csvData.split("\n");

  lines.forEach((line) => {
    if (!line.trim()) return;
    const fields = parseCSVLine(line);
    if (fields.length >= 5) {
      const iata = fields[4];
      if (iata && iata !== "\\N") {
        airports[iata] = {
          id: fields[0],
          name: fields[1],
          city: fields[2],
          country: fields[3],
          iata: iata,
          icao: fields[5],
        };
      }
    }
  });

  return airports;
}

/**
 * Parse airlines CSV format
 * Format: Airline ID, Name, Alias, IATA, ICAO, Callsign, Country, Active
 */
function parseAirlines(csvData) {
  const airlines = {};
  const lines = csvData.split("\n");

  lines.forEach((line) => {
    if (!line.trim()) return;
    const fields = parseCSVLine(line);
    if (fields.length >= 4) {
      const iata = fields[3];
      if (iata && iata !== "\\N") {
        airlines[iata] = {
          id: fields[0],
          name: fields[1],
          iata: iata,
          icao: fields[4],
        };
      }
    }
  });

  return airlines;
}

/**
 * Parse routes CSV format
 * Format: Airline, Source airport, Destination airport, Codeshare, Stops, Equipment
 */
function parseRoutes(csvData) {
  const routes = {};
  const lines = csvData.split("\n");

  lines.forEach((line) => {
    if (!line.trim()) return;
    const fields = parseCSVLine(line);
    if (fields.length >= 5) {
      const source = fields[1];
      const dest = fields[2];
      const airline = fields[0];

      if (source !== "\\N" && dest !== "\\N" && airline !== "\\N") {
        const routeKey = `${source}-${dest}`;
        if (!routes[routeKey]) {
          routes[routeKey] = [];
        }
        routes[routeKey].push({
          airline: airline,
          stops: parseInt(fields[4]) || 0,
        });
      }
    }
  });

  return routes;
}

/**
 * Find routes between two airports
 */
async function findRoutes(originCode, destCode) {
  const routes = await loadRoutes();
  const routeKey = `${originCode}-${destCode}`;
  return routes[routeKey] || [];
}

/**
 * Generate realistic flights based on airport and airline data
 * Uses OpenFlights to validate airport existence, then generates realistic flights
 */
async function generateFlights(originCode, destCode, departureDate) {
  try {
    const [airports, airlines] = await Promise.all([
      loadAirports(),
      loadAirlines(),
    ]);

    // Validate airports exist
    if (!airports[originCode] || !airports[destCode]) {
      console.log(
        `Airports not found: ${originCode}=${
          airports[originCode] ? "exists" : "missing"
        }, ${destCode}=${airports[destCode] ? "exists" : "missing"}`
      );
      return null;
    }

    console.log(
      `✓ Found airports: ${originCode}=${airports[originCode].city}, ${destCode}=${airports[destCode].city}`
    );

    // List of major airlines for international flights
    const majorAirlines = ["AC", "BA", "LH", "AF", "KL", "SQ", "UA", "AA"];
    const selectedAirlines = majorAirlines.slice(0, 4);

    // Generate 4 flight options
    const flights = [];

    selectedAirlines.forEach((airlineCode, idx) => {
      // Calculate realistic flight duration based on stop pattern
      // NO DIRECT FLIGHTS from North America to Eastern Europe - all require stops
      let stops, stopCodes;
      let totalDuration;

      if (idx === 0) {
        // 1 stop via London
        stops = 1;
        stopCodes = ["LHR"];
        totalDuration = 13 + Math.random() * 2; // 13-15 hours
      } else if (idx === 1) {
        // 1 stop via Paris
        stops = 1;
        stopCodes = ["CDG"];
        totalDuration = 13 + Math.random() * 2; // 13-15 hours
      } else if (idx === 2) {
        // 1 stop via Frankfurt
        stops = 1;
        stopCodes = ["FRA"];
        totalDuration = 14 + Math.random() * 2; // 14-16 hours
      } else {
        // 2 stops
        stops = 2;
        stopCodes = ["AMS", "WAW"]; // Amsterdam + Warsaw
        totalDuration = 16 + Math.random() * 2; // 16-18 hours
      }

      // Generate realistic departure times (6am-10am)
      const depHour = 6 + idx;
      const depTime = new Date(departureDate);
      depTime.setHours(depHour, 0, 0, 0);

      // Calculate arrival time (add flight duration + timezone difference for Riga ~7-8 hours)
      const arrTime = new Date(depTime);
      const timezoneOffset = 7 + Math.random() * 1; // 7-8 hours
      const totalHours = Math.ceil(totalDuration) + Math.round(timezoneOffset);
      arrTime.setHours(arrTime.getHours() + totalHours);

      // Generate realistic pricing
      const basePrice = 750;
      const stopPrice = stops * 150;
      const price = basePrice + stopPrice + Math.random() * 350;

      const hours = Math.floor(totalDuration);
      const minutes = Math.round((totalDuration % 1) * 60);
      const durationISO = `PT${hours}H${minutes}M`;

      flights.push({
        price: parseFloat(price.toFixed(2)),
        currency: "CAD",
        duration: durationISO,
        durationHours: parseFloat(totalDuration.toFixed(1)),
        businessClassEligible: totalDuration >= 9,
        stops: stops,
        stopCodes: stopCodes,
        carrier: airlineCode,
        departureTime: depTime.toISOString().split(".")[0],
        arrivalTime: arrTime.toISOString().split(".")[0],
      });
    });

    // Sort by price
    flights.sort((a, b) => a.price - b.price);

    return flights.length > 0 ? flights : null;
  } catch (error) {
    console.error("Error generating flights:", error.message);
    return null;
  }
}

module.exports = {
  loadAirports,
  loadAirlines,
  loadRoutes,
  findRoutes,
  generateFlights,
};
