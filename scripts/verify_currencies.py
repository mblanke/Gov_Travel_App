import sqlite3
import sys

db_path = "data/travel_rates_scraped.sqlite3"

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Count total entries
    cursor.execute("SELECT COUNT(*) FROM rate_entries")
    total = cursor.fetchone()[0]
    print(f"Total rate entries: {total}")
    
    # Count entries with currency
    cursor.execute("SELECT COUNT(*) FROM rate_entries WHERE currency IS NOT NULL")
    with_currency = cursor.fetchone()[0]
    print(f"Entries with currency: {with_currency}")
    print(f"Missing currency: {total - with_currency}")
    
    # Currency distribution
    print("\nCurrency Distribution:")
    cursor.execute("""
        SELECT currency, COUNT(*) as count 
        FROM rate_entries 
        GROUP BY currency 
        ORDER BY count DESC
    """)
    for row in cursor.fetchall():
        currency = row[0] if row[0] else "NULL"
        print(f"  {currency}: {row[1]}")
    
    # Sample entries with currency
    print("\nSample Entries (Argentina ARS):")
    cursor.execute("""
        SELECT country, city, rate_type, rate_amount, currency
        FROM rate_entries
        WHERE country LIKE '%Argentina%'
        LIMIT 5
    """)
    for row in cursor.fetchall():
        print(f"  {row[0]} | {row[1]} | {row[2]}: ${row[3]} {row[4]}")
    
    print("\nSample Entries (Albania EUR):")
    cursor.execute("""
        SELECT country, city, rate_type, rate_amount, currency
        FROM rate_entries
        WHERE country LIKE '%Albania%'
        LIMIT 5
    """)
    for row in cursor.fetchall():
        print(f"  {row[0]} | {row[1]} | {row[2]}: ${row[3]} {row[4]}")
    
    conn.close()
    
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
