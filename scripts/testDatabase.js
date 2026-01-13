const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'travel_rates.db');

console.log('🔍 Testing Database...\n');
console.log(`📁 Database path: ${dbPath}\n`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Failed to open database:', err);
        process.exit(1);
    }
});

// Test 1: Check if Canberra exists
db.get('SELECT * FROM accommodation_rates WHERE city_key = ?', ['canberra'], (err, row) => {
    if (err) {
        console.error('❌ Query failed:', err);
    } else if (row) {
        console.log('✅ CANBERRA FOUND!');
        console.log('   City:', row.city_name);
        console.log('   Country:', row.country);
        console.log('   Region:', row.region);
        console.log('   Jan Rate:', `$${row.jan_rate} ${row.currency}`);
        console.log('   Standard Rate:', `$${row.standard_rate} ${row.currency}`);
        console.log('   International:', row.is_international ? 'Yes' : 'No');
    } else {
        console.log('❌ CANBERRA NOT FOUND IN DATABASE!');
    }
});

// Test 2: Count total cities
db.get('SELECT COUNT(*) as count FROM accommodation_rates', [], (err, row) => {
    if (err) {
        console.error('❌ Count query failed:', err);
    } else {
        console.log(`\n📊 Total cities in database: ${row.count}`);
    }
});

// Test 3: List all Australian cities
db.all('SELECT city_key, city_name, standard_rate FROM accommodation_rates WHERE country = ?', ['Australia'], (err, rows) => {
    if (err) {
        console.error('❌ Australia query failed:', err);
    } else {
        console.log('\n🇦🇺 Australian cities:');
        if (rows.length === 0) {
            console.log('   ❌ No Australian cities found!');
        } else {
            rows.forEach(row => {
                console.log(`   - ${row.city_name}: $${row.standard_rate} USD`);
            });
        }
    }
    
    // Close database
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('\n✅ Test complete!');
        }
    });
});
