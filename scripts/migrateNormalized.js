/**
 * Migration Script - Populate Normalized Travel Rates Database
 * 
 * This script:
 * 1. Creates all tables from schema.sql
 * 2. Populates regions
 * 3. Imports accommodation limits from accommodationRates.json (Canadian cities)
 * 4. Imports international rates from internationalRates.json (nested country->city format)
 * 5. Populates meal rates from NJC appendix data
 * 6. Populates incidental rates
 * 7. Populates kilometric rates from NJC Appendix B
 * 8. Populates private accommodation rates
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Paths
const DB_PATH = path.join(__dirname, '..', 'database', 'travel_rates.db');
const SCHEMA_PATH = path.join(__dirname, '..', 'database', 'schema.sql');
const DATA_DIR = path.join(__dirname, '..', 'data');

// Load JSON files
const accommodationRatesRaw = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'accommodationRates.json'), 'utf8')
);
const internationalRatesRaw = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'internationalRates.json'), 'utf8')
);

// Extract cities from nested structure
// accommodationRates.json has: { metadata: {...}, cities: { acheson: {...}, ... } }
const accommodationRates = accommodationRatesRaw.cities || accommodationRatesRaw;

// internationalRates.json has: { metadata: {...}, countries: { latvia: { cities: { riga: {...} } }, ... } }
const internationalCountries = internationalRatesRaw.countries || internationalRatesRaw;

console.log('🔄 Starting database migration...\n');
console.log(`   Found ${Object.keys(accommodationRates).length} Canadian cities`);
console.log(`   Found ${Object.keys(internationalCountries).length} international countries\n`);

// Delete existing database
if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('✓ Removed old database');
}

// Create new database and run schema
const db = new Database(DB_PATH);
console.log('✓ Created new database');

// Run schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);
console.log('✓ Schema applied\n');

// =============================================================================
// 1. Populate Regions
// =============================================================================
console.log('📍 Populating regions...');

const regions = [
    { code: 'canada', name: 'Canada (excluding territories)', parent: null, currency: 'CAD', taxes: 0 },
    { code: 'yukon', name: 'Yukon', parent: 'canada', currency: 'CAD', taxes: 0 },
    { code: 'nwt', name: 'Northwest Territories', parent: 'canada', currency: 'CAD', taxes: 0 },
    { code: 'nunavut', name: 'Nunavut', parent: 'canada', currency: 'CAD', taxes: 0 },
    { code: 'usa', name: 'United States (contiguous)', parent: null, currency: 'USD', taxes: 0 },
    { code: 'alaska', name: 'Alaska', parent: 'usa', currency: 'USD', taxes: 0 },
    { code: 'international', name: 'International', parent: null, currency: 'USD', taxes: 1 }
];

const insertRegion = db.prepare(`
    INSERT INTO regions (code, name, parent_code, default_currency, taxes_included)
    VALUES (?, ?, ?, ?, ?)
`);

for (const region of regions) {
    insertRegion.run(region.code, region.name, region.parent, region.currency, region.taxes);
}
console.log(`   ✓ Inserted ${regions.length} regions\n`);

// =============================================================================
// 2. Populate Accommodation Limits
// =============================================================================
console.log('🏨 Populating accommodation limits...');

const insertAccommodation = db.prepare(`
    INSERT INTO accommodation_limits (
        city_key, city_name, province_state, country, region_code, currency,
        jan_rate, feb_rate, mar_rate, apr_rate, may_rate, jun_rate,
        jul_rate, aug_rate, sep_rate, oct_rate, nov_rate, dec_rate,
        default_rate, is_capital
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let accommodationCount = 0;

// Helper to determine region code
function getRegionCode(country, province) {
    if (country !== 'Canada') return 'international';
    const prov = (province || '').toUpperCase();
    if (prov === 'YT' || prov === 'YUKON') return 'yukon';
    if (prov === 'NT' || prov === 'NORTHWEST TERRITORIES') return 'nwt';
    if (prov === 'NU' || prov === 'NUNAVUT') return 'nunavut';
    return 'canada';
}

// Helper to normalize city key
function normalizeKey(name) {
    return name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .trim();
}

// Capital cities
const capitals = [
    'ottawa', 'toronto', 'vancouver', 'montreal', 'quebec_city', 
    'victoria', 'edmonton', 'halifax', 'fredericton', 'winnipeg',
    'regina', 'charlottetown', 'st_johns', 'yellowknife', 
    'whitehorse', 'iqaluit'
];

// Process Canadian accommodation rates
// Structure: { "acheson": { name: "Acheson, AB", province: "Alberta", monthlyRates: [121, 121, ...], currency: "CAD" } }
for (const [key, data] of Object.entries(accommodationRates)) {
    // Skip non-city entries
    if (!data || typeof data !== 'object' || !data.name) {
        continue;
    }
    
    const cityName = data.name || key;
    const province = data.province || null;
    const country = 'Canada';
    const currency = data.currency || 'CAD';
    
    // monthlyRates is an array: [Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec]
    const monthlyRatesArr = data.monthlyRates || [];
    const defaultRate = monthlyRatesArr[0] || data.rate || 100;
    
    const regionCode = getRegionCode(country, province);
    const isCapital = capitals.includes(key);
    
    try {
        insertAccommodation.run(
            key,
            cityName,
            province,
            country,
            regionCode,
            currency,
            monthlyRatesArr[0] || defaultRate,  // jan
            monthlyRatesArr[1] || defaultRate,  // feb
            monthlyRatesArr[2] || defaultRate,  // mar
            monthlyRatesArr[3] || defaultRate,  // apr
            monthlyRatesArr[4] || defaultRate,  // may
            monthlyRatesArr[5] || defaultRate,  // jun
            monthlyRatesArr[6] || defaultRate,  // jul
            monthlyRatesArr[7] || defaultRate,  // aug
            monthlyRatesArr[8] || defaultRate,  // sep
            monthlyRatesArr[9] || defaultRate,  // oct
            monthlyRatesArr[10] || defaultRate, // nov
            monthlyRatesArr[11] || defaultRate, // dec
            defaultRate,
            isCapital ? 1 : 0
        );
        accommodationCount++;
    } catch (err) {
        console.warn(`   ⚠ Skipping duplicate Canadian city: ${key}`);
    }
}

console.log(`   ✓ Inserted ${accommodationCount} Canadian cities`);

// Process International rates (nested: country -> cities -> city data)
// Structure: { "latvia": { name: "Latvia", currency: "EUR", cities: { "riga": { name: "Riga", meals: {...}, accommodation: {...} } } } }
let intlCount = 0;

for (const [countryKey, countryData] of Object.entries(internationalCountries)) {
    if (!countryData || typeof countryData !== 'object' || !countryData.cities) {
        continue;
    }
    
    const countryName = countryData.name || countryKey;
    const countryCurrency = countryData.currency || 'USD';
    
    for (const [cityKey, cityData] of Object.entries(countryData.cities)) {
        if (!cityData || typeof cityData !== 'object') {
            continue;
        }
        
        const cityName = cityData.name || cityKey;
        
        // Get accommodation rate from nested structure
        // Format: cityData.accommodation = { cDay_1_30: 38.59, cDay_31_120: 28.94, ... }
        const accommodation = cityData.accommodation || {};
        const accommodationRate = accommodation.cDay_1_30 || accommodation.cDay_31_120 || 0;
        
        // Skip if no valid accommodation rate
        if (accommodationRate <= 0) {
            continue;
        }
        
        // Create unique key: cityName_countryKey (e.g., "riga_latvia")
        const normalizedKey = normalizeKey(`${cityKey}_${countryKey}`);
        
        try {
            insertAccommodation.run(
                normalizedKey,
                `${cityName}, ${countryName}`,
                null, // No province/state for international
                countryName,
                'international',
                countryCurrency,
                accommodationRate, accommodationRate, accommodationRate, accommodationRate,
                accommodationRate, accommodationRate, accommodationRate, accommodationRate,
                accommodationRate, accommodationRate, accommodationRate, accommodationRate,
                accommodationRate,
                cityKey === 'capital' || cityName.includes('Capital') ? 1 : 0
            );
            intlCount++;
        } catch (err) {
            console.warn(`   ⚠ Skipping duplicate international: ${normalizedKey}`);
        }
    }
}

accommodationCount += intlCount;
console.log(`   ✓ Inserted ${intlCount} international cities`);
console.log(`   ✓ Total: ${accommodationCount} accommodation limits\n`);

// =============================================================================
// 3. Populate Meal Rates
// =============================================================================
console.log('🍽️ Populating meal rates...');

const insertMeal = db.prepare(`
    INSERT INTO meal_rates (
        region_code, city_key, accommodation_type, duration_tier,
        breakfast, lunch, dinner, total, currency
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// NJC Appendix C - Canadian Meal Rates (effective April 1, 2024)
// Commercial lodging rates at 100%
const canadianMealRates = {
    canada: { breakfast: 23.35, lunch: 24.20, dinner: 56.85, incidentals: 17.30 },
    yukon: { breakfast: 27.90, lunch: 28.55, dinner: 82.15, incidentals: 17.30 },
    nwt: { breakfast: 30.05, lunch: 37.55, dinner: 92.20, incidentals: 17.30 },
    nunavut: { breakfast: 30.60, lunch: 39.25, dinner: 106.15, incidentals: 17.30 }
};

// USA rates
const usaMealRates = {
    usa: { breakfast: 22.60, lunch: 22.85, dinner: 52.50, incidentals: 17.30 },
    alaska: { breakfast: 24.45, lunch: 26.70, dinner: 60.35, incidentals: 17.30 }
};

// Duration tiers with percentages
const durationTiers = [
    { tier: 'day_1_30', percent: 1.0 },
    { tier: 'day_31_120', percent: 0.75 },
    { tier: 'day_121_plus', percent: 0.50 }
];

// Private accommodation rates (lower because breakfast is provided)
const privateRateReduction = { breakfast: 0.0, lunch: 0.80, dinner: 1.0 };

let mealCount = 0;

// Insert Canadian regional meal rates
for (const [regionCode, rates] of Object.entries(canadianMealRates)) {
    for (const { tier, percent } of durationTiers) {
        // Commercial
        const b = +(rates.breakfast * percent).toFixed(2);
        const l = +(rates.lunch * percent).toFixed(2);
        const d = +(rates.dinner * percent).toFixed(2);
        insertMeal.run(regionCode, null, 'commercial', tier, b, l, d, +(b+l+d).toFixed(2), 'CAD');
        mealCount++;
        
        // Private
        const pb = +(rates.breakfast * percent * privateRateReduction.breakfast).toFixed(2);
        const pl = +(rates.lunch * percent * privateRateReduction.lunch).toFixed(2);
        const pd = +(rates.dinner * percent * privateRateReduction.dinner).toFixed(2);
        insertMeal.run(regionCode, null, 'private', tier, pb, pl, pd, +(pb+pl+pd).toFixed(2), 'CAD');
        mealCount++;
    }
}

// Insert USA regional meal rates
for (const [regionCode, rates] of Object.entries(usaMealRates)) {
    for (const { tier, percent } of durationTiers) {
        // Commercial
        const b = +(rates.breakfast * percent).toFixed(2);
        const l = +(rates.lunch * percent).toFixed(2);
        const d = +(rates.dinner * percent).toFixed(2);
        insertMeal.run(regionCode, null, 'commercial', tier, b, l, d, +(b+l+d).toFixed(2), 'USD');
        mealCount++;
        
        // Private
        const pb = +(rates.breakfast * percent * privateRateReduction.breakfast).toFixed(2);
        const pl = +(rates.lunch * percent * privateRateReduction.lunch).toFixed(2);
        const pd = +(rates.dinner * percent * privateRateReduction.dinner).toFixed(2);
        insertMeal.run(regionCode, null, 'private', tier, pb, pl, pd, +(pb+pl+pd).toFixed(2), 'USD');
        mealCount++;
    }
}

console.log(`   ✓ Inserted ${mealCount} regional meal rates`);

// Insert International city-specific meal rates
let intlMealCount = 0;
const mealTierMap = [
    { jsonKey: 'cDay_1_30', tier: 'day_1_30', type: 'commercial' },
    { jsonKey: 'cDay_31_120', tier: 'day_31_120', type: 'commercial' },
    { jsonKey: 'cDay_121_plus', tier: 'day_121_plus', type: 'commercial' },
    { jsonKey: 'pDay_1_30', tier: 'day_1_30', type: 'private' },
    { jsonKey: 'pDay_31_120', tier: 'day_31_120', type: 'private' },
    { jsonKey: 'pDay_121_plus', tier: 'day_121_plus', type: 'private' }
];

for (const [countryKey, countryData] of Object.entries(internationalCountries)) {
    if (!countryData?.cities) continue;
    
    const countryCurrency = countryData.currency || 'USD';
    
    for (const [cityKey, cityData] of Object.entries(countryData.cities)) {
        if (!cityData?.meals) continue;
        
        const normalizedKey = normalizeKey(`${cityKey}_${countryKey}`);
        
        for (const { jsonKey, tier, type } of mealTierMap) {
            const mealData = cityData.meals[jsonKey];
            if (mealData) {
                try {
                    insertMeal.run(
                        'international',
                        normalizedKey,
                        type,
                        tier,
                        mealData.breakfast || 0,
                        mealData.lunch || 0,
                        mealData.dinner || 0,
                        mealData.total || ((mealData.breakfast || 0) + (mealData.lunch || 0) + (mealData.dinner || 0)),
                        countryCurrency
                    );
                    intlMealCount++;
                } catch (e) {
                    // Skip duplicates
                }
            }
        }
    }
}

mealCount += intlMealCount;
console.log(`   ✓ Inserted ${intlMealCount} international meal rates`);
console.log(`   ✓ Total: ${mealCount} meal rates\n`);

// =============================================================================
// 4. Populate Incidental Rates
// =============================================================================
console.log('💼 Populating incidental rates...');

const insertIncidental = db.prepare(`
    INSERT INTO incidental_rates (
        region_code, city_key, accommodation_type, duration_tier,
        rate, rate_type, currency
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
`);

// Canadian incidentals - flat rate
const canadianIncidentalRate = 17.30; // CAD

let incidentalCount = 0;

// Insert for all Canadian regions
for (const regionCode of ['canada', 'yukon', 'nwt', 'nunavut']) {
    for (const { tier, percent } of durationTiers) {
        const rate = +(canadianIncidentalRate * percent).toFixed(2);
        
        insertIncidental.run(regionCode, null, 'commercial', tier, rate, 'fixed', 'CAD');
        insertIncidental.run(regionCode, null, 'private', tier, rate, 'fixed', 'CAD');
        incidentalCount += 2;
    }
}

// USA incidentals
for (const regionCode of ['usa', 'alaska']) {
    for (const { tier, percent } of durationTiers) {
        const rate = +(canadianIncidentalRate * percent).toFixed(2);
        
        insertIncidental.run(regionCode, null, 'commercial', tier, rate, 'fixed', 'USD');
        insertIncidental.run(regionCode, null, 'private', tier, rate, 'fixed', 'USD');
        incidentalCount += 2;
    }
}

console.log(`   ✓ Inserted ${incidentalCount} regional incidental rates`);

// International city-specific incidentals (calculated from dailyTotal - meals - accommodation)
let intlIncidentalCount = 0;

for (const [countryKey, countryData] of Object.entries(internationalCountries)) {
    if (!countryData?.cities) continue;
    
    const countryCurrency = countryData.currency || 'USD';
    
    for (const [cityKey, cityData] of Object.entries(countryData.cities)) {
        if (!cityData?.dailyTotal || !cityData?.meals || !cityData?.accommodation) continue;
        
        const normalizedKey = normalizeKey(`${cityKey}_${countryKey}`);
        
        const incidentalTiers = [
            { jsonKey: 'cDay_1_30', tier: 'day_1_30', type: 'commercial' },
            { jsonKey: 'cDay_31_120', tier: 'day_31_120', type: 'commercial' },
            { jsonKey: 'cDay_121_plus', tier: 'day_121_plus', type: 'commercial' }
        ];
        
        for (const { jsonKey, tier, type } of incidentalTiers) {
            const dailyTotal = cityData.dailyTotal[jsonKey];
            const mealTotal = cityData.meals[jsonKey]?.total;
            const accomRate = cityData.accommodation[jsonKey];
            
            if (dailyTotal && mealTotal && accomRate) {
                // Incidentals = Total Daily - Meals - Accommodation
                const incidentals = +(dailyTotal - mealTotal - accomRate).toFixed(2);
                
                if (incidentals > 0) {
                    try {
                        insertIncidental.run('international', normalizedKey, type, tier, incidentals, 'fixed', countryCurrency);
                        intlIncidentalCount++;
                    } catch (e) {
                        // Skip duplicates
                    }
                }
            }
        }
    }
}

incidentalCount += intlIncidentalCount;
console.log(`   ✓ Inserted ${intlIncidentalCount} international incidental rates`);
console.log(`   ✓ Total: ${incidentalCount} incidental rates\n`);

// =============================================================================
// 5. Populate Private Accommodation Rates
// =============================================================================
console.log('🏠 Populating private accommodation rates...');

const insertPrivateAccom = db.prepare(`
    INSERT INTO private_accommodation_rates (region_code, duration_tier, rate, currency)
    VALUES (?, ?, ?, ?)
`);

// NJC rates: $50 CAD for days 1-120, $25 CAD for day 121+
const privateAccomRates = [
    { tier: 'day_1_120', rate: 50.00 },
    { tier: 'day_121_plus', rate: 25.00 }
];

let privateCount = 0;

for (const regionCode of ['canada', 'yukon', 'nwt', 'nunavut', 'usa', 'alaska', 'international']) {
    const currency = ['usa', 'alaska', 'international'].includes(regionCode) ? 'USD' : 'CAD';
    
    for (const { tier, rate } of privateAccomRates) {
        insertPrivateAccom.run(regionCode, tier, rate, currency);
        privateCount++;
    }
}

console.log(`   ✓ Inserted ${privateCount} private accommodation rates\n`);

// =============================================================================
// 6. Populate Kilometric Rates
// =============================================================================
console.log('🚗 Populating kilometric rates...');

const insertKilometric = db.prepare(`
    INSERT INTO kilometric_rates (province_territory, province_code, rate_per_km, effective_date, notes)
    VALUES (?, ?, ?, ?, ?)
`);

// NJC Appendix B - Kilometric Rates (effective January 1, 2025)
const kilometricRates = [
    { name: 'Alberta', code: 'AB', rate: 0.560 },
    { name: 'British Columbia', code: 'BC', rate: 0.610 },
    { name: 'Manitoba', code: 'MB', rate: 0.575 },
    { name: 'New Brunswick', code: 'NB', rate: 0.595 },
    { name: 'Newfoundland and Labrador', code: 'NL', rate: 0.620 },
    { name: 'Northwest Territories', code: 'NT', rate: 0.720 },
    { name: 'Nova Scotia', code: 'NS', rate: 0.600 },
    { name: 'Nunavut', code: 'NU', rate: 0.720 },
    { name: 'Ontario', code: 'ON', rate: 0.595 },
    { name: 'Prince Edward Island', code: 'PE', rate: 0.590 },
    { name: 'Quebec', code: 'QC', rate: 0.595 },
    { name: 'Saskatchewan', code: 'SK', rate: 0.570 },
    { name: 'Yukon', code: 'YT', rate: 0.720 }
];

for (const rate of kilometricRates) {
    insertKilometric.run(rate.name, rate.code, rate.rate, '2025-01-01', null);
}

console.log(`   ✓ Inserted ${kilometricRates.length} kilometric rates\n`);

// =============================================================================
// 7. Populate Weekend Travel Allowances
// =============================================================================
console.log('📅 Populating weekend travel allowances...');

const insertWeekend = db.prepare(`
    INSERT INTO weekend_travel_allowances (region_code, weekend_length, allowance, currency)
    VALUES (?, ?, ?, ?)
`);

// NJC weekend travel allowances (for assignments > 2 weeks)
const weekendAllowances = [
    { length: 2, allowance: 50.00 },
    { length: 3, allowance: 75.00 },
    { length: 4, allowance: 100.00 }
];

let weekendCount = 0;

for (const regionCode of ['canada', 'yukon', 'nwt', 'nunavut']) {
    for (const { length, allowance } of weekendAllowances) {
        insertWeekend.run(regionCode, length, allowance, 'CAD');
        weekendCount++;
    }
}

console.log(`   ✓ Inserted ${weekendCount} weekend travel allowances\n`);

// =============================================================================
// 8. Insert Metadata
// =============================================================================
console.log('📝 Recording metadata...');

const insertMetadata = db.prepare(`
    INSERT INTO metadata (key, value) VALUES (?, ?)
`);

insertMetadata.run('schema_version', '2.0.0');
insertMetadata.run('migration_date', new Date().toISOString());
insertMetadata.run('njc_directive_version', 'v325');
insertMetadata.run('canadian_rates_effective', '2024-04-01');
insertMetadata.run('kilometric_rates_effective', '2025-01-01');
insertMetadata.run('data_source', 'NJC Travel Directive + ACRD + Appendix D');

console.log('   ✓ Metadata recorded\n');

// =============================================================================
// Summary
// =============================================================================
console.log('═══════════════════════════════════════════════════════════════════');
console.log('                     MIGRATION COMPLETE                             ');
console.log('═══════════════════════════════════════════════════════════════════');
console.log(`  Regions:                 ${regions.length}`);
console.log(`  Accommodation Limits:    ${accommodationCount}`);
console.log(`  Meal Rates:              ${mealCount}`);
console.log(`  Incidental Rates:        ${incidentalCount}`);
console.log(`  Private Accommodation:   ${privateCount}`);
console.log(`  Kilometric Rates:        ${kilometricRates.length}`);
console.log(`  Weekend Allowances:      ${weekendCount}`);
console.log('═══════════════════════════════════════════════════════════════════');

// Quick verification
console.log('\n📊 Quick Verification:');

const sampleCity = db.prepare(`
    SELECT * FROM v_city_travel_rates WHERE city_key = ?
`).get('ottawa');

if (sampleCity) {
    console.log(`\n  Ottawa Sample:`);
    console.log(`    Accommodation: $${sampleCity.accommodation_rate} ${sampleCity.accommodation_currency}`);
    console.log(`    Meals Total:   $${sampleCity.meals_total} ${sampleCity.meals_currency}`);
    console.log(`    Incidentals:   $${sampleCity.incidentals} ${sampleCity.incidentals_currency}`);
} else {
    console.log(`\n  ⚠ Ottawa not found - checking first Canadian city...`);
    const firstCity = db.prepare(`SELECT * FROM accommodation_limits WHERE country = 'Canada' LIMIT 1`).get();
    if (firstCity) {
        console.log(`    First city: ${firstCity.city_name} = $${firstCity.default_rate} ${firstCity.currency}`);
    }
}

// Test international - Riga
const riga = db.prepare(`
    SELECT * FROM accommodation_limits WHERE city_key LIKE '%riga%'
`).get();

if (riga) {
    console.log(`\n  Riga (Latvia) Sample:`);
    console.log(`    Accommodation: €${riga.default_rate} ${riga.currency}`);
    
    // Get meals for Riga
    const rigaMeals = db.prepare(`
        SELECT * FROM meal_rates WHERE city_key LIKE '%riga%' AND duration_tier = 'day_1_30' AND accommodation_type = 'commercial'
    `).get();
    
    if (rigaMeals) {
        console.log(`    Meals Total:   €${rigaMeals.total} ${rigaMeals.currency}`);
        console.log(`      Breakfast: €${rigaMeals.breakfast}`);
        console.log(`      Lunch:     €${rigaMeals.lunch}`);
        console.log(`      Dinner:    €${rigaMeals.dinner}`);
    }
}

// Test Tallinn
const tallinn = db.prepare(`
    SELECT * FROM accommodation_limits WHERE city_key LIKE '%tallinn%'
`).get();

if (tallinn) {
    console.log(`\n  Tallinn (Estonia) Sample:`);
    console.log(`    Accommodation: €${tallinn.default_rate} ${tallinn.currency}`);
}

db.close();
console.log('\n✅ Database closed successfully');
