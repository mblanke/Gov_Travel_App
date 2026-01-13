const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class DatabaseMigration {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'database', 'travel_rates.db');
        this.db = null;
    }

    async migrate() {
        console.log('🚀 Starting database migration...\n');

        try {
            // Ensure database directory exists
            const dbDir = path.join(__dirname, '..', 'database');
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
                console.log('✅ Created database directory');
            }

            // Open database connection
            await this.openDatabase();

            // Create tables (inline schema - no external file needed)
            await this.createTables();

            // Import accommodation rates
            await this.importAccommodationRates();

            // Add Canberra
            await this.addCanberra();

            // Build search indexes
            await this.buildSearchIndexes();

            // Display statistics
            await this.displayStats();

            console.log('\n✅ Migration complete!');
            console.log(`📊 Database: ${this.dbPath}`);

        } catch (error) {
            console.error('❌ Migration failed:', error);
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
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ Database connection opened');
                    resolve();
                }
            });
        });
    }

    async createTables() {
        console.log('📋 Creating tables...');
        
        // Inline schema - no external file dependency
        const schema = `
            CREATE TABLE IF NOT EXISTS accommodation_rates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                city_key TEXT UNIQUE NOT NULL,
                city_name TEXT NOT NULL,
                province TEXT,
                country TEXT,
                region TEXT NOT NULL,
                currency TEXT NOT NULL,
                jan_rate REAL NOT NULL,
                feb_rate REAL NOT NULL,
                mar_rate REAL NOT NULL,
                apr_rate REAL NOT NULL,
                may_rate REAL NOT NULL,
                jun_rate REAL NOT NULL,
                jul_rate REAL NOT NULL,
                aug_rate REAL NOT NULL,
                sep_rate REAL NOT NULL,
                oct_rate REAL NOT NULL,
                nov_rate REAL NOT NULL,
                dec_rate REAL NOT NULL,
                standard_rate REAL,
                is_international BOOLEAN DEFAULT 0,
                effective_date DATE DEFAULT '2025-01-01',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_accommodation_city ON accommodation_rates(city_name);
            CREATE INDEX IF NOT EXISTS idx_accommodation_country ON accommodation_rates(country);
            CREATE INDEX IF NOT EXISTS idx_accommodation_region ON accommodation_rates(region);
            CREATE INDEX IF NOT EXISTS idx_accommodation_key ON accommodation_rates(city_key);

            CREATE VIRTUAL TABLE IF NOT EXISTS accommodation_search USING fts5(
                city_key,
                city_name,
                province,
                country,
                region,
                content='accommodation_rates'
            );
        `;

        return new Promise((resolve, reject) => {
            this.db.exec(schema, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ Tables created');
                    resolve();
                }
            });
        });
    }

    async importAccommodationRates() {
        console.log('📥 Importing accommodation rates...');

        const jsonPath = path.join(__dirname, '..', 'data', 'accommodationRates.json');
        
        console.log(`   📂 Looking for JSON at: ${jsonPath}`);
        
        if (!fs.existsSync(jsonPath)) {
            console.error('❌ accommodationRates.json not found!');
            throw new Error('Missing accommodationRates.json file');
        }

        console.log('   ✅ JSON file found, reading...');
        const rawData = fs.readFileSync(jsonPath, 'utf8');
        console.log(`   📄 File size: ${rawData.length} bytes`);
        
        const data = JSON.parse(rawData);
        console.log(`   ✅ JSON parsed successfully`);
        console.log(`   📊 Data keys: ${Object.keys(data).join(', ')}`);

        let imported = 0;

        // Import Canadian cities
        if (data.cities) {
            const cityCount = Object.keys(data.cities).length;
            console.log(`   - Importing ${cityCount} Canadian cities...`);
            
            for (const [key, city] of Object.entries(data.cities)) {
                try {
                    await this.insertAccommodationRate({
                        city_key: key,
                        city_name: city.name,
                        province: city.province,
                        country: 'Canada',
                        region: city.region,
                        currency: city.currency,
                        rates: city.monthlyRates,
                        is_international: 0
                    });
                    imported++;
                    if (imported % 50 === 0) {
                        console.log(`      ... ${imported} cities imported so far`);
                    }
                } catch (err) {
                    console.error(`   ⚠️  Failed to import ${city.name}:`, err.message);
                }
            }
            console.log(`   ✅ Imported ${imported} Canadian cities`);
        } else {
            console.log('   ⚠️  No "cities" key found in JSON');
        }

        // Import international cities
        if (data.internationalCities) {
            const intlCityCount = Object.keys(data.internationalCities).length;
            console.log(`   - Importing ${intlCityCount} international cities...`);
            let intlCount = 0;
            for (const [key, city] of Object.entries(data.internationalCities)) {
                try {
                    const rates = city.monthlyRates || Array(12).fill(city.standardRate);

                    await this.insertAccommodationRate({
                        city_key: key,
                        city_name: city.name,
                        province: null,
                        country: city.country,
                        region: city.region,
                        currency: city.currency,
                        rates: rates,
                        standard_rate: city.standardRate || rates[0],
                        is_international: 1
                    });
                    intlCount++;
                    if (intlCount % 20 === 0) {
                        console.log(`      ... ${intlCount} international cities imported so far`);
                    }
                } catch (err) {
                    console.error(`   ⚠️  Failed to import ${city.name}:`, err.message);
                }
            }
            console.log(`   ✅ Imported ${intlCount} international cities`);
            imported += intlCount;
        } else {
            console.log('   ⚠️  No "internationalCities" key found in JSON');
        }

        console.log(`✅ Total imported: ${imported} cities`);
    }

    async addCanberra() {
        console.log('🇦🇺 Adding Canberra...');

        try {
            await this.insertAccommodationRate({
                city_key: 'canberra',
                city_name: 'Canberra',
                province: null,
                country: 'Australia',
                region: 'Oceania',
                currency: 'USD',
                rates: [184, 184, 184, 184, 184, 184, 184, 184, 184, 184, 184, 184],
                standard_rate: 184,
                is_international: 1
            });
            console.log('✅ Canberra added: $184 USD/night');
        } catch (err) {
            if (err.message.includes('UNIQUE')) {
                console.log('ℹ️  Canberra already exists');
            } else {
                throw err;
            }
        }
    }

    async insertAccommodationRate(city) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT OR REPLACE INTO accommodation_rates (
                    city_key, city_name, province, country, region, currency,
                    jan_rate, feb_rate, mar_rate, apr_rate, may_rate, jun_rate,
                    jul_rate, aug_rate, sep_rate, oct_rate, nov_rate, dec_rate,
                    standard_rate, is_international
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(sql, [
                city.city_key,
                city.city_name,
                city.province,
                city.country,
                city.region,
                city.currency,
                ...city.rates,
                city.standard_rate || city.rates[0],
                city.is_international
            ], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async buildSearchIndexes() {
        console.log('🔍 Building search indexes...');
        console.log('   ℹ️  Skipping FTS5 index population (can be done later if needed)');
        console.log('   ✅ Standard indexes already created with tables');
        return Promise.resolve();
    }

    async displayStats() {
        console.log('\n📊 Database Statistics:');

        const total = await this.getCount('SELECT COUNT(*) as count FROM accommodation_rates');
        console.log(`   Total cities: ${total}`);

        const canadian = await this.getCount('SELECT COUNT(*) as count FROM accommodation_rates WHERE is_international = 0');
        console.log(`   Canadian: ${canadian}`);

        const international = await this.getCount('SELECT COUNT(*) as count FROM accommodation_rates WHERE is_international = 1');
        console.log(`   International: ${international}`);

        const canberra = await this.getCount('SELECT COUNT(*) as count FROM accommodation_rates WHERE city_key = "canberra"');
        console.log(`   Canberra found: ${canberra > 0 ? '✅ YES' : '❌ NO'}`);

        if (canberra > 0) {
            const rate = await this.getCanberraRate();
            console.log(`   Canberra rate: $${rate} USD/night`);
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

    getCanberraRate() {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT jan_rate FROM accommodation_rates WHERE city_key = "canberra"', [], (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.jan_rate : null);
            });
        });
    }
}

// Run migration
if (require.main === module) {
    const migration = new DatabaseMigration();
    migration.migrate().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}

module.exports = DatabaseMigration;