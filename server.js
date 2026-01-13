require("dotenv").config();
const express = require("express");
const path = require("path");
const helmet = require("helmet");
const compression = require("compression");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { searchFlights, getAirportCode } = require("./flightService");
const dbService = require("./services/databaseService");
const logger = require("./utils/logger");
const cache = require("./utils/cache");
const {
  validate,
  flightSearchSchema,
  accommodationSearchSchema,
} = require("./utils/validation");

const app = express();
const PORT = process.env.PORT || 5001;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

// Compression middleware
app.use(compression());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const flightLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Limit flight searches
  message: { error: "Too many flight searches, please try again later." },
});

// Apply rate limiters
app.use("/api/", apiLimiter);
app.use("/api/flights/", flightLimiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });
  next();
});

// Serve React app (production build) or legacy static files
if (
  process.env.NODE_ENV === "production" &&
  require("fs").existsSync(path.join(__dirname, "dist", "client"))
) {
  // Serve React production build
  app.use(
    express.static(path.join(__dirname, "dist", "client"), {
      maxAge: "1d",
      etag: true,
    })
  );
} else {
  // Serve legacy static files from the current directory
  app.use(
    express.static(__dirname, {
      maxAge: "1d",
      etag: true,
    })
  );
}

// Disable caching for HTML and JS files
app.use((req, res, next) => {
  if (req.path.endsWith(".html") || req.path.endsWith(".js")) {
    res.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
  }
  next();
});

// Serve data directory explicitly
app.use("/data", express.static(path.join(__dirname, "data")));

// Route for root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Route for validation page
app.get("/validation", (req, res) => {
  res.sendFile(path.join(__dirname, "validation.html"));
});

// API endpoint to search flights with caching and validation
app.get(
  "/api/flights/search",
  validate(flightSearchSchema),
  async (req, res) => {
    try {
      const {
        origin,
        destination,
        departureDate,
        returnDate,
        adults = 1,
      } = req.query;

      // Check cache first
      const cached = cache.getFlight(
        origin,
        destination,
        departureDate,
        returnDate,
        adults
      );
      if (cached) {
        logger.info("Returning cached flight data");
        return res.json({ ...cached, cached: true });
      }

      // Get airport codes from city names
      const originCode = getAirportCode(origin);
      const destinationCode = getAirportCode(destination);

      if (!originCode || !destinationCode) {
        logger.warn(`Airport codes not found: ${origin} -> ${destination}`);
        return res.status(400).json({
          success: false,
          message: `Could not find airport codes for: ${
            !originCode ? origin : ""
          } ${!destinationCode ? destination : ""}`.trim(),
        });
      }

      logger.info(`Searching flights: ${originCode} -> ${destinationCode}`);

      // Search flights
      const result = await searchFlights(
        originCode,
        destinationCode,
        departureDate,
        returnDate,
        adults
      );

      // Cache successful results
      if (result.success) {
        cache.setFlight(
          origin,
          destination,
          departureDate,
          returnDate,
          adults,
          result
        );
      }

      res.json(result);
    } catch (error) {
      logger.error("Flight search error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "An error occurred",
      });
    }
  }
);

// Initialize database connection on startup
(async () => {
  try {
    await dbService.connect();
    logger.info("✅ Database ready for queries");
  } catch (err) {
    logger.error("❌ Failed to connect to database:", err);
    logger.warn("⚠️  Falling back to JSON files");
  }
})();

// ============ DATA PORTAL ENDPOINTS ============

/**
 * Get all per-diem rates
 * GET /api/rates/per-diem
 */
app.get("/api/rates/per-diem", async (req, res) => {
  try {
    const data = await dbService.getAllPerDiemRates();
    res.json({ success: true, data, count: data.length });
  } catch (error) {
    logger.error("Error fetching per-diem rates:", error);
    res.status(500).json({ error: "Failed to fetch per-diem rates" });
  }
});

/**
 * Get all accommodation rates
 * GET /api/rates/accommodations
 */
app.get("/api/rates/accommodations", async (req, res) => {
  try {
    const data = await dbService.getAllAccommodations();
    res.json({ success: true, data, count: data.length });
  } catch (error) {
    logger.error("Error fetching accommodation rates:", error);
    res.status(500).json({ error: "Failed to fetch accommodation rates" });
  }
});

/**
 * Get portal statistics
 * GET /api/stats
 */
app.get("/api/stats", async (req, res) => {
  try {
    const stats = await dbService.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    logger.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// ============ DATABASE SEARCH ENDPOINTS ============

/**
 * Search for a city with caching
 * GET /api/accommodation/search?city=canberra
 */
app.get(
  "/api/accommodation/search",
  validate(accommodationSearchSchema),
  async (req, res) => {
    try {
      const { city } = req.query;

      // Check cache
      const cached = cache.getAccommodation(city);
      if (cached) {
        logger.debug(`Returning cached accommodation data for ${city}`);
        return res.json({ ...cached, cached: true });
      }

      const results = await dbService.searchCity(city);

      if (results.length === 0) {
        logger.warn(`City not found: ${city}`);
        return res.status(404).json({
          error: "City not found",
          message: `No accommodation rates found for: ${city}`,
          suggestion: "Try searching for a nearby major city",
        });
      }

      const response = {
        query: city,
        results: results,
        count: results.length,
      };

      // Cache the results
      cache.setAccommodation(city, response);

      res.json(response);
    } catch (error) {
      logger.error("Accommodation search error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * Get exact rate by city key
 * GET /api/accommodation/rate?city=canberra
 */
app.get("/api/accommodation/rate", async (req, res) => {
  try {
    const { city, month } = req.query;

    if (!city) {
      return res.status(400).json({ error: "Missing city parameter" });
    }

    if (month) {
      const monthNum = parseInt(month);
      if (monthNum < 1 || monthNum > 12) {
        return res
          .status(400)
          .json({ error: "Month must be between 1 and 12" });
      }
      const rate = await dbService.getMonthlyRate(city, monthNum);
      res.json(rate || { error: "City not found" });
    } else {
      const rate = await dbService.getAccommodationRate(city);
      res.json(rate || { error: "City not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Full-text search
 * GET /api/search?q=australia
 */
app.get("/api/search", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res
        .status(400)
        .json({ error: "Missing search query (q parameter)" });
    }

    const results = await dbService.fullTextSearch(q);
    res.json({
      query: q,
      results: results,
      count: results.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Autocomplete endpoint
 * GET /api/autocomplete?q=can
 */
app.get("/api/autocomplete", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }

    const suggestions = await dbService.autocomplete(q);
    res.json({
      query: q,
      suggestions: suggestions,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get cities by region
 * GET /api/cities/region?region=Oceania
 */
app.get("/api/cities/region", async (req, res) => {
  try {
    const { region } = req.query;

    if (!region) {
      return res.status(400).json({ error: "Missing region parameter" });
    }

    const cities = await dbService.getCitiesByRegion(region);
    res.json({
      region: region,
      cities: cities,
      count: cities.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get cities by country
 * GET /api/cities/country?country=Australia
 */
app.get("/api/cities/country", async (req, res) => {
  try {
    const { country } = req.query;

    if (!country) {
      return res.status(400).json({ error: "Missing country parameter" });
    }

    const cities = await dbService.getCitiesByCountry(country);
    res.json({
      country: country,
      cities: cities,
      count: cities.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * List all regions
 * GET /api/regions
 */
app.get("/api/regions", async (req, res) => {
  try {
    const regions = await dbService.getAllRegions();
    res.json({ regions: regions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * List all countries
 * GET /api/countries
 */
app.get("/api/countries", async (req, res) => {
  try {
    const countries = await dbService.getAllCountries();
    res.json({ countries: countries });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update health check to include database status
app.get("/api/health", async (req, res) => {
  let dbStatus = "inactive";
  try {
    const regions = await dbService.getAllRegions();
    dbStatus = regions.length > 0 ? "active" : "empty";
  } catch (err) {
    dbStatus = "error";
  }

  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
    cache: cache.getStats(),
    version: "1.2.0",
  });
});

/**
 * Cache management endpoint (development only)
 * GET /api/cache/clear
 */
if (process.env.NODE_ENV === "development") {
  app.get("/api/cache/clear", (req, res) => {
    cache.clearAll();
    logger.info("All caches cleared via API");
    res.json({ message: "All caches cleared" });
  });

  app.get("/api/cache/stats", (req, res) => {
    res.json(cache.getStats());
  });
}

// Global error handler
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "An unexpected error occurred",
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn(`404 Not Found: ${req.url}`);
  res.status(404).json({ error: "Endpoint not found" });
});

// Start server
app.listen(PORT, () => {
  logger.info("==========================================");
  logger.info("Government Travel Cost Estimator v1.2.0");
  logger.info("==========================================");
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📱 Main App: http://localhost:${PORT}`);
  logger.info(`🔍 Validation: http://localhost:${PORT}/validation.html`);
  logger.info(`✈️  Flight API: http://localhost:${PORT}/api/flights/search`);
  logger.info(
    `🏨 Accommodation API: http://localhost:${PORT}/api/accommodation/search`
  );
  logger.info(`❤️  Health Check: http://localhost:${PORT}/api/health`);
  logger.info("==========================================");

  if (!process.env.AMADEUS_API_KEY || !process.env.AMADEUS_API_SECRET) {
    logger.warn("⚠️  WARNING: Amadeus API credentials not configured!");
    logger.warn(
      "   Flight search will use sample data until credentials are added"
    );
    logger.warn(
      "   Get free API key at: https://developers.amadeus.com/register"
    );
  } else {
    logger.info("✅ Amadeus API configured");
  }

  logger.info(`📝 Log files: ${path.join(__dirname, "logs")}`);
  logger.info(`💾 Cache enabled: Flights (1h), Rates (24h), DB (5m)`);
  logger.info("==========================================");
  logger.info("Press Ctrl+C to stop the server");
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    logger.info("HTTP server closed");
    cache.clearAll();
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT signal received: closing HTTP server");
  process.exit(0);
});
