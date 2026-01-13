"""Inspect the actual table structure from NJC"""
import sys
sys.path.insert(0, 'src')

from gov_travel.scrapers import SourceConfig, scrape_tables_from_source
import json

# Create a test source config
source = SourceConfig(name="international", url="https://www.njc-cnm.gc.ca/directive/app_d.php?lang=en")

# Get just the first table
print("Fetching tables...")
tables = scrape_tables_from_source(source)

first_table = tables[0]
print(f"\nTable {first_table['table_index']}")
print(f"Title: {first_table['title']}")
print(f"\nFirst data row:")
print(json.dumps(first_table['data'][0], indent=2))

print(f"\nSecond data row:")
print(json.dumps(first_table['data'][1], indent=2))

# Now try Argentina
for table in tables:
    if table['title'] and 'Argentina' in table['title']:
        print(f"\n\n=== Argentina Table ===")
        print(f"Title: {table['title']}")
        print(f"\nFirst row:")
        print(json.dumps(table['data'][0], indent=2))
        break
