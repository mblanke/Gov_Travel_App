"""Test the scraper extract_rate_entries function with debug output"""
import sys
sys.path.insert(0, 'src')

from gov_travel.scrapers import SourceConfig, scrape_tables_from_source, extract_rate_entries

# Create a test source config
source = SourceConfig(name="international", url="https://www.njc-cnm.gc.ca/directive/app_d.php?lang=en")

# Get just the first few tables
print("Fetching tables...")
tables = scrape_tables_from_source(source)
print(f"Got {len(tables)} tables")

# Check first table
first_table = tables[0]
print(f"\nFirst table:")
print(f"  Index: {first_table['table_index']}")
print(f"  Title: {first_table['title']}")
print(f"  Data rows: {len(first_table['data'])}")

# Extract rate entries from just first table
print("\nExtracting rate entries from first table...")
entries = extract_rate_entries(source, [first_table])
print(f"Got {len(entries)} entries")

if entries:
    print(f"\nFirst entry:")
    print(f"  Country: {entries[0]['country']}")
    print(f"  City: {entries[0]['city']}")
    print(f"  Currency: {entries[0]['currency']}")
    print(f"  Rate Type: {entries[0]['rate_type']}")
    print(f"  Rate Amount: {entries[0]['rate_amount']}")
