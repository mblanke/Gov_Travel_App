import sqlite3

conn = sqlite3.connect('data/travel_rates_scraped.sqlite3')
cursor = conn.cursor()

# Get a raw table with title
cursor.execute("""
    SELECT title, data 
    FROM raw_tables 
    WHERE title LIKE '%Argentina%'
    LIMIT 1
""")
row = cursor.fetchone()
print(f"Title: {row[0]}")
print(f"Data length: {len(row[1])} chars")

# Now check the actual rate_entries for Argentina
cursor.execute("""
    SELECT country, city, rate_type, currency, rate_amount
    FROM rate_entries
    WHERE country LIKE '%Argentina%'
    LIMIT 3
""")
print("\nRate Entries:")
for r in cursor.fetchall():
    print(f"  {r}")

conn.close()
