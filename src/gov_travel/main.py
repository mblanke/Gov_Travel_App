from __future__ import annotations

import argparse
from pathlib import Path

from gov_travel import db
from gov_travel.scrapers import (
    SOURCES,
    extract_acrd_effective_date,
    extract_city_rate_limits,
    extract_rate_entries,
    fetch_html,
    scrape_appendix_d,
    scrape_tables_from_html,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Scrape NJC travel rates into SQLite")
    parser.add_argument(
        "--db",
        type=Path,
        default=Path("data/travel_rates_scraped.sqlite3"),
        help="Path to the SQLite database",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    connection = db.connect(args.db)
    db.init_db(connection)

    for source in SOURCES:
        print(f"Scraping {source.name}: {source.url}")
        db.clear_source(connection, source.name)

        if source.name == "international":
            tables, records, effective_date = scrape_appendix_d(source.url)
            db.insert_raw_tables(connection, source.name, source.url, tables)
            db.insert_appendix_d_rates(connection, records)
            print(f"  {len(records)} Appendix D rate rows (effective {effective_date})")
        elif source.name == "accommodations":
            html = fetch_html(source.url)
            effective_date = extract_acrd_effective_date(html)
            tables = scrape_tables_from_html(html, source.url)
            db.insert_raw_tables(connection, source.name, source.url, tables)
            records = extract_city_rate_limits(tables, effective_date)
            db.insert_city_rate_limits(connection, records)
            print(f"  {len(records)} city rate limits (effective {effective_date})")
        else:
            html = fetch_html(source.url)
            tables = scrape_tables_from_html(html, source.url)
            db.insert_raw_tables(connection, source.name, source.url, tables)
            entries = extract_rate_entries(source, tables)
            db.insert_rate_entries(connection, entries)
            print(f"  {len(entries)} raw rate entries")

    connection.close()


if __name__ == "__main__":
    main()
