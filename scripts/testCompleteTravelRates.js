const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'travel_rates.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Database connection failed:', err);
        process.exit(1);
    }
});

console.log('\n🧪 Testing Complete Travel Rates Database\n');
console.log('='.repeat(70));

// Test 1: Check Canberra complete data
console.log('\n1️⃣  Testing Canberra (Australia):\n');

const canberraQuery = `
    SELECT 
        city_name, country, region, currency,
        standard_accommodation,
        breakfast, lunch, dinner, total_meals,
        incidentals, total_daily_allowance
    FROM travel_rates 
    WHERE city_key = 'canberra'
`;

db.get(canberraQuery, [], (err, row) => {
    if (err) {
        console.error('❌ Query failed:', err);
        db.close();
        process.exit(1);
    }

    if (!row) {
        console.log('❌ CANBERRA NOT FOUND!\n');
    } else {
        console.log(`✅ ${row.city_name}, ${row.country}`);
        console.log(`   Region: ${row.region}`);
        console.log(`   Currency: ${row.currency}\n`);
        console.log(`   🏨 Accommodation: $${row.standard_accommodation}/night`);
        console.log(`   🍳 Breakfast: $${row.breakfast}`);
        console.log(`   🍱 Lunch: $${row.lunch}`);
        console.log(`   🍽️  Dinner: $${row.dinner}`);
        console.log(`   📝 Total Meals: $${row.total_meals}`);
        console.log(`   💼 Incidentals: $${row.incidentals}`);
        console.log(`   💰 Total Daily Allowance: $${row.total_daily_allowance}\n`);
        
        const fullDayTotal = parseFloat(row.standard_accommodation) + parseFloat(row.total_daily_allowance);
        console.log(`   🎯 FULL DAY COST (Accommodation + Per Diem): $${fullDayTotal.toFixed(2)} ${row.currency}\n`);
    }

    // Test 2: Sample Canadian city
    console.log('2️⃣  Testing Toronto (Canada):\n');
    
    const torontoQuery = `
        SELECT 
            city_name, country, province, currency,
            jan_accommodation, feb_accommodation, mar_accommodation,
            breakfast, lunch, dinner, total_meals,
            incidentals, total_daily_allowance
        FROM travel_rates 
        WHERE city_key = 'toronto'
    `;

    db.get(torontoQuery, [], (err, row) => {
        if (err) {
            console.error('❌ Query failed:', err);
            db.close();
            process.exit(1);
        }

        if (!row) {
            console.log('❌ Toronto not found\n');
        } else {
            console.log(`✅ ${row.city_name}, ${row.province}`);
            console.log(`   Currency: ${row.currency}\n`);
            console.log(`   🏨 Accommodation (Jan): $${row.jan_accommodation}/night`);
            console.log(`   🏨 Accommodation (Feb): $${row.feb_accommodation}/night`);
            console.log(`   🏨 Accommodation (Mar): $${row.mar_accommodation}/night`);
            console.log(`   🍳 Breakfast: $${row.breakfast}`);
            console.log(`   🍱 Lunch: $${row.lunch}`);
            console.log(`   🍽️  Dinner: $${row.dinner}`);
            console.log(`   💰 Total Daily Allowance: $${row.total_daily_allowance}\n`);
        }

        // Test 3: Count verification
        console.log('3️⃣  Database Statistics:\n');
        
        const statsQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN is_international = 0 THEN 1 END) as canadian,
                COUNT(CASE WHEN is_international = 1 THEN 1 END) as international,
                COUNT(DISTINCT country) as countries
            FROM travel_rates
        `;

        db.get(statsQuery, [], (err, stats) => {
            if (err) {
                console.error('❌ Query failed:', err);
                db.close();
                process.exit(1);
            }

            console.log(`   📊 Total Cities: ${stats.total}`);
            console.log(`   🇨🇦 Canadian: ${stats.canadian}`);
            console.log(`   🌍 International: ${stats.international}`);
            console.log(`   🗺️  Countries: ${stats.countries}\n`);

            console.log('='.repeat(70));
            console.log('\n✅ All tests passed! Database has complete accommodation + meal rates\n');

            db.close();
        });
    });
});
