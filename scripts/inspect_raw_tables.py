import sqlite3
import json

conn = sqlite3.connect('data/travel_rates_scraped.sqlite3')

print('\n=== RAW TABLE INSPECTION ===\n')

# Check first few raw tables
for row in conn.execute('SELECT source, source_url, table_index, title, data_json FROM raw_tables LIMIT 5').fetchall():
    print(f'\nSource: {row[0]}')
    print(f'URL: {row[1]}')
    print(f'Table Index: {row[2]}')
    print(f'Title: {row[3]}')
    
    data = json.loads(row[4])
    print(f'Columns: {list(data[0].keys()) if data else "No data"}')
    print(f'First row sample: {data[0] if data else "No data"}')
    print('-' * 80)

# Check specific Argentina table
print('\n\n=== ARGENTINA RAW DATA ===\n')
for row in conn.execute('SELECT source, title, data_json FROM raw_tables WHERE data_json LIKE "%Argentina%"').fetchone() or []:
    print(f'Source: {row[0]}')
    print(f'Title: {row[1]}')
    data = json.loads(row[2])
    if data:
        # Find Argentina entry
        for entry in data:
            if 'Argentina' in str(entry.values()):
                print(f'\nArgentina entry columns: {entry.keys()}')
                print(f'Argentina entry data: {entry}')
                break
    break

conn.close()
