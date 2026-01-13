import sqlite3

conn = sqlite3.connect('data/travel_rates_scraped.sqlite3')
cursor = conn.cursor()

print("Sample Table Titles:")
cursor.execute('SELECT table_index, title FROM raw_tables LIMIT 10')
for row in cursor.fetchall():
    print(f"{row[0]}: {row[1]}")

print("\nArgentina Tables:")
cursor.execute("SELECT table_index, title FROM raw_tables WHERE title LIKE '%Argentina%'")
for row in cursor.fetchall():
    print(f"{row[0]}: {row[1]}")

conn.close()
