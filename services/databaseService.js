/**
 * Database Service - Normalized Schema
 *
 * This service provides methods to query the normalized travel rates database.
 * Tables: regions, accommodation_limits, meal_rates, incidental_rates,
 *         private_accommodation_rates, kilometric_rates, weekend_travel_allowances
 */

const Database = require("better-sqlite3");
const path = require("path");

class DatabaseService {
  constructor() {
    this.dbPath = path.join(__dirname, "..", "database", "travel_rates.db");
    this.db = null;
  }

  /**
   * Connect to database (synchronous with better-sqlite3)
   */
  connect() {
    try {
      this.db = new Database(this.dbPath, { readonly: false });
      console.log("✅ Database connected");
      return Promise.resolve();
    } catch (err) {
      console.error("❌ Database connection failed:", err);
      return Promise.reject(err);
    }
  }

  /**
   * Search for cities by name, country, or province
   * Returns accommodation limits with associated meal rates
   */
  searchCity(searchTerm) {
    const term = `%${searchTerm}%`;
    const exactTerm = searchTerm.toLowerCase();
    const likeTerm = `${searchTerm.toLowerCase()}%`;

    const query = `
            SELECT 
                a.*,
                r.name AS region_name,
                r.taxes_included,
                m.breakfast,
                m.lunch,
                m.dinner,
                m.total AS meals_total,
                m.currency AS meals_currency,
                i.rate AS incidentals,
                i.currency AS incidentals_currency
            FROM accommodation_limits a
            JOIN regions r ON a.region_code = r.code
            LEFT JOIN meal_rates m ON (
                (m.region_code = a.region_code AND m.city_key IS NULL)
                OR m.city_key = a.city_key
            ) AND m.accommodation_type = 'commercial' AND m.duration_tier = 'day_1_30'
            LEFT JOIN incidental_rates i ON (
                (i.region_code = a.region_code AND i.city_key IS NULL)
                OR i.city_key = a.city_key
            ) AND i.accommodation_type = 'commercial' AND i.duration_tier = 'day_1_30'
            WHERE LOWER(a.city_name) LIKE LOWER(?) 
               OR LOWER(a.city_key) LIKE LOWER(?)
               OR LOWER(a.country) LIKE LOWER(?)
               OR LOWER(a.province_state) LIKE LOWER(?)
            ORDER BY 
                CASE 
                    WHEN LOWER(a.city_name) = ? THEN 1
                    WHEN LOWER(a.city_key) = ? THEN 2
                    WHEN LOWER(a.city_name) LIKE ? THEN 3
                    ELSE 4
                END
            LIMIT 10
        `;

    try {
      const rows = this.db
        .prepare(query)
        .all(term, term, term, term, exactTerm, exactTerm, likeTerm);
      return Promise.resolve(rows.map((row) => this.formatTravelRate(row)));
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Get accommodation rate by exact city key
   */
  getAccommodationRate(cityKey, options = {}) {
    const {
      accommodationType = "commercial",
      durationTier = "day_1_30",
      month = null,
    } = options;

    const query = `
            SELECT 
                a.*,
                r.name AS region_name,
                r.taxes_included,
                m.breakfast,
                m.lunch,
                m.dinner,
                m.total AS meals_total,
                m.currency AS meals_currency,
                i.rate AS incidentals,
                i.currency AS incidentals_currency
            FROM accommodation_limits a
            JOIN regions r ON a.region_code = r.code
            LEFT JOIN meal_rates m ON (
                (m.region_code = a.region_code AND m.city_key IS NULL)
                OR m.city_key = a.city_key
            ) AND m.accommodation_type = ? AND m.duration_tier = ?
            LEFT JOIN incidental_rates i ON (
                (i.region_code = a.region_code AND i.city_key IS NULL)
                OR i.city_key = a.city_key
            ) AND i.accommodation_type = ? AND i.duration_tier = ?
            WHERE LOWER(a.city_key) = LOWER(?)
            LIMIT 1
        `;

    try {
      const row = this.db
        .prepare(query)
        .get(
          accommodationType,
          durationTier,
          accommodationType,
          durationTier,
          cityKey
        );
      return Promise.resolve(row ? this.formatTravelRate(row, month) : null);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Get rate for specific month
   */
  getMonthlyRate(cityKey, month) {
    return this.getAccommodationRate(cityKey, { month });
  }

  /**
   * Full-text search using FTS5 index
   */
  fullTextSearch(searchTerm) {
    const query = `
            SELECT 
                a.*,
                r.name AS region_name,
                r.taxes_included,
                m.breakfast,
                m.lunch,
                m.dinner,
                m.total AS meals_total,
                m.currency AS meals_currency,
                i.rate AS incidentals,
                i.currency AS incidentals_currency
            FROM accommodation_limits a
            JOIN regions r ON a.region_code = r.code
            LEFT JOIN meal_rates m ON (
                (m.region_code = a.region_code AND m.city_key IS NULL)
                OR m.city_key = a.city_key
            ) AND m.accommodation_type = 'commercial' AND m.duration_tier = 'day_1_30'
            LEFT JOIN incidental_rates i ON (
                (i.region_code = a.region_code AND i.city_key IS NULL)
                OR i.city_key = a.city_key
            ) AND i.accommodation_type = 'commercial' AND i.duration_tier = 'day_1_30'
            WHERE a.id IN (
                SELECT rowid FROM accommodation_search 
                WHERE accommodation_search MATCH ?
            )
            ORDER BY 
                CASE WHEN LOWER(a.city_name) = LOWER(?) THEN 1 ELSE 2 END
            LIMIT 20
        `;

    try {
      const rows = this.db.prepare(query).all(searchTerm, searchTerm);
      return Promise.resolve(rows.map((row) => this.formatTravelRate(row)));
    } catch (err) {
      // Fallback to LIKE search if FTS fails
      return this.searchCity(searchTerm);
    }
  }

  /**
   * Get all regions
   */
  getAllRegions() {
    const query = `SELECT code, name, default_currency FROM regions ORDER BY name`;
    try {
      const rows = this.db.prepare(query).all();
      return Promise.resolve(rows);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Get all countries
   */
  getAllCountries() {
    const query = `SELECT DISTINCT country FROM accommodation_limits ORDER BY country`;
    try {
      const rows = this.db.prepare(query).all();
      return Promise.resolve(rows.map((r) => r.country));
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Get cities by region
   */
  getCitiesByRegion(regionCode) {
    const query = `
            SELECT 
                a.*,
                r.name AS region_name,
                m.total AS meals_total,
                i.rate AS incidentals
            FROM accommodation_limits a
            JOIN regions r ON a.region_code = r.code
            LEFT JOIN meal_rates m ON m.region_code = a.region_code 
                AND m.city_key IS NULL 
                AND m.accommodation_type = 'commercial' 
                AND m.duration_tier = 'day_1_30'
            LEFT JOIN incidental_rates i ON i.region_code = a.region_code 
                AND i.city_key IS NULL 
                AND i.accommodation_type = 'commercial' 
                AND i.duration_tier = 'day_1_30'
            WHERE a.region_code = ?
            ORDER BY a.city_name
        `;

    try {
      const rows = this.db.prepare(query).all(regionCode);
      return Promise.resolve(rows.map((row) => this.formatTravelRate(row)));
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Get cities by country
   */
  getCitiesByCountry(country) {
    const query = `
            SELECT 
                a.*,
                r.name AS region_name,
                m.breakfast, m.lunch, m.dinner,
                m.total AS meals_total,
                m.currency AS meals_currency,
                i.rate AS incidentals,
                i.currency AS incidentals_currency
            FROM accommodation_limits a
            JOIN regions r ON a.region_code = r.code
            LEFT JOIN meal_rates m ON (
                (m.region_code = a.region_code AND m.city_key IS NULL)
                OR m.city_key = a.city_key
            ) AND m.accommodation_type = 'commercial' AND m.duration_tier = 'day_1_30'
            LEFT JOIN incidental_rates i ON (
                (i.region_code = a.region_code AND i.city_key IS NULL)
                OR i.city_key = a.city_key
            ) AND i.accommodation_type = 'commercial' AND i.duration_tier = 'day_1_30'
            WHERE LOWER(a.country) = LOWER(?)
            ORDER BY a.city_name
        `;

    try {
      const rows = this.db.prepare(query).all(country);
      return Promise.resolve(rows.map((row) => this.formatTravelRate(row)));
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Autocomplete search
   */
  autocomplete(prefix, limit = 10) {
    const term = `${prefix}%`;

    const query = `
            SELECT city_name, city_key, country, region_code, province_state
            FROM accommodation_limits
            WHERE LOWER(city_name) LIKE LOWER(?)
               OR LOWER(city_key) LIKE LOWER(?)
            ORDER BY 
                CASE WHEN LOWER(city_name) LIKE LOWER(?) THEN 1 ELSE 2 END,
                city_name
            LIMIT ?
        `;

    try {
      const rows = this.db
        .prepare(query)
        .all(term, term, prefix.toLowerCase() + "%", limit);
      return Promise.resolve(rows);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Get kilometric rate by province
   */
  getKilometricRate(provinceCode) {
    const query = `
            SELECT * FROM kilometric_rates 
            WHERE province_code = ? OR LOWER(province_territory) LIKE LOWER(?)
        `;

    try {
      const row = this.db.prepare(query).get(provinceCode, `%${provinceCode}%`);
      return Promise.resolve(row);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Get all kilometric rates
   */
  getAllKilometricRates() {
    const query = `SELECT * FROM kilometric_rates ORDER BY province_territory`;
    try {
      const rows = this.db.prepare(query).all();
      return Promise.resolve(rows);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Get private accommodation rate
   */
  getPrivateAccommodationRate(regionCode, tripDays) {
    const tier = tripDays <= 120 ? "day_1_120" : "day_121_plus";

    const query = `
            SELECT * FROM private_accommodation_rates
            WHERE region_code = ? AND duration_tier = ?
        `;

    try {
      const row = this.db.prepare(query).get(regionCode, tier);
      return Promise.resolve(row);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Get meal rates for a specific configuration
   */
  getMealRates(
    regionCode,
    cityKey = null,
    accommodationType = "commercial",
    tripDays = 1
  ) {
    let durationTier;
    if (tripDays <= 30) durationTier = "day_1_30";
    else if (tripDays <= 120) durationTier = "day_31_120";
    else durationTier = "day_121_plus";

    const query = cityKey
      ? `SELECT * FROM meal_rates WHERE region_code = ? AND city_key = ? AND accommodation_type = ? AND duration_tier = ?`
      : `SELECT * FROM meal_rates WHERE region_code = ? AND city_key IS NULL AND accommodation_type = ? AND duration_tier = ?`;

    try {
      const row = cityKey
        ? this.db
            .prepare(query)
            .get(regionCode, cityKey, accommodationType, durationTier)
        : this.db
            .prepare(query)
            .get(regionCode, accommodationType, durationTier);
      return Promise.resolve(row);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Get weekend travel allowance
   */
  getWeekendAllowance(regionCode, weekendLength) {
    const query = `
            SELECT * FROM weekend_travel_allowances
            WHERE region_code = ? AND weekend_length = ?
        `;

    try {
      const row = this.db.prepare(query).get(regionCode, weekendLength);
      return Promise.resolve(row);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Format database row into API response
   */
  formatTravelRate(row, targetMonth = null) {
    const monthNames = [
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
    ];

    // Build monthly rates array
    const monthlyRates = monthNames.map((m) => row[`${m}_rate`]);

    // Determine which month's rate to use (default: current month)
    const monthIndex = targetMonth ? targetMonth - 1 : new Date().getMonth();

    const currentAccommodationRate =
      monthlyRates[monthIndex] || row.default_rate;

    // Calculate daily totals
    const mealsTotal =
      row.meals_total ||
      (row.breakfast || 0) + (row.lunch || 0) + (row.dinner || 0);
    const incidentals = row.incidentals || 0;
    const dailyAllowance = mealsTotal + incidentals;

    return {
      // Identity
      cityKey: row.city_key,
      name: row.city_name,
      province: row.province_state,
      country: row.country,
      region: row.region_code,
      regionName: row.region_name,

      // Accommodation (what hotels cost - city-specific)
      accommodation_currency: row.currency,
      accommodation: {
        monthly: monthlyRates,
        standard: row.default_rate,
        current: currentAccommodationRate,
      },
      accommodation_rate: currentAccommodationRate,

      // Meals (per diem - region or city-specific)
      currency: row.meals_currency || row.currency,
      meals: {
        breakfast: row.breakfast || 0,
        lunch: row.lunch || 0,
        dinner: row.dinner || 0,
        total: mealsTotal,
      },

      // Incidentals
      incidentals: incidentals,

      // Totals
      totalDailyAllowance: dailyAllowance,
      fullDayCost: currentAccommodationRate + dailyAllowance,

      // Metadata
      isInternational: row.region_code === "international",
      taxesIncluded: row.taxes_included === 1,
      isCapital: row.is_capital === 1,
    };
  }

  /**
   * Legacy alias for backwards compatibility
   */
  formatAccommodationRate(row) {
    return this.formatTravelRate(row);
  }

  /**
   * Get database stats
   */
  getStats() {
    try {
      const stats = {
        accommodations: this.db
          .prepare("SELECT COUNT(*) as count FROM accommodation_limits")
          .get().count,
        mealRates: this.db
          .prepare("SELECT COUNT(*) as count FROM meal_rates")
          .get().count,
        incidentalRates: this.db
          .prepare("SELECT COUNT(*) as count FROM incidental_rates")
          .get().count,
        regions: this.db.prepare("SELECT COUNT(*) as count FROM regions").get()
          .count,
        countries: this.db
          .prepare(
            "SELECT COUNT(DISTINCT country) as count FROM accommodation_limits"
          )
          .get().count,
      };
      return Promise.resolve(stats);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      console.log("✅ Database connection closed");
    }
  }
}

module.exports = new DatabaseService();
