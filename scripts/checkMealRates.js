const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'travel_rates.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Database connection failed:', err);
        process.exit(1);
    }
});

console.log('\n🍽️  Checking Meal Rates Table...\n');
console.log('='.repeat(60));

// Check if meal_rates table exists
const checkTableQuery = `
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='meal_rates'
`;

db.get(checkTableQuery, [], (err, row) => {
    if (err) {
        console.error('❌ Query failed:', err);
        db.close();
        process.exit(1);
    }

    if (!row) {
        console.log('\n❌ meal_rates table does NOT exist in database\n');
        console.log('The database migration only created accommodation_rates table.');
        console.log('Meal rates need to be added separately.\n');
        db.close();
        return;
    }

    console.log('✅ meal_rates table EXISTS\n');

    // Count records
    const countQuery = 'SELECT COUNT(*) as count FROM meal_rates';
    
    db.get(countQuery, [], (err, countRow) => {
        if (err) {
            console.error('❌ Count query failed:', err);
            db.close();
            process.exit(1);
        }

        console.log(`📊 Total meal rate records: ${countRow.count}\n`);

        if (countRow.count === 0) {
            console.log('⚠️  Table exists but is EMPTY - no meal rates imported\n');
            db.close();
            return;
        }

        // Show sample records
        const sampleQuery = `
            SELECT city_name, country, breakfast, lunch, dinner, incidentals, total_daily
            FROM meal_rates
            LIMIT 10
        `;

        db.all(sampleQuery, [], (err, rows) => {
            if (err) {
                console.error('❌ Sample query failed:', err);
                db.close();
                process.exit(1);
            }

            console.log('Sample meal rates:\n');
            rows.forEach((row, index) => {
                console.log(`${index + 1}. ${row.city_name}, ${row.country}`);
                console.log(`   Breakfast: $${row.breakfast}`);
                console.log(`   Lunch: $${row.lunch}`);
                console.log(`   Dinner: $${row.dinner}`);
                console.log(`   Incidentals: $${row.incidentals}`);
                console.log(`   Total Daily: $${row.total_daily}\n`);
            });

            db.close();
        });
    });
});

console.log('='.repeat(60) + '\n');
