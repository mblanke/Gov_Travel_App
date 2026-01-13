import sqlite3
import json

conn = sqlite3.connect('data/travel_rates_scraped.sqlite3')

print('\n=== SCRAPED DATABASE ANALYSIS ===\n')

# Tables
print('📊 Tables:')
tables = [row[0] for row in conn.execute('SELECT name FROM sqlite_master WHERE type="table"').fetchall()]
for table in tables:
    count = conn.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0]
    print(f'  - {table}: {count} rows')

# Unique currencies
print('\n💰 Unique Currencies in rate_entries:')
currencies = [row[0] for row in conn.execute('SELECT DISTINCT currency FROM rate_entries WHERE currency IS NOT NULL ORDER BY currency').fetchall()]
print(f'  {", ".join(currencies)}')

# Argentina data
print('\n🇦🇷 Argentina entries:')
for row in conn.execute('SELECT country, city, currency, rate_type, rate_amount FROM rate_entries WHERE country="Argentina" LIMIT 10').fetchall():
    print(f'  {row[0]} - {row[1]} - Currency: {row[2]} - {row[3]}: ${row[4]:.2f}')

# Sample rate entries by country
print('\n🌍 Sample entries by country (first 3 countries):')
for row in conn.execute('SELECT DISTINCT country FROM rate_entries WHERE country IS NOT NULL LIMIT 3').fetchall():
    country = row[0]
    print(f'\n  {country}:')
    for entry in conn.execute('SELECT city, currency, rate_type, rate_amount FROM rate_entries WHERE country=? LIMIT 3', (country,)).fetchall():
        print(f'    {entry[0]} - {entry[1]} - {entry[2]}: ${entry[3]:.2f}')

# Exchange rates
print('\n💱 Exchange rates:')
for row in conn.execute('SELECT currency, rate_to_cad, effective_date FROM exchange_rates WHERE currency IS NOT NULL LIMIT 10').fetchall():
    print(f'  {row[0]}: {row[1]:.4f} CAD (effective: {row[2]})')

# Accommodations
print('\n🏨 Accommodation entries (sample):')
for row in conn.execute('SELECT property_name, city, province, rate_amount, currency FROM accommodations WHERE rate_amount IS NOT NULL LIMIT 10').fetchall():
    print(f'  {row[0]} - {row[1]}, {row[2]} - ${row[3]:.2f} {row[4]}')

conn.close()
print('\n✅ Done!')
