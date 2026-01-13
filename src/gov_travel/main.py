from __future__ import annotations

import argparse
import logging
from pathlib import Path

from gov_travel import db
from gov_travel.scrapers import (
    SOURCES,
    build_session,
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
    parser.add_argument(
        "--sources",
        nargs="*",
        choices=[source.name for source in SOURCES],
        default=[source.name for source in SOURCES],
        help="Limit scraping to specific sources",
    )
    parser.add_argument(
        "--pause",
        type=float,
        default=0.0,
        help="Pause (seconds) between table processing",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Logging level",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    logging.basicConfig(level=getattr(logging, args.log_level))
    logger = logging.getLogger(__name__)
    connection = db.connect(args.db)
    db.init_db(connection)

    session = build_session()
    selected = {name for name in args.sources}
    for source in SOURCES:
        if source.name not in selected:
            continue
        logger.info("Scraping %s (%s)", source.name, source.url)
        tables = scrape_tables_from_source(source, session=session, pause_seconds=args.pause)
        logger.info("Found %s tables for %s", len(tables), source.name)
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
