from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass
from typing import Any, Iterable

import pandas as pd
import requests
from bs4 import BeautifulSoup

USER_AGENT = "GovTravelScraper/1.0 (+https://example.com)"
REQUEST_DELAY = 2  # seconds between requests to avoid overwhelming server


@dataclass(frozen=True)
class SourceConfig:
    name: str
    url: str
    uses_alphabet_navigation: bool = False


SOURCES = [
    SourceConfig(name="international", url="https://www.njc-cnm.gc.ca/directive/app_d.php?lang=en", uses_alphabet_navigation=True),
    SourceConfig(name="domestic", url="https://www.njc-cnm.gc.ca/directive/d10/v325/s978/en"),
    SourceConfig(name="accommodations", url="https://rehelv-acrd.tpsgc-pwgsc.gc.ca/lth-crl-eng.aspx"),
]


def fetch_html(url: str, retry=3) -> str:
    for attempt in range(retry):
        try:
            response = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=60)
            response.raise_for_status()
            response.encoding = response.apparent_encoding
            time.sleep(REQUEST_DELAY)  # Polite delay between requests
            return response.text
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
            if attempt < retry - 1:
                wait_time = (attempt + 1) * 5  # Exponential backoff: 5s, 10s, 15s
                print(f"    Timeout, retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                raise


def extract_tables(html: str) -> list[pd.DataFrame]:
    return pd.read_html(html)


def _normalize_header(header: str) -> str:
    return re.sub(r"\s+", " ", header.strip().lower())


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
    # Pattern: "Currency: [Name] ([CODE])"
    match = re.search(r"Currency:\s*[^(]+\(([A-Z]{3})\)", title)
    if match:
        return match.group(1)
    return None


def _extract_country_from_title(title: str | None) -> str | None:
    """Extract country name from table title like 'Albania - Currency: Euro (EUR)'"""
    if not title:
        return None
    # Country is before the first " - "
    match = re.match(r"^([^-]+)", title)
    if match:
        return match.group(1).strip()
    return None


def _table_title_map(html: str) -> dict[int, str]:
    soup = BeautifulSoup(html, "html.parser")
    titles: dict[int, str] = {}
    for index, table in enumerate(soup.find_all("table")):
        heading = table.find_previous(["h1", "h2", "h3", "h4", "caption"])
        if heading:
            titles[index] = heading.get_text(strip=True)
    return titles


def _get_alphabet_urls(base_url: str) -> list[str]:
    """Generate URLs for all alphabet letters (A-Z) for paginated sources"""
    import string
    
    # First, fetch the base page to get the drv_id (date revision)
    html = fetch_html(base_url)
    soup = BeautifulSoup(html, "html.parser")
    
    # Find the drv_id from alphabet links
    drv_id = "86"  # Default to current
    for link in soup.find_all('a', href=re.compile(r'let=[A-Z]')):
        href = link.get('href', '')
        match = re.search(r'drv_id=(\d+)', href)
        if match:
            drv_id = match.group(1)
            break
    
    # Generate URLs for each letter
    urls = []
    for letter in string.ascii_uppercase:
        url = f"{base_url}&drv_id={drv_id}&let={letter}"
        urls.append(url)
    
    return urls


def scrape_tables_from_source(source: SourceConfig) -> list[dict[str, Any]]:
    results = []
    table_offset = 0
    
    # For sources with alphabet navigation, fetch all letter pages
    if source.uses_alphabet_navigation:
        urls = _get_alphabet_urls(source.url)
        print(f"  Fetching {len(urls)} alphabet pages...")
    else:
        urls = [source.url]
    
    for url in urls:
        html = fetch_html(url)
        try:
            tables = extract_tables(html)
        except ValueError:
            # No tables on this page (e.g., letters with no countries)
            continue
        
        title_map = _table_title_map(html)
        
        for index, table in enumerate(tables):
            # Flatten MultiIndex columns before converting to JSON
            if isinstance(table.columns, pd.MultiIndex):
                table.columns = [col[1] if col[0] != col[1] else col[0] for col in table.columns]
            
            data = json.loads(table.to_json(orient="records"))
            results.append(
                {
                    "table_index": table_offset + index,
                    "title": title_map.get(index),
                    "data": data,
                }
            )
        
        table_offset += len(tables)
        if len(tables) > 0:
            print(f"    {url.split('let=')[-1] if 'let=' in url else 'base'}: {len(tables)} tables")
    
    return results


def extract_rate_entries(
    source: SourceConfig,
    tables: Iterable[dict[str, Any]],
) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for table in tables:
        # Extract currency and country from table title
        table_currency = _extract_currency_from_title(table.get("title"))
        table_country = _extract_country_from_title(table.get("title"))
        
        # Default to CAD for domestic Canadian sources
        if table_currency is None and source.name in ("domestic", "accommodations"):
            table_currency = "CAD"
        
        for row in table["data"]:
            normalized = {_normalize_header(str(k)): v for k, v in row.items()}
            
            country = normalized.get("country") or normalized.get("country/territory") or table_country
            city = normalized.get("city") or normalized.get("location")
            province = normalized.get("province") or normalized.get("province/territory")
            currency = _detect_currency(normalized.get("currency"), fallback=table_currency)
            effective_date = normalized.get("effective date") or normalized.get("effective")
            
            # Process meal rate columns and other numeric columns
            for key, value in normalized.items():
                if key in {"country", "country/territory", "city", "location", "province", "province/territory", 
                          "currency", "effective", "effective date", "type of accommodation", "accommodation type",
                          "meal total", "grand total", "grand total (taxes included)"}:
                    continue
                amount = _parse_amount(value)
                if amount is None:
                    continue
                # Use table currency (from title) instead of trying to detect from value
                entries.append(
                    {
                        "source": source.name,
                        "source_url": source.url,
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


def extract_exchange_rates(
    source: SourceConfig,
    tables: Iterable[dict[str, Any]],
) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for table in tables:
        for row in table["data"]:
            normalized = {_normalize_header(k): v for k, v in row.items()}
            currency = (
                normalized.get("currency")
                or normalized.get("currency code")
                or normalized.get("code")
            )
            rate = (
                normalized.get("exchange rate")
                or normalized.get("rate")
                or normalized.get("cad rate")
                or normalized.get("rate to cad")
            )
            rate_amount = _parse_amount(rate)
            if not currency or rate_amount is None:
                continue
            entries.append(
                {
                    "source": source.name,
                    "source_url": source.url,
                    "currency": _detect_currency(currency),
                    "rate_to_cad": rate_amount,
                    "effective_date": normalized.get("effective date") or normalized.get("date"),
                    "raw": row,
                }
            )
    return entries


def extract_accommodations(
    source: SourceConfig,
    tables: Iterable[dict[str, Any]],
) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for table in tables:
        for row in table["data"]:
            normalized = {_normalize_header(k): v for k, v in row.items()}
            property_name = (
                normalized.get("property")
                or normalized.get("hotel")
                or normalized.get("accommodation")
                or normalized.get("name")
            )
            if not property_name and not normalized.get("city"):
                continue
            rate_amount = _parse_amount(
                normalized.get("rate")
                or normalized.get("room rate")
                or normalized.get("daily rate")
            )
            currency = _detect_currency(normalized.get("rate"))
            entries.append(
                {
                    "source": source.name,
                    "source_url": source.url,
                    "property_name": property_name,
                    "address": normalized.get("address"),
                    "city": normalized.get("city") or normalized.get("location"),
                    "province": normalized.get("province") or normalized.get("province/territory"),
                    "phone": normalized.get("phone") or normalized.get("telephone"),
                    "rate_amount": rate_amount,
                    "currency": currency,
                    "effective_date": normalized.get("effective date") or normalized.get("effective"),
                    "raw": row,
                }
            )
    return entries