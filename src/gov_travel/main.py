from __future__ import annotations

import argparse
import logging
from pathlib import Path

from gov_travel import db
from gov_travel.estimate import EstimateConfig, export_estimate_xlsx
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
        default=Path("data/travel_rates_scraped.sqlite3"),
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
    parser.add_argument(
        "--no-scrape",
        action="store_true",
        help="Skip scraping and only use data already in the database",
    )
    parser.add_argument(
        "--export-estimate-xlsx",
        type=Path,
        help="Optional output path to export a travel estimate workbook",
    )
    parser.add_argument(
        "--estimate-days",
        type=int,
        default=1,
        help="Number of travel days for the estimate",
    )
    parser.add_argument(
        "--estimate-rate-type",
        default="meal",
        help="Rate type filter used to find allowance rates (e.g., meal, breakfast, dinner)",
    )
    parser.add_argument(
        "--estimate-country",
        help="Optional country filter for estimate rate lookup",
    )
    parser.add_argument(
        "--estimate-city",
        help="Optional city filter for estimate rate lookup",
    )
    parser.add_argument(
        "--estimate-province",
        help="Optional province filter for estimate rate lookup",
    )
    parser.add_argument(
        "--estimate-lodging-per-night",
        type=float,
        default=0.0,
        help="Manual lodging cost per night",
    )
    parser.add_argument(
        "--estimate-transport-total",
        type=float,
        default=0.0,
        help="Manual transport total",
    )
    parser.add_argument(
        "--estimate-misc-total",
        type=float,
        default=0.0,
        help="Manual misc total",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    logging.basicConfig(level=getattr(logging, args.log_level))
    logger = logging.getLogger(__name__)
    connection = db.connect(args.db)
    db.init_db(connection)

    if not args.no_scrape:
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

    if args.export_estimate_xlsx:
        estimate_config = EstimateConfig(
            days=args.estimate_days,
            lodging_per_night=args.estimate_lodging_per_night,
            transport_total=args.estimate_transport_total,
            misc_total=args.estimate_misc_total,
            rate_type=args.estimate_rate_type,
            country=args.estimate_country,
            city=args.estimate_city,
            province=args.estimate_province,
        )
        output_path = export_estimate_xlsx(connection, args.export_estimate_xlsx, estimate_config)
        logger.info("Estimate workbook exported to %s", output_path)

    connection.close()


if __name__ == "__main__":
    main()
