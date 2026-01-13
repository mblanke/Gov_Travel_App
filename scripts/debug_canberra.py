import sqlite3

conn = sqlite3.connect('data/travel_rates_scraped.sqlite3')
cursor = conn.cursor()

cursor.execute("""
    SELECT city, currency, rate_type, rate_amount 
    FROM rate_entries 
    WHERE country = 'Australia' AND city LIKE '%Canberra%' 
    ORDER BY city, rate_type
""")

for row in cursor.fetchall():
    print(row)

conn.close()
