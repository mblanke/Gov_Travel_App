from __future__ import annotations

import argparse
import time
from pathlib import Path

from gov_travel import db
from gov_travel.scrapers import (
    SOURCES,
    extract_accommodations,
    extract_exchange_rates,
    extract_rate_entries,
    scrape_tables_from_source,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Scrape travel rates into SQLite")
    parser.add_argument(
        "--db",
        type=Path,
        default=Path("data/travel_rates.sqlite3"),
        help="Path to the SQLite database",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    start_time = time.time()
    
    print("=" * 80)
    print("🌐 Government Travel Rate Scraper")
    print("=" * 80)
    print(f"📁 Database: {args.db}")
    print()
    
    connection = db.connect(args.db)
    db.init_db(connection)

    total_tables = 0
    total_rate_entries = 0
    total_accommodations = 0
    
    for idx, source in enumerate(SOURCES, 1):
        source_start = time.time()
        print(f"[{idx}/{len(SOURCES)}] 📥 Scraping: {source.name.upper()}")
        print(f"    🔗 {source.url}")
        
        tables = scrape_tables_from_source(source)
        db.insert_raw_tables(connection, source.name, source.url, tables)
        total_tables += len(tables)
        print(f"    ✓ {len(tables)} tables collected")

        rate_entries = extract_rate_entries(source, tables)
        db.insert_rate_entries(connection, rate_entries)
        total_rate_entries += len(rate_entries)
        if rate_entries:
            print(f"    ✓ {len(rate_entries)} per-diem entries extracted")

        exchange_rates = extract_exchange_rates(source, tables)
        db.insert_exchange_rates(connection, exchange_rates)
        if exchange_rates:
            print(f"    ✓ {len(exchange_rates)} exchange rates extracted")

        if source.name == "accommodations":
            accommodations = extract_accommodations(source, tables)
            db.insert_accommodations(connection, accommodations)
            total_accommodations = len(accommodations)
            print(f"    ✓ {len(accommodations)} accommodation listings extracted")
        
        elapsed = time.time() - source_start
        print(f"    ⏱️  Completed in {elapsed:.1f}s")
        print()

    connection.close()
    
    total_time = time.time() - start_time
    print("=" * 80)
    print("✅ SCRAPING COMPLETE")
    print("=" * 80)
    print(f"📊 Summary:")
    print(f"   • Total tables:          {total_tables:,}")
    print(f"   • Per-diem entries:      {total_rate_entries:,}")
    print(f"   • Accommodation listings: {total_accommodations:,}")
    print(f"   • Total time:            {total_time:.1f}s")
    print(f"   • Database:              {args.db}")
    print("=" * 80)


if __name__ == "__main__":
    main()