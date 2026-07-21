from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass
from io import StringIO
from typing import Any, Iterable

import pandas as pd
import requests
from bs4 import BeautifulSoup

USER_AGENT = "GovTravelScraper/2.0 (+https://example.com)"

NJC_BASE = "https://www.njc-cnm.gc.ca"


@dataclass(frozen=True)
class SourceConfig:
    name: str
    url: str


SOURCES = [
    # Appendix D index page. Countries are paginated by letter (?let=A..Z) with a
    # drv_id that changes each directive version, so letter URLs are discovered
    # at runtime from this page rather than hardcoded.
    SourceConfig(name="international", url=f"{NJC_BASE}/directive/app_d.php?lang=en"),
    # Appendix C, unversioned URL (the old versioned /d10/v325/... links rot when
    # NJC publishes a new directive version). Raw reference capture only — the
    # curated Appendix C values in data/perDiemRates.json are hand-authored.
    SourceConfig(name="domestic", url=f"{NJC_BASE}/directive/travel-voyage/td-dv-a3-eng.php"),
    # PWGSC/ACRD city rate limits (accommodation ceilings). One page, all tables.
    SourceConfig(name="accommodations", url="https://rehelv-acrd.tpsgc-pwgsc.gc.ca/lth-crl-eng.aspx"),
]

MONTH_COLUMNS = [
    "jan", "feb", "mar", "apr", "may", "june", "july", "aug", "sept", "oct", "nov", "dec",
]

MONTH_NAMES = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
}

TIER_LABELS = {
    "c-day 1-30": "cDay_1_30",
    "c-day 31-120": "cDay_31_120",
    "c-day 121 +": "cDay_121_plus",
    "c-day 121+": "cDay_121_plus",
    "p-day 1-30": "pDay_1_30",
    "p-day 31-120": "pDay_31_120",
    "p-day 121 +": "pDay_121_plus",
    "p-day 121+": "pDay_121_plus",
}


def fetch_html(url: str) -> str:
    response = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=60)
    response.raise_for_status()
    response.encoding = response.apparent_encoding
    return response.text


def extract_tables(html: str) -> list[pd.DataFrame]:
    try:
        return pd.read_html(StringIO(html))
    except ValueError:
        # pandas raises "No tables found" on table-less pages (e.g. Appendix D
        # letters with no countries)
        return []


def _normalize_header(header: str) -> str:
    # \xad is the soft hyphen NJC uses in "Accom­modation"
    return re.sub(r"\s+", " ", header.replace("\xad", "").strip().lower())


def slugify(text: str) -> str:
    """Normalize a city/country name to a stable lookup key: 'Côte d'Ivoire' -> 'cotedivoire'."""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]", "", text.lower())


def _parse_amount(value: Any) -> float | None:
    if value is None:
        return None
    text = str(value)
    match = re.search(r"-?\d+(?:[\.,]\d+)?", text)
    if not match:
        return None
    amount_text = match.group(0).replace(",", "")
    try:
        return float(amount_text)
    except ValueError:
        return None


def _detect_currency(value: Any, fallback: str | None = None) -> str | None:
    if value is None:
        return fallback
    text = str(value).upper()
    if "CAD" in text:
        return "CAD"
    if "USD" in text:
        return "USD"
    match = re.search(r"\b[A-Z]{3}\b", text)
    if match:
        return match.group(0)
    return fallback


def _extract_currency_from_title(title: str | None) -> str | None:
    """Extract currency code from table title like 'Albania - Currency: Euro (EUR)'"""
    if not title:
        return None
    match = re.search(r"Currency:\s*[^(]+\(([A-Z]{3})\)", title)
    if match:
        return match.group(1)
    return None


def _extract_country_from_title(title: str | None) -> str | None:
    """Extract country name from table title like 'Albania - Currency: Euro (EUR)'"""
    if not title:
        return None
    match = re.match(r"^([^-]+)", title)
    if match:
        return match.group(1).strip()
    return None


def extract_effective_date(html: str) -> str | None:
    """Find 'Effective - July 1, 2026' style text and return ISO '2026-07-01'."""
    match = re.search(
        r"Effective\s*[-–—:]?\s*([A-Z][a-z]+)\s+(\d{1,2}),?\s+(\d{4})",
        re.sub(r"<[^>]+>", " ", html),
    )
    if not match:
        return None
    month = MONTH_NAMES.get(match.group(1).lower())
    if not month:
        return None
    return f"{match.group(3)}-{month:02d}-{int(match.group(2)):02d}"


def _table_title_map(html: str) -> dict[int, str]:
    soup = BeautifulSoup(html, "html.parser")
    titles: dict[int, str] = {}
    for index, table in enumerate(soup.find_all("table")):
        heading = table.find_previous(["h1", "h2", "h3", "h4", "caption"])
        if heading:
            titles[index] = heading.get_text(strip=True)
    return titles


def scrape_tables_from_html(html: str, source_url: str) -> list[dict[str, Any]]:
    tables = extract_tables(html)
    title_map = _table_title_map(html)
    results = []
    for index, table in enumerate(tables):
        # Flatten MultiIndex columns before converting to JSON
        if isinstance(table.columns, pd.MultiIndex):
            table.columns = [col[1] if col[0] != col[1] else col[0] for col in table.columns]

        data = json.loads(table.to_json(orient="records"))
        results.append(
            {
                "table_index": index,
                "title": title_map.get(index),
                "source_url": source_url,
                "data": data,
            }
        )
    return results


def scrape_tables_from_source(source: SourceConfig) -> list[dict[str, Any]]:
    html = fetch_html(source.url)
    return scrape_tables_from_html(html, source.url)


# ---------------------------------------------------------------------------
# Appendix D (international per diems) — structured extraction
# ---------------------------------------------------------------------------

def discover_appendix_d_letter_urls(index_html: str) -> list[str]:
    """Find the per-letter country pages (app_d/en?drv_id=NN&let=X) on the index page."""
    links = re.findall(r"app_d/en\?drv_id=(\d+)&(?:amp;)?let=([A-Z])", index_html)
    seen: set[str] = set()
    urls: list[str] = []
    for drv_id, letter in links:
        key = f"{drv_id}:{letter}"
        if key in seen:
            continue
        seen.add(key)
        urls.append(f"{NJC_BASE}/directive/app_d/en?drv_id={drv_id}&let={letter}")
    return urls


def extract_appendix_d_rates(
    tables: Iterable[dict[str, Any]],
    effective_date: str | None,
) -> list[dict[str, Any]]:
    """Turn Appendix D country tables into one record per (country, city, tier).

    Table rows look like:
        Type of Accommodation | City | Breakfast | Lunch | Dinner | Meal Total |
        Incidental Amount | Grand Total (Taxes Included)
    with the country and its currency in the preceding <h3> heading.
    Asterisk cells ('*' = reasonable and justifiable expenses) become None.
    """
    records: list[dict[str, Any]] = []
    for table in tables:
        title = table.get("title")
        currency = _extract_currency_from_title(title)
        country = _extract_country_from_title(title)
        if not country or not currency:
            continue  # legend/navigation tables
        for row in table["data"]:
            normalized = {_normalize_header(str(k)): v for k, v in row.items()}
            tier_raw = str(normalized.get("type of accommodation") or "").strip().lower()
            tier = TIER_LABELS.get(_normalize_header(tier_raw))
            if not tier:
                continue
            city = str(normalized.get("city") or "").strip()
            records.append(
                {
                    "country": country,
                    "country_key": slugify(country),
                    "currency": currency,
                    "city": city or "All",
                    "city_key": slugify(city) or "all",
                    "tier": tier,
                    "breakfast": _parse_amount(normalized.get("breakfast")),
                    "lunch": _parse_amount(normalized.get("lunch")),
                    "dinner": _parse_amount(normalized.get("dinner")),
                    "meal_total": _parse_amount(normalized.get("meal total")),
                    "incidental": _parse_amount(normalized.get("incidental amount")),
                    "grand_total": _parse_amount(normalized.get("grand total (taxes included)")),
                    "effective_date": effective_date,
                }
            )
    return records


def scrape_appendix_d(index_url: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]], str | None]:
    """Scrape all Appendix D letter pages.

    Returns (raw_tables, structured_rate_records, effective_date).
    """
    index_html = fetch_html(index_url)
    letter_urls = discover_appendix_d_letter_urls(index_html)
    if not letter_urls:
        raise RuntimeError(
            f"No Appendix D letter links found on {index_url} — page layout may have changed"
        )
    all_tables: list[dict[str, Any]] = []
    all_records: list[dict[str, Any]] = []
    effective_date: str | None = None
    for url in letter_urls:
        html = fetch_html(url)
        if effective_date is None:
            effective_date = extract_effective_date(html)
        tables = scrape_tables_from_html(html, url)
        all_tables.extend(tables)
        all_records.extend(extract_appendix_d_rates(tables, effective_date))
    return all_tables, all_records, effective_date


# ---------------------------------------------------------------------------
# ACRD city rate limits (accommodation ceilings) — structured extraction
# ---------------------------------------------------------------------------

def _month_values(normalized: dict[str, Any]) -> list[float | None] | None:
    """Pull the 12 monthly rate columns (Jan. .. Dec.) from a normalized row."""
    values: list[float | None] = []
    for month in MONTH_COLUMNS:
        # Headers appear as 'jan.', 'feb.', ... 'may', 'june', 'july'
        cell = None
        for key, value in normalized.items():
            if key.rstrip(".") == month:
                cell = value
                break
        if cell is None:
            return None
        values.append(_parse_amount(cell))
    return values


def extract_city_rate_limits(
    tables: Iterable[dict[str, Any]],
    effective_date: str | None,
) -> list[dict[str, Any]]:
    """Extract city accommodation ceilings from the ACRD page.

    The page has three sections distinguishable by column signature:
      City | Province | Jan..Dec  -> Canadian cities, CAD
      City | State    | Jan..Dec  -> US cities, USD
      Country | City  | Jan..Dec  -> foreign cities, USD
    """
    records: list[dict[str, Any]] = []
    for table in tables:
        for row in table["data"]:
            normalized = {_normalize_header(str(k)): v for k, v in row.items()}
            months = _month_values(normalized)
            if months is None or all(v is None for v in months):
                continue
            city = normalized.get("city")
            if city is None:
                continue
            city = str(city).strip()
            if "province" in normalized:
                section, currency = "canadian", "CAD"
                province_state, country = str(normalized["province"]).strip(), "Canada"
            elif "state" in normalized:
                section, currency = "us", "USD"
                province_state, country = str(normalized["state"]).strip(), "USA"
            elif "country" in normalized:
                section, currency = "foreign", "USD"
                province_state, country = None, str(normalized["country"]).strip()
            else:
                continue
            records.append(
                {
                    "section": section,
                    "city": city,
                    "city_key": slugify(city),
                    "province_state": province_state,
                    "country": country,
                    "currency": currency,
                    "monthly_rates": months,
                    "effective_date": effective_date,
                }
            )
    return records


def extract_acrd_effective_date(html: str) -> str | None:
    """The ACRD page labels its sections e.g. '2026 Canadian City Rate Limits'."""
    match = re.search(r"(\d{4})\s+Canadian City Rate Limits", html)
    if match:
        return f"{match.group(1)}-01-01"
    return extract_effective_date(html)


# ---------------------------------------------------------------------------
# Legacy generic extractors (raw reference capture)
# ---------------------------------------------------------------------------

def extract_rate_entries(
    source: SourceConfig,
    tables: Iterable[dict[str, Any]],
) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for table in tables:
        table_currency = _extract_currency_from_title(table.get("title"))
        table_country = _extract_country_from_title(table.get("title"))

        if table_currency is None and source.name in ("domestic", "accommodations"):
            table_currency = "CAD"

        for row in table["data"]:
            normalized = {_normalize_header(str(k)): v for k, v in row.items()}

            country = normalized.get("country") or normalized.get("country/territory") or table_country
            city = normalized.get("city") or normalized.get("location")
            province = normalized.get("province") or normalized.get("province/territory")
            currency = _detect_currency(normalized.get("currency"), fallback=table_currency)
            effective_date = normalized.get("effective date") or normalized.get("effective")

            for key, value in normalized.items():
                if key in {"country", "country/territory", "city", "location", "province", "province/territory",
                          "currency", "effective", "effective date", "type of accommodation", "accommodation type",
                          "meal total", "grand total", "grand total (taxes included)"}:
                    continue
                amount = _parse_amount(value)
                if amount is None:
                    continue
                entries.append(
                    {
                        "source": source.name,
                        "source_url": table.get("source_url", source.url),
                        "country": country,
                        "city": city,
                        "province": province,
                        "currency": currency,
                        "rate_type": key,
                        "rate_amount": amount,
                        "unit": None,
                        "effective_date": effective_date,
                        "raw": row,
                    }
                )
    return entries
