"""Debug the scraper to see what currencies are being assigned"""
import sys
sys.path.insert(0, 'src')

from gov_travel.scrapers import SourceConfig, scrape_tables_from_source, extract_rate_entries

# Test international source with Argentina
source = SourceConfig(name="international", url="https://www.njc-cnm.gc.ca/directive/app_d.php?lang=en")

print("Fetching tables...")
tables = scrape_tables_from_source(source)

# Find Argentina table
argentina_table = None
for table in tables:
    if table['title'] and 'Argentina' in table['title']:
        argentina_table = table
        break

if argentina_table:
    print(f"\nArgentina Table:")
    print(f"  Title: {argentina_table['title']}")
    print(f"  Rows: {len(argentina_table['data'])}")
    
    # Extract entries
    entries = extract_rate_entries(source, [argentina_table])
    print(f"\n  Generated {len(entries)} entries")
    
    if entries:
        # Show first few entries
        print(f"\n  First 3 entries:")
        for i, entry in enumerate(entries[:3]):
            print(f"    {i+1}. City: {entry['city']}, Type: {entry['rate_type']}, Amount: {entry['rate_amount']}, Currency: {entry['currency']}")
        
        # Check unique currencies
        currencies = set(e['currency'] for e in entries)
        print(f"\n  Unique currencies in Argentina entries: {currencies}")
