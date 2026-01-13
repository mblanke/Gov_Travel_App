import sqlite3

conn = sqlite3.connect('data/travel_rates_scraped.sqlite3')
cursor = conn.cursor()

print("Argentina entries by source:")
cursor.execute("""
    SELECT source, COUNT(*) as count, currency
    FROM rate_entries
    WHERE country LIKE '%Argentina%'
    GROUP BY source, currency
""")
for row in cursor.fetchall():
    print(f"  {row[0]}: {row[1]} entries with currency {row[2]}")

print("\nAll Argentina entries with details:")
cursor.execute("""
    SELECT source, country, city, rate_type, currency
    FROM rate_entries
    WHERE country LIKE '%Argentina%'
    LIMIT 10
""")
for row in cursor.fetchall():
    print(f"  {row}")

conn.close()
