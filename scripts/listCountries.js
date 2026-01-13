const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'travel_rates.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Database connection failed:', err);
        process.exit(1);
    }
});

console.log('\n📊 Countries in Database:\n');
console.log('='.repeat(60));

const query = `
    SELECT 
        country,
        COUNT(*) as city_count,
        region,
        currency
    FROM accommodation_rates
    GROUP BY country
    ORDER BY country
`;

db.all(query, [], (err, rows) => {
    if (err) {
        console.error('❌ Query failed:', err);
        db.close();
        process.exit(1);
    }

    rows.forEach((row, index) => {
        console.log(`\n${index + 1}. ${row.country}`);
        console.log(`   Region: ${row.region}`);
        console.log(`   Currency: ${row.currency}`);
        console.log(`   Cities: ${row.city_count}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log(`\n📍 Total Countries: ${rows.length}`);
    console.log(`📍 Total Cities: ${rows.reduce((sum, r) => sum + r.city_count, 0)}\n`);

    db.close();
});
