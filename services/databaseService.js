const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseService {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'database', 'travel_rates.db');
        this.db = null;
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ Database connection failed:', err);
                    reject(err);
                } else {
                    console.log('✅ Database connected');
                    resolve();
                }
            });
        });
    }

    /**
     * Search for a city (complete travel rates)
     * GUARANTEED to find Canberra!
     */
    async searchCity(searchTerm) {
        const query = `
            SELECT * FROM travel_rates
            WHERE LOWER(city_name) LIKE LOWER(?) 
            OR LOWER(city_key) LIKE LOWER(?)
            OR LOWER(country) LIKE LOWER(?)
            OR LOWER(province) LIKE LOWER(?)
            ORDER BY 
                CASE 
                    WHEN LOWER(city_name) = LOWER(?) THEN 1
                    WHEN LOWER(city_key) = LOWER(?) THEN 2
                    WHEN LOWER(city_name) LIKE LOWER(?) THEN 3
                    ELSE 4
                END
            LIMIT 10
        `;

        const term = `%${searchTerm}%`;
        const exactTerm = searchTerm.toLowerCase();
        const likeTerm = `${searchTerm.toLowerCase()}%`;

        return new Promise((resolve, reject) => {
            this.db.all(query, [term, term, term, term, exactTerm, exactTerm, likeTerm], (err, rows) => {
                if (err) reject(err);
                else resolve(rows ? rows.map(row => this.formatTravelRate(row)) : []);
            });
        });
    }

    /**
     * Get complete travel rate by exact city key
     */
    async getAccommodationRate(cityKey) {
        const query = `SELECT * FROM travel_rates WHERE LOWER(city_key) = LOWER(?) LIMIT 1`;

        return new Promise((resolve, reject) => {
            this.db.get(query, [cityKey], (err, row) => {
                if (err) reject(err);
                else resolve(row ? this.formatTravelRate(row) : null);
            });
        });
    }

    /**
     * Get accommodation rate for a specific month
     */
    async getMonthlyRate(cityKey, month) {
        const rate = await this.getAccommodationRate(cityKey);
        
        if (!rate) return null;

        const monthIndex = month - 1; // 0-based index
        return {
            city: rate.name,
            month: month,
            rate: rate.monthlyRates[monthIndex],
            currency: rate.currency
        };
    }

    /**
     * Full-text search across all cities
     */
    async fullTextSearch(searchTerm) {
        const query = `
            SELECT a.* FROM travel_rates a
            WHERE a.id IN (
                SELECT rowid FROM travel_search 
                WHERE travel_search MATCH ?
            )
            ORDER BY 
                CASE 
                    WHEN LOWER(a.city_name) = LOWER(?) THEN 1
                    ELSE 2
                END
            LIMIT 20
        `;

        return new Promise((resolve, reject) => {
            this.db.all(query, [searchTerm, searchTerm], (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(row => this.formatTravelRate(row)));
            });
        });
    }

    /**
     * Format complete travel rate for API response
     */
    formatTravelRate(row) {
        return {
            cityKey: row.city_key,
            name: row.city_name,
            province: row.province,
            country: row.country,
            region: row.region,
            currency: row.currency,
            accommodation: {
                monthly: [
                    row.jan_accommodation, row.feb_accommodation, row.mar_accommodation, 
                    row.apr_accommodation, row.may_accommodation, row.jun_accommodation,
                    row.jul_accommodation, row.aug_accommodation, row.sep_accommodation, 
                    row.oct_accommodation, row.nov_accommodation, row.dec_accommodation
                ],
                standard: row.standard_accommodation
            },
            meals: {
                breakfast: row.breakfast,
                lunch: row.lunch,
                dinner: row.dinner,
                total: row.total_meals
            },
            incidentals: row.incidentals,
            totalDailyAllowance: row.total_daily_allowance,
            fullDayCost: parseFloat(row.standard_accommodation || row.jan_accommodation) + parseFloat(row.total_daily_allowance),
            isInternational: row.is_international === 1
        };
    }

    /**
     * Legacy format for backward compatibility
     */
    formatAccommodationRate(row) {
        return {
            cityKey: row.city_key,
            name: row.city_name,
            province: row.province,
            country: row.country,
            region: row.region,
            currency: row.currency,
            monthlyRates: [
                row.jan_accommodation || row.jan_rate, 
                row.feb_accommodation || row.feb_rate, 
                row.mar_accommodation || row.mar_rate, 
                row.apr_accommodation || row.apr_rate,
                row.may_accommodation || row.may_rate, 
                row.jun_accommodation || row.jun_rate, 
                row.jul_accommodation || row.jul_rate, 
                row.aug_accommodation || row.aug_rate,
                row.sep_accommodation || row.sep_rate, 
                row.oct_accommodation || row.oct_rate, 
                row.nov_accommodation || row.nov_rate, 
                row.dec_accommodation || row.dec_rate
            ],
            standardRate: row.standard_accommodation || row.standard_rate,
            isInternational: row.is_international === 1,
            effectiveDate: row.effective_date
        };
    }

    /**
     * List all cities by region
     */
    async getCitiesByRegion(region) {
        const query = `
            SELECT * FROM travel_rates 
            WHERE region = ? 
            ORDER BY city_name
        `;

        return new Promise((resolve, reject) => {
            this.db.all(query, [region], (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(row => this.formatAccommodationRate(row)));
            });
        });
    }

    /**
     * List all cities by country
     */
    async getCitiesByCountry(country) {
        const query = `
            SELECT * FROM travel_rates 
            WHERE LOWER(country) = LOWER(?) 
            ORDER BY city_name
        `;

        return new Promise((resolve, reject) => {
            this.db.all(query, [country], (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(row => this.formatAccommodationRate(row)));
            });
        });
    }

    /**
     * Get all available regions
     */
    async getAllRegions() {
        const query = `SELECT DISTINCT region FROM travel_rates ORDER BY region`;

        return new Promise((resolve, reject) => {
            this.db.all(query, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(row => row.region));
            });
        });
    }

    /**
     * Get all available countries
     */
    async getAllCountries() {
        const query = `SELECT DISTINCT country FROM travel_rates ORDER BY country`;

        return new Promise((resolve, reject) => {
            this.db.all(query, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(row => row.country));
            });
        });
    }

    /**
     * Autocomplete for city search
     */
    async autocomplete(prefix, limit = 10) {
        const query = `
            SELECT city_name, country, region FROM travel_rates
            WHERE LOWER(city_name) LIKE LOWER(?)
            ORDER BY 
                CASE 
                    WHEN LOWER(city_name) LIKE LOWER(?) THEN 1
                    ELSE 2
                END,
                city_name
            LIMIT ?
        `;

        const term = `${prefix}%`;
        const exactTerm = `${prefix}`;

        return new Promise((resolve, reject) => {
            this.db.all(query, [term, exactTerm, limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    /**
     * Get all per-diem rates
     */
    async getAllPerDiemRates() {
        const query = `
            SELECT country, city_name as city, breakfast, lunch, dinner, 
                   incidentals, currency
            FROM travel_rates
            WHERE country IS NOT NULL 
            AND country != 'Canada'
            ORDER BY country, city_name
        `;

        return new Promise((resolve, reject) => {
            this.db.all(query, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    /**
     * Get all accommodation rates
     */
    async getAllAccommodations() {
        const query = `
            SELECT city_name as city, province, accommodation_rate as rate, currency
            FROM travel_rates
            WHERE country = 'Canada'
            AND accommodation_rate IS NOT NULL
            ORDER BY province, city_name
        `;

        return new Promise((resolve, reject) => {
            this.db.all(query, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    /**
     * Get statistics
     */
    async getStats() {
        const queries = {
            countries: `SELECT COUNT(DISTINCT country) as count FROM travel_rates WHERE country != 'Canada'`,
            accommodations: `SELECT COUNT(*) as count FROM travel_rates WHERE country = 'Canada' AND accommodation_rate IS NOT NULL`,
            perDiem: `SELECT COUNT(*) as count FROM travel_rates WHERE country != 'Canada'`,
        };

        const results = {};
        for (const [key, query] of Object.entries(queries)) {
            results[key] = await new Promise((resolve, reject) => {
                this.db.get(query, [], (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                });
            });
        }
        return results;
    }

    close() {
        if (this.db) {
            this.db.close();
            console.log('✅ Database connection closed');
        }
    }
}

module.exports = new DatabaseService();
