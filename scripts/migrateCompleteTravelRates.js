const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");
// Country to currency mapping based on NJC Appendix D
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

  // CAD countries
  Canada: "CAD",

  // AUD countries
  Australia: "AUD",

  // USD countries (Americas & others)
  "United States": "USD",
  USA: "USD",
  Mexico: "USD",
  Belize: "USD",
  "Central America": "USD",
  "Costa Rica": "USD",
  Guatemala: "USD",
  Honduras: "USD",
  Nicaragua: "USD",
  Panama: "USD",
  "El Salvador": "USD",
  Caribbean: "USD",
  "Antigua and Barbuda": "USD",
  Bahamas: "USD",
  Barbados: "USD",
  Bermuda: "USD",
  Dominica: "USD",
  "Dominican Republic": "USD",
  Grenada: "USD",
  Haiti: "USD",
  Jamaica: "USD",
  "St. Kitts": "USD",
  "St. Lucia": "USD",
  "St. Vincent": "USD",
  "Trinidad and Tobago": "USD",
  "Turks and Caicos": "USD",
  Anguilla: "USD",
  Montserrat: "USD",
  "Virgin Islands": "USD",
  Aruba: "USD",
  Curacao: "USD",
  "Sint Maarten": "USD",
  Bonaire: "USD",
  Colombia: "USD",
  Ecuador: "USD",
  Guyana: "USD",
  Suriname: "USD",
  Venezuela: "USD",
  Peru: "USD",
  Bolivia: "USD",
  Paraguay: "USD",
  Brazil: "USD",
  Chile: "USD",
  "Middle East": "USD",
  Afghanistan: "USD",
  Armenia: "USD",
  Azerbaijan: "USD",
  Bahrain: "USD",
  Georgia: "USD",
  Iran: "USD",
  Iraq: "USD",
  Israel: "USD",
  Jordan: "USD",
  Kuwait: "USD",
  Lebanon: "USD",
  Oman: "USD",
  Qatar: "USD",
  "Saudi Arabia": "USD",
  Syria: "USD",
  Turkey: "USD",
  "United Arab Emirates": "USD",
  Yemen: "USD",
  Pakistan: "USD",
  India: "USD",
  Bangladesh: "USD",
  "Sri Lanka": "USD",
  Nepal: "USD",
  Bhutan: "USD",
  Myanmar: "USD",
  Thailand: "USD",
  Laos: "USD",
  Vietnam: "USD",
  Cambodia: "USD",
  Malaysia: "USD",
  Singapore: "USD",
  Indonesia: "USD",
  Philippines: "USD",
  "East Timor": "USD",
  "Papua New Guinea": "USD",
  "Solomon Islands": "USD",
  Vanuatu: "USD",
  Fiji: "USD",
  Kiribati: "USD",
  "Marshall Islands": "USD",
  Micronesia: "USD",
  Nauru: "USD",
  Palau: "USD",
  Samoa: "USD",
  Tonga: "USD",
  Tuvalu: "USD",
  "Hong Kong": "USD",
  Taiwan: "USD",
  Japan: "USD",
  "South Korea": "USD",
  "North Korea": "USD",
  Mongolia: "USD",
  China: "USD",
  "North Africa": "USD",
  Algeria: "CAD",
  Egypt: "USD",
  Libya: "USD",
  Morocco: "USD",
  Tunisia: "USD",
  Sudan: "USD",
  "Western Sahara": "USD",
  "Sub-Saharan Africa": "USD",
  Angola: "CAD",
  Benin: "USD",
  Botswana: "USD",
  "Burkina Faso": "USD",
  Burundi: "USD",
  Cameroon: "USD",
  "Cape Verde": "USD",
  "Central African Republic": "USD",
  Chad: "USD",
  Comoros: "USD",
  Congo: "USD",
  "Côte d'Ivoire": "USD",
  Djibouti: "USD",
  "Equatorial Guinea": "USD",
  Eritrea: "USD",
  Ethiopia: "USD",
  Gabon: "USD",
  Gambia: "USD",
  Ghana: "USD",
  Guinea: "USD",
  "Guinea-Bissau": "USD",
  Kenya: "USD",
  Lesotho: "USD",
  Liberia: "USD",
  Madagascar: "USD",
  Malawi: "USD",
  Mali: "USD",
  Mauritania: "USD",
  Mauritius: "USD",
  Mozambique: "USD",
  Namibia: "USD",
  Niger: "USD",
  Nigeria: "USD",
  Rwanda: "USD",
  Senegal: "USD",
  Seychelles: "USD",
  "Sierra Leone": "USD",
  Somalia: "USD",
  "South Africa": "USD",
  "South Sudan": "USD",
  Tanzania: "USD",
  Togo: "USD",
  Uganda: "USD",
  Zambia: "USD",
  Zimbabwe: "USD",
  Réunion: "EUR",
  Mayotte: "EUR",
  Canberra: "AUD",
};

function getCurrencyForCountry(country) {
  return COUNTRY_CURRENCY_MAP[country] || "USD"; // Default to USD if not found
}
class CompleteTravelMigration {
  constructor() {
    this.dbPath = path.join(__dirname, "..", "database", "travel_rates.db");
    this.db = null;
  }

  async migrate() {
    console.log("🚀 Starting COMPLETE travel rates migration...\n");

    try {
      await this.openDatabase();
      await this.createComprehensiveSchema();
      await this.importAllData();
      await this.displayStats();

      console.log("\n✅ Complete migration successful!");
      console.log(`📊 Database: ${this.dbPath}`);
    } catch (error) {
      console.error("❌ Migration failed:", error);
      throw error;
    } finally {
      if (this.db) {
        this.db.close();
      }
    }
  }

  openDatabase() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) reject(err);
        else {
          console.log("✅ Database connection opened");
          resolve();
        }
      });
    });
  }

  async createComprehensiveSchema() {
    console.log("📋 Creating comprehensive schema...");

    const schema = `
            DROP TABLE IF EXISTS travel_rates;
            DROP TABLE IF EXISTS travel_search;
            
            CREATE TABLE travel_rates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                city_key TEXT UNIQUE NOT NULL,
                city_name TEXT NOT NULL,
                province TEXT,
                country TEXT NOT NULL,
                region TEXT NOT NULL,
                currency TEXT NOT NULL,
                
                -- Accommodation rates (monthly)
                jan_accommodation REAL NOT NULL,
                feb_accommodation REAL NOT NULL,
                mar_accommodation REAL NOT NULL,
                apr_accommodation REAL NOT NULL,
                may_accommodation REAL NOT NULL,
                jun_accommodation REAL NOT NULL,
                jul_accommodation REAL NOT NULL,
                aug_accommodation REAL NOT NULL,
                sep_accommodation REAL NOT NULL,
                oct_accommodation REAL NOT NULL,
                nov_accommodation REAL NOT NULL,
                dec_accommodation REAL NOT NULL,
                standard_accommodation REAL,
                
                -- Meal rates (per diem)
                breakfast REAL NOT NULL,
                lunch REAL NOT NULL,
                dinner REAL NOT NULL,
                total_meals REAL NOT NULL,
                incidentals REAL NOT NULL,
                total_daily_allowance REAL NOT NULL,
                
                -- Additional info
                is_international BOOLEAN DEFAULT 0,
                effective_date DATE DEFAULT '2025-01-01',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_travel_city ON travel_rates(city_name);
            CREATE INDEX IF NOT EXISTS idx_travel_country ON travel_rates(country);
            CREATE INDEX IF NOT EXISTS idx_travel_region ON travel_rates(region);
            CREATE INDEX IF NOT EXISTS idx_travel_key ON travel_rates(city_key);

            CREATE VIRTUAL TABLE IF NOT EXISTS travel_search USING fts5(
                city_key,
                city_name,
                province,
                country,
                region,
                content='travel_rates'
            );
        `;

    return new Promise((resolve, reject) => {
      this.db.exec(schema, (err) => {
        if (err) reject(err);
        else {
          console.log("✅ Comprehensive schema created");
          resolve();
        }
      });
    });
  }

  async importAllData() {
    console.log("📥 Importing all travel data...\n");

    // Load accommodation data
    const accomPath = path.join(
      __dirname,
      "..",
      "data",
      "accommodationRates.json"
    );
    const perDiemPath = path.join(__dirname, "..", "data", "perDiemRates.json");

    if (!fs.existsSync(accomPath)) {
      throw new Error("accommodationRates.json not found");
    }
    if (!fs.existsSync(perDiemPath)) {
      throw new Error("perDiemRates.json not found");
    }

    const accomData = JSON.parse(fs.readFileSync(accomPath, "utf8"));
    const perDiemData = JSON.parse(fs.readFileSync(perDiemPath, "utf8"));

    let imported = 0;

    // Import Canadian cities
    if (accomData.cities) {
      console.log("   🇨🇦 Importing Canadian cities...");
      const canadaMeals = perDiemData.regions.canada.meals;
      const canadaIncidentals = perDiemData.regions.canada.incidentals.rate100;

      for (const [key, city] of Object.entries(accomData.cities)) {
        try {
          await this.insertTravelRate({
            city_key: key,
            city_name: city.name,
            province: city.province,
            country: "Canada",
            region: city.region,
            currency: "CAD",
            accommodation_rates: city.monthlyRates,
            breakfast: canadaMeals.breakfast.rate100,
            lunch: canadaMeals.lunch.rate100,
            dinner: canadaMeals.dinner.rate100,
            total_meals: canadaMeals.total.rate100,
            incidentals: canadaIncidentals,
            total_daily: perDiemData.regions.canada.dailyTotal.rate100,
            is_international: 0,
          });
          imported++;
          if (imported % 50 === 0) {
            console.log(`      ... ${imported} cities imported`);
          }
        } catch (err) {
          console.error(`   ⚠️  Failed to import ${city.name}:`, err.message);
        }
      }
      console.log(`   ✅ Imported ${imported} Canadian cities`);
    }

    // Import international cities
    if (accomData.internationalCities) {
      console.log("   🌍 Importing international cities...");
      const intlMeals = perDiemData.regions.usa.meals; // USA rates same as intl
      const intlIncidentals = perDiemData.regions.usa.incidentals.rate100;

      let intlCount = 0;
      for (const [key, city] of Object.entries(accomData.internationalCities)) {
        try {
          const rates = city.monthlyRates || Array(12).fill(city.standardRate);

          // Determine currency: always use country mapping (which is most authoritative)
          // Only use explicit city.currency if it's already been manually verified/set (non-USD entries with specific EUR values)
          let cityCurrency;
          if (city.currency === "EUR" || city.currency === "CAD") {
            // These are explicitly set in JSON (like Riga, Paris, Tallinn) - keep them
            cityCurrency = city.currency;
          } else {
            // Default to country mapping for USD and missing values
            cityCurrency = getCurrencyForCountry(city.country);
          }

          // Use city-specific meals if available, otherwise use regional rates
          const breakfast =
            city.meals?.breakfast || intlMeals.breakfast.rate100;
          const lunch = city.meals?.lunch || intlMeals.lunch.rate100;
          const dinner = city.meals?.dinner || intlMeals.dinner.rate100;
          const totalMeals = city.meals?.total || breakfast + lunch + dinner;
          const incidentals =
            city.incidentals !== undefined ? city.incidentals : intlIncidentals;

          await this.insertTravelRate({
            city_key: key,
            city_name: city.name,
            province: null,
            country: city.country,
            region: city.region,
            currency: cityCurrency,
            accommodation_rates: rates,
            standard_accommodation: city.standardRate || rates[0],
            breakfast: breakfast,
            lunch: lunch,
            dinner: dinner,
            total_meals: totalMeals,
            incidentals: incidentals,
            total_daily:
              parseFloat(city.standardRate || rates[0]) +
              totalMeals +
              incidentals,
            is_international: 1,
          });
          intlCount++;
          if (intlCount % 30 === 0) {
            console.log(`      ... ${intlCount} international cities imported`);
          }
        } catch (err) {
          console.error(`   ⚠️  Failed to import ${city.name}:`, err.message);
        }
      }
      console.log(`   ✅ Imported ${intlCount} international cities`);
      imported += intlCount;
    }

    // Add Canberra with meal rates
    console.log("   🇦🇺 Adding Canberra with meal rates...");
    try {
      const intlMeals = perDiemData.regions.usa.meals;
      const intlIncidentals = perDiemData.regions.usa.incidentals.rate100;

      await this.insertTravelRate({
        city_key: "canberra",
        city_name: "Canberra",
        province: null,
        country: "Australia",
        region: "Oceania",
        currency: "AUD",
        accommodation_rates: [
          184, 184, 184, 184, 184, 184, 184, 184, 184, 184, 184, 184,
        ],
        standard_accommodation: 184,
        breakfast: intlMeals.breakfast.rate100,
        lunch: intlMeals.lunch.rate100,
        dinner: intlMeals.dinner.rate100,
        total_meals: intlMeals.total.rate100,
        incidentals: intlIncidentals,
        total_daily: perDiemData.regions.usa.dailyTotal.rate100,
        is_international: 1,
      });
      console.log("   ✅ Canberra added with complete rates");
    } catch (err) {
      if (!err.message.includes("UNIQUE")) {
        throw err;
      }
    }

    console.log(`\n✅ Total imported: ${imported} cities with complete data`);
  }

  async insertTravelRate(data) {
    return new Promise((resolve, reject) => {
      const sql = `
                INSERT OR REPLACE INTO travel_rates (
                    city_key, city_name, province, country, region, currency,
                    jan_accommodation, feb_accommodation, mar_accommodation, 
                    apr_accommodation, may_accommodation, jun_accommodation,
                    jul_accommodation, aug_accommodation, sep_accommodation, 
                    oct_accommodation, nov_accommodation, dec_accommodation,
                    standard_accommodation,
                    breakfast, lunch, dinner, total_meals,
                    incidentals, total_daily_allowance, is_international
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

      this.db.run(
        sql,
        [
          data.city_key,
          data.city_name,
          data.province,
          data.country,
          data.region,
          data.currency,
          ...data.accommodation_rates,
          data.standard_accommodation || data.accommodation_rates[0],
          data.breakfast,
          data.lunch,
          data.dinner,
          data.total_meals,
          data.incidentals,
          data.total_daily,
          data.is_international,
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async displayStats() {
    console.log("\n📊 Database Statistics:");

    const total = await this.getCount(
      "SELECT COUNT(*) as count FROM travel_rates"
    );
    console.log(`   Total cities: ${total}`);

    const canadian = await this.getCount(
      "SELECT COUNT(*) as count FROM travel_rates WHERE is_international = 0"
    );
    console.log(`   Canadian: ${canadian}`);

    const international = await this.getCount(
      "SELECT COUNT(*) as count FROM travel_rates WHERE is_international = 1"
    );
    console.log(`   International: ${international}`);

    const canberra = await this.getRow(
      'SELECT * FROM travel_rates WHERE city_key = "canberra"'
    );
    if (canberra) {
      console.log(`   \n   ✅ Canberra Complete Data:`);
      console.log(
        `      Accommodation: $${canberra.standard_accommodation} USD/night`
      );
      console.log(`      Breakfast: $${canberra.breakfast}`);
      console.log(`      Lunch: $${canberra.lunch}`);
      console.log(`      Dinner: $${canberra.dinner}`);
      console.log(`      Incidentals: $${canberra.incidentals}`);
      console.log(`      Total Daily: $${canberra.total_daily_allowance}`);
    }
  }

  getCount(sql) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, [], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
  }

  getRow(sql) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
}

// Run migration
const migration = new CompleteTravelMigration();
migration.migrate().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
