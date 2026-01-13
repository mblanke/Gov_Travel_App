import sqlite3

conn = sqlite3.connect('data/travel_rates_scraped.sqlite3')
cursor = conn.cursor()

print("=" * 80)
print("COMPLETE COUNTRY AND CURRENCY VERIFICATION")
print("=" * 80)

# Get all countries with their currencies from international source
cursor.execute("""
    SELECT DISTINCT country, currency, COUNT(DISTINCT city) as city_count
    FROM rate_entries
    WHERE source = 'international' AND country IS NOT NULL
    GROUP BY country, currency
    ORDER BY country
""")

international = cursor.fetchall()

print(f"\n{'Country':<35} {'Currency':<10} {'Cities':<10}")
print("-" * 80)

for row in international:
    country = row[0] if row[0] else "N/A"
    currency = row[1] if row[1] else "N/A"
    cities = row[2]
    print(f"{country:<35} {currency:<10} {cities:<10}")

print("-" * 80)
print(f"Total: {len(international)} country-currency combinations")

# Check for any NULL currencies
cursor.execute("""
    SELECT COUNT(*) 
    FROM rate_entries 
    WHERE currency IS NULL
""")
null_count = cursor.fetchone()[0]
print(f"\nEntries with NULL currency: {null_count}")

# Currency summary
print("\n" + "=" * 80)
print("CURRENCY DISTRIBUTION SUMMARY")
print("=" * 80)
cursor.execute("""
    SELECT currency, COUNT(DISTINCT country) as countries, COUNT(*) as entries
    FROM rate_entries
    WHERE source = 'international'
    GROUP BY currency
    ORDER BY countries DESC
""")

print(f"\n{'Currency':<10} {'Countries':<15} {'Total Entries':<15}")
print("-" * 80)
for row in cursor.fetchall():
    print(f"{row[0]:<10} {row[1]:<15} {row[2]:<15}")

# Show sample cities for each currency
print("\n" + "=" * 80)
print("SAMPLE CITIES BY CURRENCY")
print("=" * 80)

for currency in ['EUR', 'USD', 'CAD', 'AUD', 'ARS']:
    cursor.execute("""
        SELECT DISTINCT country, city
        FROM rate_entries
        WHERE currency = ? AND city IS NOT NULL
        LIMIT 3
    """, (currency,))
    
    results = cursor.fetchall()
    if results:
        print(f"\n{currency} Cities:")
        for r in results:
            print(f"  • {r[1]}, {r[0]}")

conn.close()
