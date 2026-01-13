from __future__ import annotations

import argparse
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
    connection = db.connect(args.db)
    db.init_db(connection)

    for source in SOURCES:
        tables = scrape_tables_from_source(source)
        db.insert_raw_tables(connection, source.name, source.url, tables)

        rate_entries = extract_rate_entries(source, tables)
        db.insert_rate_entries(connection, rate_entries)

        exchange_rates = extract_exchange_rates(source, tables)
        db.insert_exchange_rates(connection, exchange_rates)

        if source.name == "accommodations":
            accommodations = extract_accommodations(source, tables)
            db.insert_accommodations(connection, accommodations)

    connection.close()


if __name__ == "__main__":
    main()