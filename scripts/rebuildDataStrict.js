const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

// Country to currency mapping
const COUNTRY_CURRENCY_MAP = {
    // EUR countries (European)
    Austria: "EUR",
    Belgium: "EUR",
    Bulgaria: "EUR",
    Croatia: "EUR",
    Cyprus: "EUR",
    "Czech Republic": "EUR",
    Denmark: "EUR",
    Estonia: "EUR",
    Finland: "EUR",
    France: "EUR",
    Germany: "EUR",
    Greece: "EUR",
    Hungary: "EUR",
    Ireland: "EUR",
    Italy: "EUR",
    Latvia: "EUR",
    Lithuania: "EUR",
    Luxembourg: "EUR",
    Malta: "EUR",
    Netherlands: "EUR",
    Poland: "EUR",
    Portugal: "EUR",
    Romania: "EUR",
    Slovakia: "EUR",
    Slovenia: "EUR",
    Spain: "EUR",
    Sweden: "EUR",
    Albania: "EUR",
    Andorra: "EUR",
    "Bosnia and Herzegovina": "EUR",
    Kosovo: "EUR",
    Montenegro: "EUR",
    "North Macedonia": "EUR",
    Serbia: "EUR",
    Ukraine: "EUR",
    Moldova: "EUR",
    Iceland: "EUR",
    Norway: "EUR",
    Switzerland: "EUR",
    Azores: "EUR",
    Madeira: "EUR",
    "United Kingdom": "GBP",
    UK: "GBP",
    GreatBritain: "GBP",

    // CAD countries
    Canada: "CAD",

    // AUD countries
    Australia: "AUD",

    // USD countries (Americas & others default to USD if not specified)
    "United States": "USD",
    USA: "USD",
    Mexico: "USD",
};

function getCurrencyForCountry(country) {
    // Strict check
    if (COUNTRY_CURRENCY_MAP[country]) return COUNTRY_CURRENCY_MAP[country];
    return "USD"; // Default world currency
}

class StrictRebuilder {
    constructor() {
        this.dbPath = path.join(__dirname, "..", "database", "travel_rates.db");
        this.db = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async rebuild() {
        await this.connect();
        console.log("🔥 Connected to database. Starting WIPE and REBUILD...");

        await this.dropTables();
        await this.createTables();
        await this.importData();

        console.log("✅ Rebuild Complete.");
        this.db.close();
    }

    async dropTables() {
        console.log("💥 Wiping old tables...");
        const queries = [
            "DROP TABLE IF EXISTS travel_rates", // Legacy
            "DROP TABLE IF EXISTS accommodations",
            "DROP TABLE IF EXISTS per_diems",
            "DROP TABLE IF EXISTS travel_search" // FTS
        ];

        for (const q of queries) {
            await this.run(q);
        }
    }

    async createTables() {
        console.log("🏗️ Creating new Dual-Set Schema...");

        // Set 1: Accommodations (Strict USD/CAD)
        await this.run(`
      CREATE TABLE accommodations (
        city_key TEXT PRIMARY KEY,
        city_name TEXT NOT NULL,
        province TEXT,
        country TEXT NOT NULL,
        region TEXT NOT NULL,
        currency TEXT NOT NULL, -- STRICTLY USD or CAD
        standard_rate REAL,
        jan_rate REAL, feb_rate REAL, mar_rate REAL, apr_rate REAL,
        may_rate REAL, jun_rate REAL, jul_rate REAL, aug_rate REAL,
        sep_rate REAL, oct_rate REAL, nov_rate REAL, dec_rate REAL,
        effective_date TEXT
      )
    `);

        // Set 2: Per Diems (Strict Local Currency)
        await this.run(`
      CREATE TABLE per_diems (
        city_key TEXT PRIMARY KEY, -- Matches accommodation key
        city_name TEXT NOT NULL,
        country TEXT NOT NULL,
        region TEXT NOT NULL,
        currency TEXT NOT NULL, -- Local Currency (EUR, GBP, etc)
        breakfast REAL,
        lunch REAL,
        dinner REAL,
        incidentals REAL,
        total_daily REAL
      )
    `);

        // FTS for searching
        await this.run(`
        CREATE VIRTUAL TABLE IF NOT EXISTS travel_search USING fts5(
            city_key, city_name, country, region,
            content='accommodations'
        )
    `);
    }

    async importData() {
        console.log("📥 Importing Data...");

        const accomPath = path.join(__dirname, "..", "data", "accommodationRates.json");
        const perDiemPath = path.join(__dirname, "..", "data", "perDiemRates.json");

        const accomData = JSON.parse(fs.readFileSync(accomPath, "utf8"));
        const perDiemData = JSON.parse(fs.readFileSync(perDiemPath, "utf8"));

        // Prepare statements
        const insertAccom = this.db.prepare(`
      INSERT INTO accommodations VALUES (?,?,?,?,?,?, ?, ?,?,?,?,?,?,?,?,?,?,?,?, ?)
    `);
        const insertPerDiem = this.db.prepare(`
      INSERT INTO per_diems VALUES (?,?,?,?,?, ?,?,?,?,?)
    `);

        // Helper to process a city
        const processCity = (key, city, isCanada = false) => {
            // --- SET 1: ACCOMMODATION ---
            // Rule: Canada = CAD, World = USD
            const accomCurrency = (isCanada || city.country === "Canada") ? "CAD" : "USD";
            const rates = city.monthlyRates || Array(12).fill(city.standardRate || 0);

            insertAccom.run(
                key, city.name, city.province || null, city.country, city.region,
                accomCurrency,
                city.standardRate || rates[0],
                rates[0], rates[1], rates[2], rates[3], rates[4], rates[5],
                rates[6], rates[7], rates[8], rates[9], rates[10], rates[11],
                "2024-01-01"
            );

            // --- SET 2: PER DIEM ---
            // Rule: Local Currency
            let perDiemCurrency = getCurrencyForCountry(city.country);
            if (city.currency && city.currency !== "USD") {
                perDiemCurrency = city.currency; // Override
            } else if (isCanada) {
                perDiemCurrency = "CAD";
            }

            // Get rates (defaults or override)
            let meals = null;
            let incidentals = 0;

            if (isCanada) {
                meals = perDiemData.regions.canada.meals;
                incidentals = perDiemData.regions.canada.incidentals.rate100;
            } else {
                // International default (mostly USD base in JSON, but we map currency label)
                // Note: If JSON has "25" for Breakfast in France and map says "EUR", we assume 25 EUR.
                // As per user instruction "data set can be [in] any currency"
                const regionKey = city.country === "United States" ? "usa" : "international";
                // Fallback to USA/Intl rates if city specific not present
                const baseMeals = perDiemData.regions.usa.meals; // Using USA as base struct

                if (city.meals) {
                    meals = {
                        breakfast: { rate100: city.meals.breakfast },
                        lunch: { rate100: city.meals.lunch },
                        dinner: { rate100: city.meals.dinner },
                        total: { rate100: city.meals.total }
                    };
                } else {
                    meals = baseMeals;
                }

                if (city.incidentals) {
                    incidentals = city.incidentals;
                } else {
                    incidentals = perDiemData.regions.usa.incidentals.rate100;
                }
            }

            const totalDaily = meals.breakfast.rate100 + meals.lunch.rate100 + meals.dinner.rate100 + incidentals;

            insertPerDiem.run(
                key, city.name, city.country, city.region,
                perDiemCurrency,
                meals.breakfast.rate100,
                meals.lunch.rate100,
                meals.dinner.rate100,
                incidentals,
                totalDaily
            );
        };

        this.db.serialize(() => {
            this.db.run("BEGIN TRANSACTION");

            // Canadian Cities
            if (accomData.cities) {
                console.log("   Processing Canada...");
                for (const [key, city] of Object.entries(accomData.cities)) {
                    processCity(key, { ...city, country: "Canada", region: "Canada" }, true);
                }
            }

            // International Cities
            if (accomData.internationalCities) {
                console.log("   Processing International...");
                for (const [key, city] of Object.entries(accomData.internationalCities)) {
                    processCity(key, city, false);
                }
            }

            this.db.run("COMMIT");
            insertAccom.finalize();
            insertPerDiem.finalize();
        });
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    }
}

new StrictRebuilder().rebuild().catch(err => {
    console.error("❌ Rebuild Failed:", err);
    process.exit(1);
});
