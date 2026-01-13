import sqlite3

conn = sqlite3.connect('data/travel_rates_scraped.sqlite3')
cursor = conn.cursor()

print("Argentina entries with breakfast:")
cursor.execute("""
    SELECT country, city, rate_type, rate_amount, currency
    FROM rate_entries
    WHERE country LIKE '%Argentina%' AND rate_type LIKE '%breakfast%'
    LIMIT 5
""")
for row in cursor.fetchall():
    print(f"  {row}")

print("\nAlbania entries with breakfast:")
cursor.execute("""
    SELECT country, city, rate_type, rate_amount, currency
    FROM rate_entries
    WHERE country LIKE '%Albania%' AND rate_type LIKE '%breakfast%'
    LIMIT 5
""")
for row in cursor.fetchall():
    print(f"  {row}")

print("\nAll Argentina city entries:")
cursor.execute("""
    SELECT DISTINCT city, currency
    FROM rate_entries
    WHERE country LIKE '%Argentina%'
""")
for row in cursor.fetchall():
    print(f"  {row[0]}: {row[1]}")

conn.close()
