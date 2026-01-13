import sqlite3

conn = sqlite3.connect('data/travel_rates_scraped.sqlite3')
cursor = conn.cursor()

# Count countries
cursor.execute('SELECT COUNT(DISTINCT country) FROM rate_entries WHERE source="international" AND country IS NOT NULL')
total_countries = cursor.fetchone()[0]

# Count total entries
cursor.execute('SELECT COUNT(*) FROM rate_entries WHERE source="international"')
total_entries = cursor.fetchone()[0]

# Count unique currencies
cursor.execute('SELECT COUNT(DISTINCT currency) FROM rate_entries WHERE source="international"')
total_currencies = cursor.fetchone()[0]

print(f"✅ COMPLETE SCRAPER RESULTS:")
print(f"   Total Countries: {total_countries}")
print(f"   Total Entries: {total_entries:,}")
print(f"   Unique Currencies: {total_currencies}")

# Show currency breakdown
cursor.execute("""
    SELECT currency, COUNT(DISTINCT country) as country_count, COUNT(*) as entries
    FROM rate_entries 
    WHERE source="international"
    GROUP BY currency
    ORDER BY country_count DESC
    LIMIT 20
""")

print(f"\nTop 20 Currencies:")
for row in cursor.fetchall():
    print(f"   {row[0]:5} - {row[1]:3} countries, {row[2]:,} entries")

conn.close()
