"""Test currency extraction step by step"""
import sqlite3
import re

def _extract_currency_from_title(title):
    """Extract currency code from table title like 'Albania - Currency: Euro (EUR)'"""
    if not title:
        return None
    # Pattern: "Currency: [Name] ([CODE])"
    match = re.search(r"Currency:\s*[^(]+\(([A-Z]{3})\)", title)
    if match:
        return match.group(1)
    return None

conn = sqlite3.connect('data/travel_rates_scraped.sqlite3')
cursor = conn.cursor()

print("Testing currency extraction from stored titles:\n")

# Get Argentina table title
cursor.execute("""
    SELECT title 
    FROM raw_tables
    WHERE title LIKE '%Argentina%'
""")
row = cursor.fetchone()
if row:
    title = row[0]
    print(f"Argentina Title: {title}")
    currency = _extract_currency_from_title(title)
    print(f"Extracted Currency: {currency}")

# Get Albania table title
cursor.execute("""
    SELECT title 
    FROM raw_tables
    WHERE title LIKE '%Albania%'
""")
row = cursor.fetchone()
if row:
    title = row[0]
    print(f"\nAlbania Title: {title}")
    currency = _extract_currency_from_title(title)
    print(f"Extracted Currency: {currency}")

# Check what entries we actually have
cursor.execute("""
    SELECT COUNT(*)
    FROM rate_entries
    WHERE currency IS NOT NULL
""")
print(f"\nTotal entries with currency: {cursor.fetchone()[0]}")

cursor.execute("""
    SELECT COUNT(*)
    FROM rate_entries
    WHERE currency IS NULL
""")
print(f"Total entries WITHOUT currency: {cursor.fetchone()[0]}")

conn.close()
