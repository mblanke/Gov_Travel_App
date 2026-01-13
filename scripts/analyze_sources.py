import sqlite3

conn = sqlite3.connect('data/travel_rates_scraped.sqlite3')
cursor = conn.cursor()

print("Tables by source:\n")
cursor.execute("""
    SELECT source, COUNT(*) as count
    FROM raw_tables
    GROUP BY source
""")
for row in cursor.fetchall():
    print(f"  {row[0]}: {row[1]} tables")

print("\nRate entries by source:\n")
cursor.execute("""
    SELECT source, COUNT(*) as count, 
           SUM(CASE WHEN currency IS NULL THEN 1 ELSE 0 END) as null_count,
           SUM(CASE WHEN currency IS NOT NULL THEN 1 ELSE 0 END) as has_currency_count
    FROM rate_entries
    GROUP BY source
""")
for row in cursor.fetchall():
    print(f"  {row[0]}: {row[1]} total | {row[2]} NULL | {row[3]} with currency")

print("\nSample titles by source:\n")
for source in ['international', 'domestic', 'accommodations']:
    cursor.execute(f"""
        SELECT title
        FROM raw_tables
        WHERE source = '{source}'
        LIMIT 3
    """)
    print(f"\n{source}:")
    for row in cursor.fetchall():
        title = row[0] if row[0] else "NO TITLE"
        print(f"    {title[:80]}")

conn.close()
