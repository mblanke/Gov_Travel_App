import sqlite3

conn = sqlite3.connect('data/travel_rates_scraped.sqlite3')
cur = conn.cursor()

cur.execute('SELECT COUNT(*) FROM rate_entries')
print('Per-diem entries:', cur.fetchone()[0])

cur.execute('SELECT COUNT(*) FROM accommodations')
print('Accommodation entries:', cur.fetchone()[0])

cur.execute('SELECT COUNT(DISTINCT country) FROM rate_entries WHERE source="international"')
print('Countries with per-diem:', cur.fetchone()[0])

cur.execute('SELECT COUNT(DISTINCT city) FROM accommodations')
print('Canadian cities with accommodation listings:', cur.fetchone()[0])

conn.close()
