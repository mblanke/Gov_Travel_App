import json
import os
import sqlite3
from pathlib import Path

import pytest

from gov_travel.scrapers import _extract_country_from_title, _normalize_header

DEFAULT_DB = Path(__file__).resolve().parent.parent / "data" / "travel_rates_scraped.sqlite3"
DB_PATH = Path(os.environ.get("GOV_TRAVEL_DB", DEFAULT_DB))


@pytest.fixture(scope="module")
def conn():
    if not DB_PATH.exists():
        pytest.skip(
            f"Scraped DB not found at {DB_PATH}. Run `python -m gov_travel.main --db {DB_PATH}` first."
        )
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    yield connection
    connection.close()


def _norm(value):
    return value.strip().lower() if isinstance(value, str) else value


@pytest.mark.accommodations
def test_accommodations_cover_all_raw_cities(conn):
    cursor = conn.execute("SELECT data_json FROM raw_tables WHERE source = 'accommodations'")
    expected_cities = set()
    for (data_json,) in cursor.fetchall():
        rows = json.loads(data_json)
        for row in rows:
            normalized = {_normalize_header(k): v for k, v in row.items()}
            city = normalized.get("city") or normalized.get("location")
            if city:
                expected_cities.add(_norm(city))

    actual_cities = {
        _norm(city)
        for (city,) in conn.execute(
            "SELECT DISTINCT city FROM accommodations WHERE city IS NOT NULL"
        )
    }

    missing = sorted(expected_cities - actual_cities)
    assert not missing, f"Missing accommodations entries for {len(missing)} cities (e.g., {missing[:5]})"


@pytest.mark.per_diem
def test_per_diem_covers_all_countries(conn):
    cursor = conn.execute(
        "SELECT title FROM raw_tables WHERE source = 'international' AND title IS NOT NULL"
    )
    expected_countries = set()
    for (title,) in cursor.fetchall():
        country = _extract_country_from_title(title)
        if country:
            expected_countries.add(_norm(country))

    actual_countries = {
        _norm(country)
        for (country,) in conn.execute(
            "SELECT DISTINCT country FROM rate_entries WHERE source = 'international' AND country IS NOT NULL"
        )
    }

    missing = sorted(expected_countries - actual_countries)
    assert not missing, f"Countries missing per-diem entries: {missing}"


@pytest.mark.per_diem
def test_per_diem_has_meal_types(conn):
    meal_types = {"breakfast", "lunch", "dinner", "incidental amount"}
    cursor = conn.execute(
        "SELECT DISTINCT country FROM rate_entries WHERE source = 'international' AND country IS NOT NULL"
    )

    missing_countries = []
    for (country,) in cursor.fetchall():
        rate_types = {
            _norm(rate_type)
            for (rate_type,) in conn.execute(
                "SELECT DISTINCT rate_type FROM rate_entries WHERE source = 'international' AND country = ?",
                (country,),
            )
            if rate_type
        }
        if not rate_types.intersection(meal_types):
            missing_countries.append(country)

    assert not missing_countries, f"Countries without meal-type entries: {missing_countries}"
