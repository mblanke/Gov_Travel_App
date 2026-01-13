import sqlite3

conn = sqlite3.connect('data/travel_rates_scraped.sqlite3')
cursor = conn.cursor()

print("All sources and their currency distributions:")
cursor.execute("""
    SELECT source, currency, COUNT(*) as count
    FROM rate_entries
    GROUP BY source, currency
    ORDER BY source, currency
""")
for row in cursor.fetchall():
    print(f"  {row[0]} / {row[1]}: {row[2]}")

print("\nInternational source countries:")
cursor.execute("""
    SELECT DISTINCT country
    FROM rate_entries
    WHERE source = 'international'
    ORDER BY country
    LIMIT 20
""")
for row in cursor.fetchall():
    print(f"  {row[0]}")

conn.close()
