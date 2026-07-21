"""Transform scraped NJC/ACRD data into the curated JSON rate files.

Reads the raw scrape database (see main.py) and writes:
  data/accommodationRates.json   city accommodation ceilings (ACRD)
  data/internationalRates.json   Appendix D per-country meal/incidental rates

The curated JSON files are the canonical data layer for the Node app; run
scripts/migrate.js afterwards to rebuild the SQLite API database from them.

Usage:
  python -m gov_travel.transform --db data/travel_rates_scraped.sqlite3 --out data [--dry-run]
"""
from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import date
from pathlib import Path
from typing import Any

from gov_travel.db import connect
from gov_travel.scrapers import slugify

PROVINCE_NAMES = {
    "AB": "Alberta",
    "BC": "British Columbia",
    "MB": "Manitoba",
    "NB": "New Brunswick",
    "NL": "Newfoundland and Labrador",
    "NT": "Northwest Territories",
    "NS": "Nova Scotia",
    "NU": "Nunavut",
    "ON": "Ontario",
    "PE": "Prince Edward Island",
    "QC": "Quebec",
    "SK": "Saskatchewan",
    "YT": "Yukon",
}

TIERS = ["cDay_1_30", "cDay_31_120", "cDay_121_plus", "pDay_1_30", "pDay_31_120", "pDay_121_plus"]

# Hand-curated continental fallbacks, carried over from the previous file version.
ACCOMMODATION_DEFAULTS = {
    "Canada": 110,
    "Europe": 180,
    "Africa": 150,
    "Asia": 150,
    "Middle East": 200,
    "South America": 150,
    "Oceania": 180,
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=Path("data/travel_rates_scraped.sqlite3"))
    parser.add_argument("--out", type=Path, default=Path("data"))
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print a change summary against the existing JSON files without writing",
    )
    return parser.parse_args()


def _unique_key(base: str, suffix: str, taken: set[str]) -> str:
    """Plain slug for the first occurrence; slug_suffix on collision."""
    if base not in taken:
        taken.add(base)
        return base
    key = f"{base}_{suffix}"
    counter = 2
    while key in taken:
        key = f"{base}_{suffix}{counter}"
        counter += 1
    taken.add(key)
    return key


def build_accommodation_rates(connection: sqlite3.Connection) -> dict[str, Any]:
    rows = connection.execute(
        """
        SELECT section, city, city_key, province_state, country, currency,
               monthly_rates_json, effective_date
        FROM city_rate_limits
        ORDER BY section, country, province_state, city
        """
    ).fetchall()
    if not rows:
        raise RuntimeError("city_rate_limits is empty — run the scraper first")

    cities: dict[str, Any] = {}
    international: dict[str, Any] = {}
    taken_cdn: set[str] = set()
    taken_intl: set[str] = set()
    effective = None

    for row in rows:
        monthly = json.loads(row["monthly_rates_json"])
        effective = effective or row["effective_date"]
        if row["section"] == "canadian":
            code = (row["province_state"] or "").upper()
            key = _unique_key(row["city_key"], slugify(code), taken_cdn)
            cities[key] = {
                "name": f"{row['city']}, {code}",
                "province": PROVINCE_NAMES.get(code, code),
                "region": "Canada",
                "monthlyRates": monthly,
                "currency": "CAD",
            }
        elif row["section"] == "us":
            code = (row["province_state"] or "").upper()
            key = _unique_key(row["city_key"], slugify(code), taken_intl)
            international[key] = {
                "name": f"{row['city']}, {code}",
                "country": "USA",
                "region": "United States",
                "monthlyRates": monthly,
                "currency": "USD",
            }
        else:  # foreign
            country = row["country"] or ""
            if row["city"].lower().startswith("other"):
                key = _unique_key(f"{slugify(country)}_other", "x", taken_intl)
                name = f"Other cities, {country}"
            else:
                key = _unique_key(row["city_key"], slugify(country), taken_intl)
                name = f"{row['city']}, {country}"
            international[key] = {
                "name": name,
                "country": country,
                "region": country,
                "monthlyRates": monthly,
                "currency": "USD",
            }

    return {
        "metadata": {
            "effectiveDate": effective,
            "version": "5.0",
            "source": "PWGSC/ACRD City Rate Limits",
            "url": "https://rehelv-acrd.tpsgc-pwgsc.gc.ca/lth-crl-eng.aspx",
            "lastUpdated": date.today().isoformat(),
            "notes": (
                "Maximum allowable accommodation rates scraped from the ACRD page. "
                "Canadian=CAD, US/Foreign=USD. monthlyRates array: [Jan..Dec]."
            ),
        },
        "cities": cities,
        "internationalCities": international,
        "defaults": ACCOMMODATION_DEFAULTS,
    }


def build_international_rates(connection: sqlite3.Connection) -> dict[str, Any]:
    rows = connection.execute(
        """
        SELECT country, country_key, currency, city, city_key, tier,
               breakfast, lunch, dinner, meal_total, incidental, grand_total,
               effective_date
        FROM appendix_d_rates
        ORDER BY country, city, tier
        """
    ).fetchall()
    if not rows:
        raise RuntimeError("appendix_d_rates is empty — run the scraper first")

    countries: dict[str, Any] = {}
    effective = None
    for row in rows:
        effective = effective or row["effective_date"]
        country = countries.setdefault(
            row["country_key"],
            {"name": row["country"], "currency": row["currency"], "cities": {}},
        )
        city_name = row["city"]
        if row["city_key"] in ("other", "othercities", "all", "allislands"):
            city_key = "other"
            city_name = f"Other cities in {row['country']}" if "other" in row["city_key"] else row["city"]
        else:
            city_key = row["city_key"]
        city = country["cities"].setdefault(city_key, {"name": city_name, "meals": {}, "incidentals": {}, "dailyTotal": {}})
        city["meals"][row["tier"]] = {
            "breakfast": row["breakfast"],
            "lunch": row["lunch"],
            "dinner": row["dinner"],
            "total": row["meal_total"],
        }
        city["incidentals"][row["tier"]] = row["incidental"]
        city["dailyTotal"][row["tier"]] = row["grand_total"]

    return {
        "metadata": {
            "effectiveDate": effective,
            "version": "3.0",
            "source": "NJC Travel Directive Appendix D - Module 4",
            "url": "https://www.njc-cnm.gc.ca/directive/app_d/en",
            "lastUpdated": date.today().isoformat(),
            "notes": (
                "International travel allowances in local currency per NJC. "
                "C-Day = Commercial Accommodation, P-Day = Private/Non-commercial. "
                "Tiers: 1-30, 31-120, 121+ days. Null = no published rate "
                "(reasonable and justifiable expenses, receipts required). "
                "Accommodation ceilings for foreign cities live in accommodationRates.json (ACRD)."
            ),
        },
        "countries": countries,
    }


def _summarize_diff(label: str, old_path: Path, new_data: dict[str, Any], key_field: str) -> None:
    new_keys = set(new_data[key_field])
    if old_path.exists():
        old = json.loads(old_path.read_text(encoding="utf-8"))
        old_keys = set(old.get(key_field, {}))
    else:
        old_keys = set()
    added, removed = sorted(new_keys - old_keys), sorted(old_keys - new_keys)
    print(f"{label}: {len(old_keys)} -> {len(new_keys)} entries "
          f"(+{len(added)}, -{len(removed)})")
    if added:
        print(f"  added:   {', '.join(added[:10])}{' ...' if len(added) > 10 else ''}")
    if removed:
        print(f"  removed: {', '.join(removed[:10])}{' ...' if len(removed) > 10 else ''}")


def main() -> None:
    args = parse_args()
    connection = connect(args.db)

    accommodation = build_accommodation_rates(connection)
    international = build_international_rates(connection)
    connection.close()

    acc_path = args.out / "accommodationRates.json"
    intl_path = args.out / "internationalRates.json"

    print(f"ACRD effective: {accommodation['metadata']['effectiveDate']}, "
          f"Appendix D effective: {international['metadata']['effectiveDate']}")
    _summarize_diff("cities (Canadian)", acc_path, accommodation, "cities")
    _summarize_diff("internationalCities", acc_path,
                    {"internationalCities": accommodation["internationalCities"]}, "internationalCities")
    _summarize_diff("countries (Appendix D)", intl_path, international, "countries")

    if args.dry_run:
        print("Dry run — nothing written.")
        return

    for path, data in ((acc_path, accommodation), (intl_path, international)):
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Wrote {path}")


if __name__ == "__main__":
    main()
