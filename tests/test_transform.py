"""Tests for the scraper extraction and transform helpers.

Guards the two historical failure modes:
  - ACRD month columns never matching (all rate_amount NULL)
  - Appendix D letter pages not being discovered (9-country fragment)
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from gov_travel.scrapers import (  # noqa: E402
    discover_appendix_d_letter_urls,
    extract_appendix_d_rates,
    extract_city_rate_limits,
    extract_effective_date,
    slugify,
)


def test_slugify_strips_accents_and_punctuation():
    assert slugify("Côte d'Ivoire") == "cotedivoire"
    assert slugify("100 Mile House") == "100milehouse"
    assert slugify("St. John's") == "stjohns"


def test_effective_date_parsing():
    html = "<h2>Effective - July  1, 2026</h2>"
    assert extract_effective_date(html) == "2026-07-01"


def test_discover_letter_urls_dedupes_and_builds_absolute():
    html = (
        'a href="app_d/en?drv_id=91&amp;let=A" '
        'a href="app_d/en?drv_id=91&amp;let=A" '
        'a href="app_d/en?drv_id=91&amp;let=B"'
    )
    urls = discover_appendix_d_letter_urls(html)
    assert len(urls) == 2
    assert urls[0].endswith("drv_id=91&let=A")
    assert urls[0].startswith("https://www.njc-cnm.gc.ca/")


def test_extract_city_rate_limits_parses_month_columns():
    tables = [
        {
            "table_index": 0,
            "title": None,
            "data": [
                {
                    "City": "Ottawa",
                    "Province": "ON",
                    "Jan.": 241, "Feb.": 247, "Mar.": 242, "Apr.": 264,
                    "May": 275, "June": 275, "July": 262, "Aug.": 264,
                    "Sept.": 280, "Oct.": 280, "Nov.": 272, "Dec.": 256,
                },
                {
                    "Country": "Belgium",
                    "City": "Brussels",
                    "Jan.": 300, "Feb.": 300, "Mar.": 300, "Apr.": 300,
                    "May": 300, "June": 300, "July": 300, "Aug.": 300,
                    "Sept.": 300, "Oct.": 300, "Nov.": 300, "Dec.": 300,
                },
            ],
        }
    ]
    records = extract_city_rate_limits(tables, "2026-01-01")
    assert len(records) == 2

    ottawa = records[0]
    assert ottawa["section"] == "canadian"
    assert ottawa["currency"] == "CAD"
    assert ottawa["monthly_rates"] == [241, 247, 242, 264, 275, 275, 262, 264, 280, 280, 272, 256]
    assert ottawa["effective_date"] == "2026-01-01"

    brussels = records[1]
    assert brussels["section"] == "foreign"
    assert brussels["currency"] == "USD"
    assert brussels["country"] == "Belgium"


def test_extract_appendix_d_rates_maps_tiers_and_nulls():
    tables = [
        {
            "table_index": 0,
            "title": "Latvia - Currency: Euro (EUR)",
            "data": [
                {
                    "Type of Accom\xadmodation": "C-Day 1-30",
                    "City": "Riga",
                    "Breakfast": 23.85, "Lunch": 41.60, "Dinner": 55.15,
                    "Meal Total": 120.60,
                    "Incidental Amount": 38.59,
                    "Grand Total (Taxes Included)": 159.19,
                },
                {
                    "Type of Accom\xadmodation": "P-Day 121 +",
                    "City": "Riga",
                    "Breakfast": "*", "Lunch": "*", "Dinner": "*",
                    "Meal Total": "*",
                    "Incidental Amount": "25.00\xa0CAD",
                    "Grand Total (Taxes Included)": "*",
                },
            ],
        },
        # Navigation table without a country/currency title must be skipped
        {"table_index": 1, "title": "Table Legend", "data": [{"A": 1}]},
    ]
    records = extract_appendix_d_rates(tables, "2026-07-01")
    assert len(records) == 2

    c_day = records[0]
    assert c_day["country_key"] == "latvia"
    assert c_day["currency"] == "EUR"
    assert c_day["tier"] == "cDay_1_30"
    assert c_day["meal_total"] == 120.60

    p_day = records[1]
    assert p_day["tier"] == "pDay_121_plus"
    assert p_day["breakfast"] is None  # '*' = reasonable expenses
    assert p_day["incidental"] == 25.00
